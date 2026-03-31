#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseSelectFields(sql) {
  const normalized = sql.replace(/\s+/g, ' ').trim();
  const match = normalized.match(/select\s+(.+?)\s+from\s+/i);
  if (!match) return [];

  return match[1]
    .split(',')
    .map((f) => f.trim())
    .map((f) => {
      const aliasMatch = f.match(/\s+as\s+([a-zA-Z_][a-zA-Z0-9_]*)$/i);
      if (aliasMatch) {
        return aliasMatch[1].trim();
      }

      const noAlias = f.replace(/\s+as\s+.+$/i, '');
      const dotParts = noAlias.split('.');
      return dotParts[dotParts.length - 1].replace(/[`"']/g, '').trim();
    })
    .filter(Boolean);
}

function extractViewName(sql) {
  const normalized = sql.replace(/\s+/g, ' ').trim();
  const match = normalized.match(/from\s+([a-zA-Z0-9_\.]+)/i);
  if (!match) return null;
  return match[1].split('.').pop();
}

function findNodeValue(node) {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return findNodeValue(node[0]);
  if (typeof node === 'object' && '_' in node) return String(node._);
  return '';
}

function getFieldNames(root) {
  const fieldNodes = root && root.field ? root.field : [];
  return fieldNodes
    .map((f) => (f.$ && f.$.name ? f.$.name : null))
    .filter(Boolean);
}

function getParameterNames(root) {
  const parameterNodes = root && root.parameter ? root.parameter : [];
  return parameterNodes
    .map((p) => (p.$ && p.$.name ? p.$.name : null))
    .filter(Boolean);
}

function getVariableNames(root) {
  const variableNodes = root && root.variable ? root.variable : [];
  return variableNodes
    .map((v) => (v.$ && v.$.name ? v.$.name : null))
    .filter(Boolean);
}

function getGroupNames(root) {
  const groupNodes = root && root.group ? root.group : [];
  return groupNodes
    .map((g) => (g.$ && g.$.name ? g.$.name : null))
    .filter(Boolean);
}

function collectNodesByKey(root, keyName) {
  const found = [];
  const queue = [root];

  while (queue.length > 0) {
    const node = queue.shift();
    if (!node || typeof node !== 'object') continue;

    if (Object.prototype.hasOwnProperty.call(node, keyName)) {
      const nodes = Array.isArray(node[keyName]) ? node[keyName] : [node[keyName]];
      found.push(...nodes);
    }

    for (const key in node) {
      if (key === '$') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item && typeof item === 'object') queue.push(item);
        });
      } else if (value && typeof value === 'object') {
        queue.push(value);
      }
    }
  }

  return found;
}

function getSubDatasetNames(root) {
  const subDatasets = collectNodesByKey(root, 'subDataset');
  return subDatasets
    .map((n) => (n.$ && n.$.name ? n.$.name : null))
    .filter(Boolean);
}

function getDatasetRunBindings(root) {
  const datasetRuns = collectNodesByKey(root, 'datasetRun');
  return datasetRuns
    .map((n) => (n.$ && n.$.subDataset ? n.$.subDataset : n.$ && n.$.subDatasetName ? n.$.subDatasetName : null))
    .filter(Boolean);
}

function hasNodeKey(root, keyName) {
  return collectNodesByKey(root, keyName).length > 0;
}

function getQueryString(root) {
  const queryNode = root && root.queryString ? root.queryString[0] : null;
  return findNodeValue(queryNode);
}

function getAllExpressions(root) {
  const expressions = [];
  const queue = [root];
  
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node || typeof node !== 'object') continue;
    
    // Collect textFieldExpression nodes
    if (node.textFieldExpression && Array.isArray(node.textFieldExpression)) {
      node.textFieldExpression.forEach((expr) => {
        expressions.push(findNodeValue(expr));
      });
    }
    
    // Traverse all properties
    for (const key in node) {
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (typeof item === 'object' && item !== null) {
            queue.push(item);
          }
        });
      } else if (typeof value === 'object' && value !== null && key !== '$') {
        queue.push(value);
      }
    }
  }
  
  return expressions;
}

async function checkModelContamination(targetJrxmlPath, modelJrxmlPath) {
  const contaminations = [];
  
  // Parse target JRXML
  const targetXml = fs.readFileSync(targetJrxmlPath, 'utf8');
  const parser = new xml2js.Parser({ explicitArray: true, trim: true });
  const targetParsed = await parser.parseStringPromise(targetXml);
  const targetRoot = targetParsed.jasperReport;
  
  // Parse model JRXML
  const modelXml = fs.readFileSync(modelJrxmlPath, 'utf8');
  const modelParsed = await parser.parseStringPromise(modelXml);
  const modelRoot = modelParsed.jasperReport;
  
  const targetQuery = getQueryString(targetRoot);
  const modelQuery = getQueryString(modelRoot);
  
  // Check 1: Query inheritance
  if (modelQuery && modelQuery.trim() && targetQuery === modelQuery) {
    contaminations.push({
      type: 'queryString',
      severity: 'CRITICAL',
      message: 'Target JRXML inherited query from model - data contamination detected'
    });
  }
  
  // Check 2: Field inheritance (exact match of field names)
  const targetFields = new Set(getFieldNames(targetRoot));
  const modelFields = new Set(getFieldNames(modelRoot));
  
  if (modelFields.size > 0 && targetFields.size > 0) {
    const identicalFields = Array.from(modelFields).filter((f) => targetFields.has(f));
    if (identicalFields.length === modelFields.size && modelFields.size === targetFields.size) {
      contaminations.push({
        type: 'fields',
        severity: 'HIGH',
        message: `Target JRXML inherited all fields from model (${Array.from(modelFields).join(', ')})`
      });
    }
  }
  
  // Check 3: Parameter inheritance
  const targetParams = new Set(getParameterNames(targetRoot));
  const modelParams = new Set(getParameterNames(modelRoot));
  
  if (modelParams.size > 0) {
    const inheritedParams = Array.from(modelParams).filter((p) => targetParams.has(p));
    if (inheritedParams.length > 0) {
      contaminations.push({
        type: 'parameters',
        severity: 'HIGH',
        message: `Target JRXML inherited ${inheritedParams.length} parameters from model: ${inheritedParams.join(', ')}`
      });
    }
  }

  // Check 3.5: Variable inheritance
  const targetVars = new Set(getVariableNames(targetRoot));
  const modelVars = new Set(getVariableNames(modelRoot));
  if (modelVars.size > 0) {
    const inheritedVars = Array.from(modelVars).filter((v) => targetVars.has(v));
    if (inheritedVars.length > 0) {
      contaminations.push({
        type: 'variables',
        severity: 'HIGH',
        message: `Target JRXML inherited ${inheritedVars.length} variables from model: ${inheritedVars.join(', ')}`
      });
    }
  }

  // Check 3.6: Group inheritance
  const targetGroups = new Set(getGroupNames(targetRoot));
  const modelGroups = new Set(getGroupNames(modelRoot));
  if (modelGroups.size > 0) {
    const inheritedGroups = Array.from(modelGroups).filter((g) => targetGroups.has(g));
    if (inheritedGroups.length > 0) {
      contaminations.push({
        type: 'groups',
        severity: 'HIGH',
        message: `Target JRXML inherited ${inheritedGroups.length} groups from model: ${inheritedGroups.join(', ')}`
      });
    }
  }

  // Check 3.7: SubDataset / DatasetRun inheritance (Phase 5)
  const targetSubDatasets = new Set(getSubDatasetNames(targetRoot));
  const modelSubDatasets = new Set(getSubDatasetNames(modelRoot));
  if (modelSubDatasets.size > 0 && targetSubDatasets.size > 0) {
    const inheritedSubDatasets = Array.from(modelSubDatasets).filter((s) => targetSubDatasets.has(s));
    if (inheritedSubDatasets.length > 0) {
      contaminations.push({
        type: 'subDatasets',
        severity: 'CRITICAL',
        message: `Target JRXML inherited subDatasets from model: ${inheritedSubDatasets.join(', ')}`
      });
    }
  }

  const targetDatasetRuns = getDatasetRunBindings(targetRoot);
  const modelDatasetRuns = getDatasetRunBindings(modelRoot);
  if (modelDatasetRuns.length > 0 && targetDatasetRuns.length > 0) {
    const inheritedRuns = modelDatasetRuns.filter((name) => targetDatasetRuns.includes(name));
    if (inheritedRuns.length > 0) {
      contaminations.push({
        type: 'datasetRun',
        severity: 'CRITICAL',
        message: `Target JRXML inherited datasetRun bindings from model: ${Array.from(new Set(inheritedRuns)).join(', ')}`
      });
    }
  }

  // Check 3.8: Chart/Crosstab dataset binding inheritance (Phase 5)
  if (hasNodeKey(modelRoot, 'chartDataset') && hasNodeKey(targetRoot, 'chartDataset')) {
    contaminations.push({
      type: 'chartDataset',
      severity: 'CRITICAL',
      message: 'Target JRXML contains chartDataset bindings while model also contains chartDataset. Validate chart datasets are independently defined.'
    });
  }

  if (hasNodeKey(modelRoot, 'crosstabDataset') && hasNodeKey(targetRoot, 'crosstabDataset')) {
    contaminations.push({
      type: 'crosstabDataset',
      severity: 'CRITICAL',
      message: 'Target JRXML contains crosstabDataset bindings while model also contains crosstabDataset. Validate crosstab datasets are independently defined.'
    });
  }
  
  // Check 4: Identical expressions
  const targetExpressions = new Set(getAllExpressions(targetRoot));
  const modelExpressions = getAllExpressions(modelRoot);
  
  const identicalExpressions = modelExpressions.filter((expr) => expr && targetExpressions.has(expr) && expr.includes('$F{'));
  if (identicalExpressions.length > 0) {
    contaminations.push({
      type: 'expressions',
      severity: 'CRITICAL',
      message: `Target JRXML inherited ${identicalExpressions.length} field expressions from model`
    });
  }
  
  return contaminations;
}

function normalizeSqlType(sqlType) {
  if (!sqlType) return '';
  return String(sqlType).toUpperCase().replace(/\(.+\)/, '').trim();
}

function expectedJavaClassesBySqlType(sqlType) {
  const t = normalizeSqlType(sqlType);

  if (/CHAR|TEXT|VARCHAR/.test(t)) return ['java.lang.String'];
  if (/^INT$|INTEGER|SMALLINT/.test(t)) return ['java.lang.Integer', 'java.lang.Long'];
  if (/BIGINT/.test(t)) return ['java.lang.Long', 'java.math.BigDecimal'];
  if (/NUMERIC|DECIMAL/.test(t)) return ['java.math.BigDecimal', 'java.lang.Double'];
  if (/DATE/.test(t) && !/TIMESTAMP/.test(t)) return ['java.sql.Date', 'java.util.Date'];
  if (/TIMESTAMP/.test(t)) return ['java.sql.Timestamp', 'java.util.Date'];
  if (/TIME/.test(t) && !/TIMESTAMP/.test(t)) return ['java.sql.Time', 'java.util.Date'];
  if (/BOOL/.test(t)) return ['java.lang.Boolean'];

  return [];
}

async function runValidation(jrxmlPath, rulesPath) {
  const errors = [];
  const warnings = [];
  const resolvedJrxmlPath = path.resolve(jrxmlPath);

  if (!fs.existsSync(resolvedJrxmlPath)) {
    throw new Error(`JRXML not found: ${resolvedJrxmlPath}`);
  }

  const xmlContent = fs.readFileSync(resolvedJrxmlPath, 'utf8');
  const parser = new xml2js.Parser({ explicitArray: true, trim: true });
  const parsed = await parser.parseStringPromise(xmlContent);

  const root = parsed.jasperReport;
  if (!root) {
    errors.push('Root node <jasperReport> not found.');
  }

  const reportName = root && root.$ && root.$.name ? root.$.name : path.basename(resolvedJrxmlPath, '.jrxml');

  const queryNode = root && root.queryString ? root.queryString[0] : null;
  const sql = findNodeValue(queryNode);

  if (!sql || !sql.trim()) {
    errors.push('queryString is empty.');
  }

  if (/select\s+\*/i.test(sql)) {
    errors.push('Query uses SELECT *. Use explicit fields.');
  }

  if (!/where\s+1\s*=\s*1/i.test(sql)) {
    warnings.push('Query does not contain WHERE 1=1.');
  }

  const parameterNodes = root && root.parameter ? root.parameter : [];
  const params = parameterNodes
    .map((p) => (p.$ && p.$.name ? p.$.name : null))
    .filter(Boolean);

  const referencedParams = Array.from(sql.matchAll(/\$P\{([a-zA-Z0-9_]+)\}/g)).map((m) => m[1]);
  referencedParams.forEach((p) => {
    if (!params.includes(p)) {
      errors.push(`Parameter referenced in SQL but not declared: ${p}`);
    }
  });

  const bands = ['title', 'columnHeader', 'detail', 'pageFooter'];
  let foundBands = 0;
  bands.forEach((band) => {
    if (root && root[band] && root[band].length > 0) foundBands += 1;
  });

  if (foundBands < 4) {
    warnings.push(`Expected 4 bands (title, columnHeader, detail, pageFooter). Found: ${foundBands}.`);
  }

  const fieldNodes = root && root.field ? root.field : [];
  const fieldNames = fieldNodes
    .map((f) => (f.$ && f.$.name ? f.$.name : null))
    .filter(Boolean);
  const fieldClassByName = new Map();
  fieldNodes.forEach((f) => {
    const name = f.$ && f.$.name ? f.$.name : null;
    const klass = f.$ && f.$.class ? f.$.class : null;
    if (name) {
      fieldClassByName.set(name, klass);
      if (!klass) {
        errors.push(`Field declared without class: ${name}`);
      }
    }
  });

  const selectFields = parseSelectFields(sql);
  selectFields.forEach((f) => {
    if (!fieldNames.includes(f)) {
      warnings.push(`Field in SELECT not declared in <field>: ${f}`);
    }
  });

  if (rulesPath) {
    const resolvedRulesPath = path.resolve(rulesPath);
    if (!fs.existsSync(resolvedRulesPath)) {
      warnings.push(`rules file not found: ${resolvedRulesPath}`);
    } else {
      const rules = readJson(resolvedRulesPath);
      const viewName = extractViewName(sql);
      const viewDef = rules.views && viewName ? rules.views[viewName] : null;

      if (!viewDef) {
        errors.push(`View not found in rules/views.json: ${viewName || '(unable to parse FROM)'}`);
      } else {
        const validFields = new Set((viewDef.validFields || []).map((f) => f.name));
        const validFieldMap = new Map((viewDef.validFields || []).map((f) => [f.name, f]));
        selectFields.forEach((f) => {
          if (!validFields.has(f)) {
            errors.push(`Field not allowed for view ${viewName}: ${f}`);
          }
        });

        // Validate SQL type (rules) against JRXML field Java class to prevent runtime fill errors.
        selectFields.forEach((f) => {
          const fieldDef = validFieldMap.get(f);
          const declaredClass = fieldClassByName.get(f);
          if (!fieldDef || !declaredClass) return;

          const acceptedClasses = expectedJavaClassesBySqlType(fieldDef.type);
          if (acceptedClasses.length > 0 && !acceptedClasses.includes(declaredClass)) {
            errors.push(
              `Field type mismatch for '${f}': rules type '${fieldDef.type}' expects ${acceptedClasses.join(' or ')}, but JRXML declares ${declaredClass}.`
            );
          }
        });
      }
    }
  }

  return {
    ok: errors.length === 0,
    reportName,
    paramsCount: params.length,
    foundBands,
    errors,
    warnings
  };
}

function printResult(result) {
  if (result.ok) {
    console.log(`OK XML well-formed (report: ${result.reportName})`);
    console.log(`OK ${result.paramsCount} parameters found`);
    console.log(`OK ${result.foundBands}/4 key bands found`);
    if (result.warnings.length) {
      result.warnings.forEach((w) => console.log(`WARN ${w}`));
    }
    console.log('OK VALIDATION SUCCESS');
  } else {
    result.errors.forEach((e) => console.error(`ERROR ${e}`));
    result.warnings.forEach((w) => console.error(`WARN ${w}`));
    console.error('ERROR VALIDATION FAILED');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const jrxmlPath = args[0];

  let rulesPath = path.resolve(__dirname, '..', 'rules', 'views.json');
  let modelJrxmlPath = null;

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--check-model-contamination') {
      modelJrxmlPath = args[i + 1] || null;
      i += 1;
      continue;
    }
    if (!arg.startsWith('--')) {
      rulesPath = path.resolve(arg);
    }
  }

  if (!jrxmlPath) {
    console.error('Usage: node validate.js <report.jrxml> [rules/views.json] [--check-model-contamination <model.jrxml>]');
    process.exit(1);
  }

  try {
    // Run standard validation
    const result = await runValidation(jrxmlPath, rulesPath);
    printResult(result);

    // If contamination check requested, perform it
    if (modelJrxmlPath) {
      if (!fs.existsSync(modelJrxmlPath)) {
        console.error(`ERROR Model JRXML not found: ${modelJrxmlPath}`);
        process.exit(1);
      }

      console.log('');
      console.log('🔍 Checking for semantic data contamination...');
      const contaminations = await checkModelContamination(jrxmlPath, modelJrxmlPath);

      if (contaminations.length === 0) {
        console.log('✅ OK: No semantic data contamination detected');
        process.exit(result.ok ? 0 : 2);
      } else {
        console.error('❌ ERROR: Semantic data contamination detected!');
        contaminations.forEach((c) => {
          const icon = c.severity === 'CRITICAL' ? '🔴' : '🟠';
          console.error(`${icon} [${c.severity}] ${c.type}: ${c.message}`);
        });
        console.error('');
        console.error('Do not reuse data semantics from modelo. Target JRXML must have independent data.');
        process.exit(1);
      }
    }

    process.exit(result.ok ? 0 : 2);
  } catch (err) {
    console.error(`ERROR ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runValidation, checkModelContamination };
