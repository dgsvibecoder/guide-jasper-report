#!/usr/bin/env node

require("dotenv").config({ path: __dirname + "/.env" });

const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseSelectFields(sql) {
  const normalized = sql.replace(/\s+/g, " ").trim();
  const match = normalized.match(/select\s+(.+?)\s+from\s+/i);
  if (!match) return [];

  return match[1]
    .split(",")
    .map((f) => f.trim())
    .map((f) => {
      const aliasMatch = f.match(/\s+as\s+([a-zA-Z_][a-zA-Z0-9_]*)$/i);
      if (aliasMatch) {
        return aliasMatch[1].trim();
      }

      const noAlias = f.replace(/\s+as\s+.+$/i, "");
      const dotParts = noAlias.split(".");
      return dotParts[dotParts.length - 1].replace(/[`"']/g, "").trim();
    })
    .filter(Boolean);
}

function extractViewName(sql) {
  const normalized = sql.replace(/\s+/g, " ").trim();
  const match = normalized.match(/from\s+([a-zA-Z0-9_\.]+)/i);
  if (!match) return null;
  return match[1].split(".").pop();
}

function findNodeValue(node) {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return findNodeValue(node[0]);
  if (typeof node === "object" && "_" in node) return String(node._);
  return "";
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
    if (!node || typeof node !== "object") continue;

    if (Object.prototype.hasOwnProperty.call(node, keyName)) {
      const nodes = Array.isArray(node[keyName])
        ? node[keyName]
        : [node[keyName]];
      found.push(...nodes);
    }

    for (const key in node) {
      if (key === "$") continue;
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item && typeof item === "object") queue.push(item);
        });
      } else if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }

  return found;
}

function getSubDatasetNames(root) {
  const subDatasets = collectNodesByKey(root, "subDataset");
  return subDatasets
    .map((n) => (n.$ && n.$.name ? n.$.name : null))
    .filter(Boolean);
}

function getDatasetRunBindings(root) {
  const datasetRuns = collectNodesByKey(root, "datasetRun");
  return datasetRuns
    .map((n) =>
      n.$ && n.$.subDataset
        ? n.$.subDataset
        : n.$ && n.$.subDatasetName
          ? n.$.subDatasetName
          : null,
    )
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
    if (!node || typeof node !== "object") continue;

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
          if (typeof item === "object" && item !== null) {
            queue.push(item);
          }
        });
      } else if (typeof value === "object" && value !== null && key !== "$") {
        queue.push(value);
      }
    }
  }

  return expressions;
}

// ─── Subreport helpers (Fase 3) ─────────────────────────────────────────────

function getSubreports(root) {
  return collectNodesByKey(root, "subreport");
}

function getSubreportExpressions(root) {
  const subreports = getSubreports(root);
  return subreports.map((sr) => {
    if (sr.subreportExpression && sr.subreportExpression.length > 0) {
      return findNodeValue(sr.subreportExpression[0]);
    }
    return null;
  });
}

function getSubreportParameterBindings(root) {
  const subreports = getSubreports(root);
  const bindings = [];
  subreports.forEach((sr) => {
    const paramNodes = sr.subreportParameter || [];
    paramNodes.forEach((sp) => {
      const name = sp.$ && sp.$.name ? sp.$.name : null;
      const exprNode = sp.subreportParameterExpression
        ? sp.subreportParameterExpression[0]
        : null;
      const valueExpression = exprNode ? findNodeValue(exprNode) : "";
      if (name) bindings.push({ name, valueExpression });
    });
  });
  return bindings;
}

function isMasterDetailFormat(root) {
  return getSubreports(root).length > 0;
}

async function checkModelContamination(targetJrxmlPath, modelJrxmlPath) {
  const contaminations = [];

  // Parse target JRXML
  const targetXml = fs.readFileSync(targetJrxmlPath, "utf8");
  const parser = new xml2js.Parser({ explicitArray: true, trim: true });
  const targetParsed = await parser.parseStringPromise(targetXml);
  const targetRoot = targetParsed.jasperReport;

  // Parse model JRXML
  const modelXml = fs.readFileSync(modelJrxmlPath, "utf8");
  const modelParsed = await parser.parseStringPromise(modelXml);
  const modelRoot = modelParsed.jasperReport;

  const targetQuery = getQueryString(targetRoot);
  const modelQuery = getQueryString(modelRoot);

  // Check 1: Query inheritance
  if (modelQuery && modelQuery.trim() && targetQuery === modelQuery) {
    contaminations.push({
      type: "queryString",
      severity: "CRITICAL",
      message:
        "Target JRXML inherited query from model - data contamination detected",
    });
  }

  // Check 2: Field inheritance (exact match of field names)
  const targetFields = new Set(getFieldNames(targetRoot));
  const modelFields = new Set(getFieldNames(modelRoot));

  if (modelFields.size > 0 && targetFields.size > 0) {
    const identicalFields = Array.from(modelFields).filter((f) =>
      targetFields.has(f),
    );
    if (
      identicalFields.length === modelFields.size &&
      modelFields.size === targetFields.size
    ) {
      contaminations.push({
        type: "fields",
        severity: "HIGH",
        message: `Target JRXML inherited all fields from model (${Array.from(modelFields).join(", ")})`,
      });
    }
  }

  // Check 3: Parameter inheritance
  const targetParams = new Set(getParameterNames(targetRoot));
  const modelParams = new Set(getParameterNames(modelRoot));

  if (modelParams.size > 0) {
    const inheritedParams = Array.from(modelParams).filter((p) =>
      targetParams.has(p),
    );
    if (inheritedParams.length > 0) {
      contaminations.push({
        type: "parameters",
        severity: "HIGH",
        message: `Target JRXML inherited ${inheritedParams.length} parameters from model: ${inheritedParams.join(", ")}`,
      });
    }
  }

  // Check 3.5: Variable inheritance
  const targetVars = new Set(getVariableNames(targetRoot));
  const modelVars = new Set(getVariableNames(modelRoot));
  if (modelVars.size > 0) {
    const inheritedVars = Array.from(modelVars).filter((v) =>
      targetVars.has(v),
    );
    if (inheritedVars.length > 0) {
      contaminations.push({
        type: "variables",
        severity: "HIGH",
        message: `Target JRXML inherited ${inheritedVars.length} variables from model: ${inheritedVars.join(", ")}`,
      });
    }
  }

  // Check 3.6: Group inheritance
  const targetGroups = new Set(getGroupNames(targetRoot));
  const modelGroups = new Set(getGroupNames(modelRoot));
  if (modelGroups.size > 0) {
    const inheritedGroups = Array.from(modelGroups).filter((g) =>
      targetGroups.has(g),
    );
    if (inheritedGroups.length > 0) {
      contaminations.push({
        type: "groups",
        severity: "HIGH",
        message: `Target JRXML inherited ${inheritedGroups.length} groups from model: ${inheritedGroups.join(", ")}`,
      });
    }
  }

  // Check 3.7: SubDataset / DatasetRun inheritance (Phase 5)
  const targetSubDatasets = new Set(getSubDatasetNames(targetRoot));
  const modelSubDatasets = new Set(getSubDatasetNames(modelRoot));
  if (modelSubDatasets.size > 0 && targetSubDatasets.size > 0) {
    const inheritedSubDatasets = Array.from(modelSubDatasets).filter((s) =>
      targetSubDatasets.has(s),
    );
    if (inheritedSubDatasets.length > 0) {
      contaminations.push({
        type: "subDatasets",
        severity: "CRITICAL",
        message: `Target JRXML inherited subDatasets from model: ${inheritedSubDatasets.join(", ")}`,
      });
    }
  }

  const targetDatasetRuns = getDatasetRunBindings(targetRoot);
  const modelDatasetRuns = getDatasetRunBindings(modelRoot);
  if (modelDatasetRuns.length > 0 && targetDatasetRuns.length > 0) {
    const inheritedRuns = modelDatasetRuns.filter((name) =>
      targetDatasetRuns.includes(name),
    );
    if (inheritedRuns.length > 0) {
      contaminations.push({
        type: "datasetRun",
        severity: "CRITICAL",
        message: `Target JRXML inherited datasetRun bindings from model: ${Array.from(new Set(inheritedRuns)).join(", ")}`,
      });
    }
  }

  // Check 3.8: Chart/Crosstab dataset binding inheritance (Phase 5)
  if (
    hasNodeKey(modelRoot, "chartDataset") &&
    hasNodeKey(targetRoot, "chartDataset")
  ) {
    contaminations.push({
      type: "chartDataset",
      severity: "CRITICAL",
      message:
        "Target JRXML contains chartDataset bindings while model also contains chartDataset. Validate chart datasets are independently defined.",
    });
  }

  if (
    hasNodeKey(modelRoot, "crosstabDataset") &&
    hasNodeKey(targetRoot, "crosstabDataset")
  ) {
    contaminations.push({
      type: "crosstabDataset",
      severity: "CRITICAL",
      message:
        "Target JRXML contains crosstabDataset bindings while model also contains crosstabDataset. Validate crosstab datasets are independently defined.",
    });
  }

  // Check 4: Identical expressions
  const targetExpressions = new Set(getAllExpressions(targetRoot));
  const modelExpressions = getAllExpressions(modelRoot);

  const identicalExpressions = modelExpressions.filter(
    (expr) => expr && targetExpressions.has(expr) && expr.includes("$F{"),
  );
  if (identicalExpressions.length > 0) {
    contaminations.push({
      type: "expressions",
      severity: "CRITICAL",
      message: `Target JRXML inherited ${identicalExpressions.length} field expressions from model`,
    });
  }

  return contaminations;
}

// ─── Master/Detail semantic validator (Fase 3) ──────────────────────────────

async function validateMasterDetail(
  masterJrxmlPath,
  detailJrxmlPath,
  rulesPath,
  relationshipKey,
) {
  const errors = [];
  const warnings = [];
  const parser = new xml2js.Parser({ explicitArray: true, trim: true });

  const resolvedMasterPath = path.resolve(masterJrxmlPath);
  if (!fs.existsSync(resolvedMasterPath)) {
    return {
      ok: false,
      errors: [`Master JRXML not found: ${resolvedMasterPath}`],
      warnings,
    };
  }

  const masterXml = fs.readFileSync(resolvedMasterPath, "utf8");
  const masterParsed = await parser.parseStringPromise(masterXml);
  const masterRoot = masterParsed.jasperReport;
  if (!masterRoot) {
    return {
      ok: false,
      errors: ["Master JRXML: root node <jasperReport> not found."],
      warnings,
    };
  }

  // 1. Subreport presence
  const subreports = getSubreports(masterRoot);
  if (subreports.length === 0) {
    errors.push(
      "MASTER_DETAIL: no <subreport> element found in master JRXML. " +
        "Master must contain at least one <subreport> element linking the detail report.",
    );
    return { ok: false, errors, warnings };
  }

  const masterParams = getParameterNames(masterRoot);
  const masterFields = getFieldNames(masterRoot);

  // 2. Subreport path parameterization — no hardcoded .jasper paths
  const subreportExpressions = getSubreportExpressions(masterRoot);
  subreportExpressions.forEach((expr, i) => {
    if (!expr || !expr.trim()) {
      errors.push(
        `Subreport #${i + 1}: <subreportExpression> is empty. Must reference $P{PARAM_NAME} pointing to compiled detail .jasper.`,
      );
      return;
    }
    const paramRef = expr.match(/\$P\{([a-zA-Z0-9_]+)\}/);
    if (!paramRef) {
      errors.push(
        `Subreport #${i + 1}: path expression is not parameterized. ` +
          `Found: "${expr}". Must use $P{PARAM_NAME} — never hardcode a .jasper path.`,
      );
    } else {
      const paramName = paramRef[1];
      if (!masterParams.includes(paramName)) {
        errors.push(
          `Subreport #${i + 1}: parameter '${paramName}' used in <subreportExpression> ` +
            `is not declared in master <parameter> list.`,
        );
      }
    }
  });

  // 3. Parameter bindings — must reference $F{field} or $P{param}, no literals
  const paramBindings = getSubreportParameterBindings(masterRoot);
  if (paramBindings.length === 0) {
    warnings.push(
      "MASTER_DETAIL: no <subreportParameter> bindings found. " +
        "Master should pass the join key to the detail via explicit parameter binding.",
    );
  }
  paramBindings.forEach((binding) => {
    const { name, valueExpression } = binding;
    if (!valueExpression || !valueExpression.trim()) {
      errors.push(
        `Parameter binding '${name}': <subreportParameterExpression> is empty.`,
      );
      return;
    }
    const fieldRef = valueExpression.match(/\$F\{([a-zA-Z0-9_]+)\}/);
    const paramRef = valueExpression.match(/\$P\{([a-zA-Z0-9_]+)\}/);
    if (!fieldRef && !paramRef) {
      errors.push(
        `Parameter binding '${name}': expression "${valueExpression}" must use ` +
          "$F{field} or $P{param} — no hardcoded values in subreport parameter bindings.",
      );
    } else if (fieldRef) {
      const fieldName = fieldRef[1];
      if (!masterFields.includes(fieldName)) {
        errors.push(
          `Parameter binding '${name}': references $F{${fieldName}} which is not declared ` +
            "in master <field> list.",
        );
      }
    } else if (paramRef) {
      const pName = paramRef[1];
      if (!masterParams.includes(pName)) {
        errors.push(
          `Parameter binding '${name}': references $P{${pName}} which is not declared ` +
            "in master <parameter> list.",
        );
      }
    }
  });

  // 4. Cross-validate with detail JRXML
  let detailRoot = null;
  if (detailJrxmlPath) {
    const resolvedDetailPath = path.resolve(detailJrxmlPath);
    if (!fs.existsSync(resolvedDetailPath)) {
      errors.push(`Detail JRXML not found: ${resolvedDetailPath}`);
    } else {
      const detailXml = fs.readFileSync(resolvedDetailPath, "utf8");
      const detailParsed = await parser.parseStringPromise(detailXml);
      detailRoot = detailParsed.jasperReport;

      if (!detailRoot) {
        errors.push("Detail JRXML: root node <jasperReport> not found.");
      } else {
        const detailParams = getParameterNames(detailRoot);
        const detailFieldNodes = detailRoot.field || [];

        // 4a. Detail fields must all have a Java class declared
        detailFieldNodes.forEach((f) => {
          const fname = f.$ && f.$.name ? f.$.name : null;
          const klass = f.$ && f.$.class ? f.$.class : null;
          if (fname && !klass) {
            errors.push(
              `Detail JRXML: field '${fname}' declared without Java class.`,
            );
          }
        });

        // 4b. Detail SQL must be parameterized — no hardcoded filter values
        const detailQueryNode = detailRoot.queryString
          ? detailRoot.queryString[0]
          : null;
        const detailSql = findNodeValue(detailQueryNode);
        if (!detailSql || !detailSql.trim()) {
          errors.push("Detail JRXML: queryString is empty.");
        } else {
          // Prohibit hardcoded literals in WHERE clause
          const whereMatch = detailSql.match(/where\s+(.+)$/is);
          if (whereMatch) {
            const whereClause = whereMatch[1];
            const hardcodedDatePattern = /['"`]\d{4}-\d{2}-\d{2}['"`]/;
            const hardcodedNumberPattern = /=\s*\d+(?![a-zA-Z0-9_{}])/;
            if (hardcodedDatePattern.test(whereClause)) {
              errors.push(
                "Detail JRXML: SQL WHERE clause contains a hardcoded date literal. " +
                  "All filter values must use $P{paramName}.",
              );
            }
            if (hardcodedNumberPattern.test(whereClause)) {
              // Allow WHERE 1=1 pattern
              const withoutBaseline = whereClause.replace(/1\s*=\s*1/, "");
              if (hardcodedNumberPattern.test(withoutBaseline)) {
                warnings.push(
                  "Detail JRXML: SQL WHERE clause may contain a hardcoded numeric literal. " +
                    "Verify all filter values use $P{paramName}.",
                );
              }
            }
          }

          // 4c. Detail SQL parameterized references must be declared
          const referencedDetailParams = Array.from(
            detailSql.matchAll(/\$P\{([a-zA-Z0-9_]+)\}/g),
          ).map((m) => m[1]);

          if (referencedDetailParams.length === 0) {
            errors.push(
              "Detail JRXML: SQL has no $P{} parameters. " +
                "Detail must receive the join key via parameter and filter with $P{joinKeyParam}.",
            );
          }

          referencedDetailParams.forEach((p) => {
            if (!detailParams.includes(p)) {
              errors.push(
                `Detail JRXML: parameter $P{${p}} referenced in SQL but not declared ` +
                  "in detail <parameter> list.",
              );
            }
          });

          // 4d. Each master binding parameter must be declared in detail
          const boundNames = new Set(paramBindings.map((b) => b.name));
          boundNames.forEach((bName) => {
            if (!detailParams.includes(bName)) {
              errors.push(
                `Master passes parameter '${bName}' to detail but ` +
                  `detail <parameter name="${bName}"> is not declared in detail JRXML.`,
              );
            }
          });
        }
      }
    }
  }

  // 5. Cross-validate against rules/views.json relationship definition
  if (rulesPath && relationshipKey) {
    const resolvedRulesPath = path.resolve(rulesPath);
    if (fs.existsSync(resolvedRulesPath)) {
      const rules = readJson(resolvedRulesPath);
      const relDef =
        rules.relationships && rules.relationships[relationshipKey]
          ? rules.relationships[relationshipKey]
          : null;

      if (!relDef) {
        const available = Object.keys(rules.relationships || {}).filter(
          (k) => !["description", "version", "lastUpdated"].includes(k),
        );
        errors.push(
          `Relationship '${relationshipKey}' not found in rules/views.json. ` +
            `Available relationships: ${available.join(", ") || "(none)"}`,
        );
      } else {
        const masterSql = findNodeValue(
          masterRoot.queryString ? masterRoot.queryString[0] : null,
        );
        const masterViewUsed = extractViewName(masterSql);
        if (masterViewUsed && masterViewUsed !== relDef.masterView) {
          warnings.push(
            `Relationship '${relationshipKey}' expects masterView '${relDef.masterView}', ` +
              `but master JRXML queries view '${masterViewUsed}'.`,
          );
        }

        // Required master keys must be declared as fields
        const masterFieldSet = new Set(masterFields);
        (relDef.validationRules.masterKeysRequired || []).forEach((key) => {
          if (!masterFieldSet.has(key)) {
            errors.push(
              `Relationship '${relationshipKey}': required master key field '${key}' ` +
                "not declared in master JRXML <field> list.",
            );
          }
        });

        // localKey must be declared as master field
        const localKey = relDef.relationship.localKey;
        if (localKey && !masterFieldSet.has(localKey)) {
          errors.push(
            `Relationship '${relationshipKey}': join localKey '${localKey}' is not declared ` +
              'as a field in the master JRXML. Add <field name="' +
              localKey +
              '"> to the master report.',
          );
        }

        // A binding should pass the localKey to the detail
        if (localKey && paramBindings.length > 0) {
          const joinBinding = paramBindings.find((b) => {
            const expr = b.valueExpression || "";
            return (
              expr.includes(`$F{${localKey}}`) ||
              expr.includes(`$P{${localKey}}`)
            );
          });
          if (!joinBinding) {
            warnings.push(
              `Relationship '${relationshipKey}': join localKey '${localKey}' should be ` +
                `passed to detail via <subreportParameter>, but no binding references $F{${localKey}}.`,
            );
          }
        }

        // Cross-validate detail if provided
        if (detailRoot) {
          const detailSql = findNodeValue(
            detailRoot.queryString ? detailRoot.queryString[0] : null,
          );
          const detailViewUsed = extractViewName(detailSql);
          if (detailViewUsed && detailViewUsed !== relDef.detailView) {
            warnings.push(
              `Relationship '${relationshipKey}' expects detailView '${relDef.detailView}', ` +
                `but detail JRXML queries view '${detailViewUsed}'.`,
            );
          }

          const detailFieldSet = new Set(getFieldNames(detailRoot));
          const detailParamSet = new Set(getParameterNames(detailRoot));
          (relDef.validationRules.detailKeysRequired || []).forEach((key) => {
            if (!detailFieldSet.has(key) && !detailParamSet.has(key)) {
              errors.push(
                `Relationship '${relationshipKey}': required detail key '${key}' not found ` +
                  "as field or parameter in detail JRXML.",
              );
            }
          });

          const foreignKey = relDef.relationship.foreignKey;
          if (foreignKey && detailSql && !detailSql.includes(foreignKey)) {
            warnings.push(
              `Relationship '${relationshipKey}': foreignKey '${foreignKey}' does not appear ` +
                "in detail SQL WHERE clause. Ensure it is used as a filter condition.",
            );
          }

          // [FASE 4] Validation 5: Master/Detail key type matching (INT=INT, VARCHAR=VARCHAR)
          if (rules.views && localKey && foreignKey) {
            const masterViewDef = rules.views[relDef.masterView];
            const detailViewDef = rules.views[relDef.detailView];

            if (masterViewDef && detailViewDef) {
              const masterKeyField = (masterViewDef.validFields || []).find(
                (f) => f.name === localKey,
              );
              const detailKeyField = (detailViewDef.validFields || []).find(
                (f) => f.name === foreignKey,
              );

              if (
                masterKeyField &&
                detailKeyField &&
                masterKeyField.type !== detailKeyField.type
              ) {
                errors.push(
                  `Relationship '${relationshipKey}': key type mismatch! ` +
                    `Master '${localKey}' is ${masterKeyField.type} but detail '${foreignKey}' is ${detailKeyField.type}. ` +
                    `Types must match exactly (INT=INT, VARCHAR=VARCHAR, etc.).`,
                );
              }
            }
          }
        }
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

function normalizeSqlType(sqlType) {
  if (!sqlType) return "";
  return String(sqlType)
    .toUpperCase()
    .replace(/\(.+\)/, "")
    .trim();
}

function expectedJavaClassesBySqlType(sqlType) {
  const t = normalizeSqlType(sqlType);

  if (/CHAR|TEXT|VARCHAR/.test(t)) return ["java.lang.String"];
  if (/^INT$|INTEGER|SMALLINT/.test(t))
    return ["java.lang.Integer", "java.lang.Long"];
  if (/BIGINT/.test(t)) return ["java.lang.Long", "java.math.BigDecimal"];
  if (/NUMERIC|DECIMAL/.test(t))
    return ["java.math.BigDecimal", "java.lang.Double"];
  if (/DATE/.test(t) && !/TIMESTAMP/.test(t))
    return ["java.sql.Date", "java.util.Date"];
  if (/TIMESTAMP/.test(t)) return ["java.sql.Timestamp", "java.util.Date"];
  if (/TIME/.test(t) && !/TIMESTAMP/.test(t))
    return ["java.sql.Time", "java.util.Date"];
  if (/BOOL/.test(t)) return ["java.lang.Boolean"];

  return [];
}

// ─── 2-level Master/Detail semantic validation ───────────────────────────────
// Validates the second level of a MASTER_DETAIL_2L topology:
//   master → detail1 → detail2
// detail1 must contain <subreport>; detail2 must exist in rules/views.json.
async function validateMasterDetail2L(
  masterJrxmlPath,
  detail1JrxmlPath,
  detail2JrxmlPath,
  rulesPath,
  relationshipKey,
) {
  const errors = [];
  const warnings = [];

  // 1. Validate detail2 JRXML is parseable
  if (!fs.existsSync(path.resolve(detail2JrxmlPath))) {
    errors.push(`detail2 JRXML not found: ${detail2JrxmlPath}`);
    return { ok: false, errors, warnings };
  }

  let detail2Root = null;
  try {
    const xml2 = fs.readFileSync(path.resolve(detail2JrxmlPath), "utf8");
    const p2 = await new xml2js.Parser({
      explicitArray: true,
      trim: true,
    }).parseStringPromise(xml2);
    detail2Root = p2.jasperReport;
    if (!detail2Root) {
      errors.push("detail2 JRXML: root node <jasperReport> not found.");
      return { ok: false, errors, warnings };
    }
  } catch (err) {
    errors.push(`detail2 JRXML parse error: ${err.message}`);
    return { ok: false, errors, warnings };
  }

  // 2. Validate detail1 contains <subreport>
  if (detail1JrxmlPath && fs.existsSync(path.resolve(detail1JrxmlPath))) {
    try {
      const xml1 = fs.readFileSync(path.resolve(detail1JrxmlPath), "utf8");
      const p1 = await new xml2js.Parser({
        explicitArray: true,
        trim: true,
      }).parseStringPromise(xml1);
      const detail1Root = p1.jasperReport;
      if (detail1Root) {
        const subreports = getSubreports(detail1Root);
        if (subreports.length === 0) {
          warnings.push(
            "detail1 JRXML does not contain a <subreport> element. " +
              "MASTER_DETAIL_2L requires detail1 to embed detail2 as subreport.",
          );
        }
      }
    } catch (_) {
      // ignore parse errors here — runValidation will catch them
    }
  }

  // 3. Check relationship schema in rules/views.json
  if (!relationshipKey) {
    warnings.push(
      "--relationship not specified for 2L validation. " +
        "Skipping schema cross-check. Provide --relationship <key> for full validation.",
    );
    return { ok: errors.length === 0, errors, warnings };
  }

  if (!fs.existsSync(rulesPath)) {
    warnings.push(
      `rules/views.json not found at ${rulesPath}. Skipping schema cross-check.`,
    );
    return { ok: errors.length === 0, errors, warnings };
  }

  let rules = null;
  try {
    rules = JSON.parse(fs.readFileSync(rulesPath, "utf8"));
  } catch (err) {
    warnings.push(`Failed to parse rules/views.json: ${err.message}`);
    return { ok: errors.length === 0, errors, warnings };
  }

  const rel = rules.relationships && rules.relationships[relationshipKey];
  if (!rel) {
    errors.push(
      `Relationship key "${relationshipKey}" not found in rules/views.json.relationships.`,
    );
    return { ok: false, errors, warnings };
  }

  // 4. Check detail2View and relationship2 fields exist in the entry
  if (!rel.detail2View) {
    errors.push(
      `Relationship "${relationshipKey}" does not define "detail2View". ` +
        "Add detail2View to rules/views.json for 2L support.",
    );
  }
  if (!rel.relationship2) {
    errors.push(
      `Relationship "${relationshipKey}" does not define "relationship2". ` +
        "Add relationship2 to rules/views.json for 2L support.",
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings };
  }

  const detail2ViewName = rel.detail2View;
  const rel2 = rel.relationship2;

  // 5. Check detail2View exists in views.json
  if (!rules.views || !rules.views[detail2ViewName]) {
    errors.push(
      `detail2View "${detail2ViewName}" not found in rules/views.json.views.`,
    );
    return { ok: false, errors, warnings };
  }

  const detail2ViewDef = rules.views[detail2ViewName];

  // 6. Check relationship2 keys exist in their respective views
  const detailViewName = rel.detailView;
  const detailViewDef = rules.views && rules.views[detailViewName];

  if (rel2.localKey && detailViewDef) {
    const localKeyField =
      detailViewDef.validFields &&
      detailViewDef.validFields.find((f) => f.name === rel2.localKey);
    if (!localKeyField) {
      errors.push(
        `relationship2.localKey "${rel2.localKey}" not found in detailView "${detailViewName}" validFields.`,
      );
    }
  }

  if (rel2.foreignKey) {
    const foreignKeyField =
      detail2ViewDef.validFields &&
      detail2ViewDef.validFields.find((f) => f.name === rel2.foreignKey);
    if (!foreignKeyField) {
      errors.push(
        `relationship2.foreignKey "${rel2.foreignKey}" not found in detail2View "${detail2ViewName}" validFields.`,
      );
    }
  }

  // 7. Check type consistency between localKey and foreignKey
  if (rel2.localKey && rel2.foreignKey && detailViewDef && detail2ViewDef) {
    const lkField =
      detailViewDef.validFields &&
      detailViewDef.validFields.find((f) => f.name === rel2.localKey);
    const fkField =
      detail2ViewDef.validFields &&
      detail2ViewDef.validFields.find((f) => f.name === rel2.foreignKey);

    if (lkField && fkField) {
      const lkTypes = normalizeSqlType(lkField.type || "");
      const fkTypes = normalizeSqlType(fkField.type || "");
      const typesCompatible =
        lkTypes.length > 0 &&
        fkTypes.length > 0 &&
        lkTypes.some((t) => fkTypes.includes(t));
      if (!typesCompatible) {
        errors.push(
          `relationship2 key type mismatch: ` +
            `detailView.${rel2.localKey} (${lkField.type}) vs ` +
            `detail2View.${rel2.foreignKey} (${fkField.type}). ` +
            "Keys must have compatible SQL types.",
        );
      }
    }
  }

  // 8. Check cardinality
  if (rel2.cardinality && rel2.cardinality !== "1:N") {
    errors.push(
      `relationship2.cardinality must be "1:N" (found: "${rel2.cardinality}"). ` +
        "MASTER_DETAIL_2L only supports 1:N at each level.",
    );
  }

  return { ok: errors.length === 0, errors, warnings };
}

async function runValidation(jrxmlPath, rulesPath) {
  const errors = [];
  const warnings = [];
  const resolvedJrxmlPath = path.resolve(jrxmlPath);

  if (!fs.existsSync(resolvedJrxmlPath)) {
    throw new Error(`JRXML not found: ${resolvedJrxmlPath}`);
  }

  const xmlContent = fs.readFileSync(resolvedJrxmlPath, "utf8");
  const parser = new xml2js.Parser({ explicitArray: true, trim: true });
  const parsed = await parser.parseStringPromise(xmlContent);

  const root = parsed.jasperReport;
  if (!root) {
    errors.push("Root node <jasperReport> not found.");
  }

  const reportName =
    root && root.$ && root.$.name
      ? root.$.name
      : path.basename(resolvedJrxmlPath, ".jrxml");

  // [FASE 4] Validation 1: JasperReports 6.2.0 compatibility (no uuid, kind, splitType attributes)
  if (root && root.$) {
    if (root.$.uuid)
      errors.push(
        'Attribute "uuid" is incompatible with JasperReports 6.2.0 (added in 6.4+).',
      );
    if (root.$.kind)
      errors.push(
        'Attribute "kind" is incompatible with JasperReports 6.2.0 (added in 6.3+).',
      );
    if (root.$.splitType)
      errors.push(
        'Attribute "splitType" is incompatible with JasperReports 6.2.0 (added in 6.3+).',
      );
  }

  const queryNode = root && root.queryString ? root.queryString[0] : null;
  const sql = findNodeValue(queryNode);

  if (!sql || !sql.trim()) {
    errors.push("queryString is empty.");
  }

  // [FASE 4] Validation 2: CDATA well-formed check
  if (sql && !xmlContent.includes("<![CDATA[") && sql.includes("SELECT")) {
    warnings.push("Query should be wrapped in CDATA: <![CDATA[...]]>");
  }

  if (/select\s+\*/i.test(sql)) {
    errors.push("Query uses SELECT *. Use explicit fields.");
  }

  if (!/where\s+1\s*=\s*1/i.test(sql)) {
    warnings.push("Query does not contain WHERE 1=1.");
  }

  const parameterNodes = root && root.parameter ? root.parameter : [];
  const params = parameterNodes
    .map((p) => (p.$ && p.$.name ? p.$.name : null))
    .filter(Boolean);

  const referencedParams = Array.from(
    sql.matchAll(/\$P\{([a-zA-Z0-9_]+)\}/g),
  ).map((m) => m[1]);
  referencedParams.forEach((p) => {
    if (!params.includes(p)) {
      errors.push(`Parameter referenced in SQL but not declared: ${p}`);
    }
  });

  // [FASE 4] Validation 3: Hardcoded filter values detection
  if (sql) {
    const hardcodedDatePattern = /where\s+.+['"`]\d{4}-\d{2}-\d{2}['"`]/i;
    if (hardcodedDatePattern.test(sql)) {
      warnings.push(
        "SQL WHERE clause contains a hardcoded date. Use $P{paramName} for filters.",
      );
    }
    const hardcodedNumberPattern =
      /where\s+.+(?<![a-zA-Z0-9_{}])\d+(?![a-zA-Z0-9_{}]).+[^=1]/;
    if (hardcodedNumberPattern.test(sql) && !/WHERE\s+1\s*=\s*1/i.test(sql)) {
      warnings.push(
        "SQL WHERE clause may contain hardcoded numbers. Verify all filters use $P{paramName}.",
      );
    }
  }

  // [FASE 4] Validation 4: Parameter declarations must match usage
  parameterNodes.forEach((p) => {
    const pName = p.$ && p.$.name ? p.$.name : null;
    const pClass = p.$ && p.$.class ? p.$.class : null;
    if (pName && !pClass) {
      warnings.push(`Parameter '${pName}' declared without class attribute.`);
    }
  });

  const bands = ["title", "columnHeader", "detail", "pageFooter"];
  let foundBands = 0;
  bands.forEach((band) => {
    if (root && root[band] && root[band].length > 0) foundBands += 1;
  });

  if (foundBands < 4) {
    warnings.push(
      `Expected 4 bands (title, columnHeader, detail, pageFooter). Found: ${foundBands}.`,
    );
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
        errors.push(
          `View not found in rules/views.json: ${viewName || "(unable to parse FROM)"}`,
        );
      } else {
        const validFields = new Set(
          (viewDef.validFields || []).map((f) => f.name),
        );
        const validFieldMap = new Map(
          (viewDef.validFields || []).map((f) => [f.name, f]),
        );
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
          if (
            acceptedClasses.length > 0 &&
            !acceptedClasses.includes(declaredClass)
          ) {
            errors.push(
              `Field type mismatch for '${f}': rules type '${fieldDef.type}' expects ${acceptedClasses.join(" or ")}, but JRXML declares ${declaredClass}.`,
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
    warnings,
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
    console.log("OK VALIDATION SUCCESS");
  } else {
    result.errors.forEach((e) => console.error(`ERROR ${e}`));
    result.warnings.forEach((w) => console.error(`WARN ${w}`));
    console.error("ERROR VALIDATION FAILED");
  }
}

function printMasterDetailResult(result) {
  if (result.ok) {
    console.log("OK MASTER_DETAIL SEMANTIC VALIDATION PASSED");
    if (result.warnings.length) {
      result.warnings.forEach((w) => console.log(`WARN [M/D] ${w}`));
    }
  } else {
    console.error("ERROR MASTER_DETAIL SEMANTIC VALIDATION FAILED");
    result.errors.forEach((e) => console.error(`ERROR [M/D] ${e}`));
    result.warnings.forEach((w) => console.error(`WARN  [M/D] ${w}`));
  }
}

async function main() {
  const args = process.argv.slice(2);
  const jrxmlPath = args[0];

  let rulesPath = path.resolve(__dirname, "..", "rules", "views.json");
  let modelJrxmlPath = null;
  let detailJrxmlPath = null;
  let detail2JrxmlPath = null;
  let relationshipKey = null;

  // Block --detail3 or deeper before any other parsing
  if (args.some((a) => a === "--detail3" || a.startsWith("--detail3"))) {
    console.error(
      "ERROR: Máximo de 2 níveis de detail suportados. Use apenas --detail e --detail2.",
    );
    process.exit(1);
  }

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--check-model-contamination") {
      modelJrxmlPath = args[i + 1] || null;
      i += 1;
      continue;
    }
    if (arg === "--detail") {
      detailJrxmlPath = args[i + 1] || null;
      i += 1;
      continue;
    }
    if (arg === "--detail2") {
      detail2JrxmlPath = args[i + 1] || null;
      i += 1;
      continue;
    }
    if (arg === "--relationship") {
      relationshipKey = args[i + 1] || null;
      i += 1;
      continue;
    }
    if (!arg.startsWith("--")) {
      rulesPath = path.resolve(arg);
    }
  }

  if (!jrxmlPath) {
    console.error(
      "Usage: node validate.js <report.jrxml> [rules/views.json]\n" +
        "  [--check-model-contamination <model.jrxml>]\n" +
        "  [--detail <detail.jrxml>] [--detail2 <detail2.jrxml>] [--relationship <relKey>]",
    );
    process.exit(1);
  }

  // --detail2 requires --detail
  if (detail2JrxmlPath && !detailJrxmlPath) {
    console.error(
      "ERROR: --detail2 requires --detail to also be specified (master → detail1 → detail2).",
    );
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

      console.log("");
      console.log("🔍 Checking for semantic data contamination...");
      const contaminations = await checkModelContamination(
        jrxmlPath,
        modelJrxmlPath,
      );

      if (contaminations.length === 0) {
        console.log("✅ OK: No semantic data contamination detected");
        process.exit(result.ok ? 0 : 2);
      } else {
        console.error("❌ ERROR: Semantic data contamination detected!");
        contaminations.forEach((c) => {
          const icon = c.severity === "CRITICAL" ? "🔴" : "🟠";
          console.error(`${icon} [${c.severity}] ${c.type}: ${c.message}`);
        });
        console.error("");
        console.error(
          "Do not reuse data semantics from modelo. Target JRXML must have independent data.",
        );
        process.exit(1);
      }
    }

    // Master/Detail semantic validation (Fase 3)
    // Auto-detect: trigger if subreport present in JRXML, or --detail flag provided
    const xmlForDetect = fs.readFileSync(path.resolve(jrxmlPath), "utf8");
    const parsedForDetect = await new xml2js.Parser({
      explicitArray: true,
      trim: true,
    }).parseStringPromise(xmlForDetect);
    const rootForDetect = parsedForDetect.jasperReport;

    if (
      rootForDetect &&
      (isMasterDetailFormat(rootForDetect) || detailJrxmlPath)
    ) {
      console.log("");
      console.log("🔍 Master/Detail semantic validation...");
      const mdResult = await validateMasterDetail(
        jrxmlPath,
        detailJrxmlPath,
        rulesPath,
        relationshipKey,
      );
      printMasterDetailResult(mdResult);
      if (!mdResult.ok) {
        process.exit(3);
      }

      // 2-level validation if --detail2 provided
      if (detail2JrxmlPath) {
        console.log("");
        console.log(
          "🔍 Master/Detail 2L semantic validation (detail1 → detail2)...",
        );
        const md2lResult = await validateMasterDetail2L(
          jrxmlPath,
          detailJrxmlPath,
          detail2JrxmlPath,
          rulesPath,
          relationshipKey,
        );
        printMasterDetailResult(md2lResult);
        if (!md2lResult.ok) {
          process.exit(3);
        }
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

module.exports = {
  runValidation,
  checkModelContamination,
  validateMasterDetail,
  validateMasterDetail2L,
  isMasterDetailFormat,
};
