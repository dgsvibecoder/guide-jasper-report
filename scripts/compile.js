#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { runValidation, checkModelContamination, validateMasterDetail } = require('./validate');

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function runCommand(command, args, cwd) {
  const res = spawnSync(command, args, {
    cwd,
    stdio: 'pipe',
    encoding: 'utf8'
  });

  if (res.status !== 0) {
    const stderr = (res.stderr || '').trim();
    const stdout = (res.stdout || '').trim();
    throw new Error(`${command} failed: ${stderr || stdout || `exit code ${res.status}`}`);
  }

  return res.stdout || '';
}

function assessEmptyDataRisk(pdfPath) {
  if (!pdfPath || !fs.existsSync(pdfPath)) {
    return {
      hasPdf: false,
      pdfSizeBytes: null,
      possibleEmptyData: null,
      severity: 'info',
      message: 'PDF not generated in this run.'
    };
  }

  const size = fs.statSync(pdfPath).size;
  const possibleEmpty = size < 1024;
  return {
    hasPdf: true,
    pdfSizeBytes: size,
    possibleEmptyData: possibleEmpty,
    severity: possibleEmpty ? 'warning' : 'info',
    message: possibleEmpty
      ? `PDF size is very small (${size} bytes). Possible empty dataset or mapping issue.`
      : `PDF size looks healthy (${size} bytes).`
  };
}

function errorGuidance(message) {
  const m = String(message || '').toLowerCase();
  const tips = [];

  if (m.includes('connection refused') || m.includes('driver') || m.includes('jdbc')) {
    tips.push('Verifique conexão com banco (DB_URL/DB_USER/DB_PASSWORD) e se o PostgreSQL está acessível.');
  }
  if (m.includes('field type mismatch') || m.includes('type mismatch')) {
    tips.push('Confira tipo de cada <field class> no JRXML versus rules/views.json.');
  }
  if (m.includes('semantic contamination')) {
    tips.push('Remova herança de query/fields/parameters do modelo visual e revalide com --check-model-contamination.');
  }
  if (m.includes('jrvalidationexception') || m.includes('columns and margins do not fit')) {
    tips.push('Ajuste pageWidth/margins/columnWidth no JRXML (columnWidth = pageWidth - leftMargin - rightMargin).');
  }
  if (m.includes('detail jrxml not found') || m.includes('detail.jasper not found')) {
    tips.push('Confirme caminho do detail no comando e permissões de escrita em output/.');
  }
  if (m.includes('model jrxml not found')) {
    tips.push('Revise o caminho do modelo e evite usar arquivo temporário inexistente.');
  }

  if (tips.length === 0) {
    tips.push('Revise o arquivo .log gerado em output/ e rode validate.js antes de compilar.');
  }

  return tips;
}

function ensureJavaRunnerBuilt() {
  const runnerDir = path.resolve(__dirname, 'jasper-runner');
  const jarPath = path.join(runnerDir, 'target', 'jasper-runner.jar');
  const forceRebuild = process.env.FORCE_JASPER_RUNNER_BUILD === '1';

  // Reuse existing jar by default to keep execution deterministic and avoid
  // transient shaded-artifact replacement errors in repeated runs.
  if (!forceRebuild && fs.existsSync(jarPath)) {
    return jarPath;
  }

  runCommand('mvn', ['-q', '-DskipTests', 'package'], runnerDir);

  if (!fs.existsSync(jarPath)) {
    throw new Error(`Jasper runner jar not found after build: ${jarPath}`);
  }

  return jarPath;
}

// ─── Master/Detail 2-stage pipeline (Fase 4) ───────────────────────────────

async function compileMasterDetail(masterJrxmlPath, detailJrxmlPath, opts) {
  const { wantsPdf, rulesPath, relationshipKey } = opts;

  const masterBaseName = path.basename(masterJrxmlPath, '.jrxml');
  const detailBaseName = path.basename(detailJrxmlPath, '.jrxml');
  const outputDir = path.dirname(masterJrxmlPath);

  const logLines = [];
  const log = (level, msg) => {
    const line = `[${new Date().toISOString()}] ${level} ${msg}`;
    logLines.push(line);
    if (level === 'ERROR') console.error(line);
    else console.log(line);
  };

  log('INFO', '[M/D] Starting master/detail 2-stage pipeline');
  log('INFO', `[M/D] Master JRXML : ${path.basename(masterJrxmlPath)}`);
  log('INFO', `[M/D] Detail JRXML : ${path.basename(detailJrxmlPath)}`);
  if (relationshipKey) log('INFO', `[M/D] Relationship : ${relationshipKey}`);

  // ── Stage 1/5: Validate master JRXML ────────────────────────────────────
  log('INFO', '[Stage 1/5] Validating master JRXML...');
  const masterValidation = await runValidation(masterJrxmlPath, rulesPath);
  masterValidation.warnings.forEach((w) => log('WARN', w));
  if (!masterValidation.ok) {
    masterValidation.errors.forEach((e) => log('ERROR', e));
    log('ERROR', '[Stage 1/5] Master JRXML validation FAILED — aborting');
    process.exit(2);
  }
  log('INFO', `[Stage 1/5] Master JRXML valid (${masterValidation.reportName})`);

  // ── Stage 2/5: Validate detail JRXML ────────────────────────────────────
  log('INFO', '[Stage 2/5] Validating detail JRXML...');
  const detailValidation = await runValidation(detailJrxmlPath, rulesPath);
  detailValidation.warnings.forEach((w) => log('WARN', w));
  if (!detailValidation.ok) {
    detailValidation.errors.forEach((e) => log('ERROR', e));
    log('ERROR', '[Stage 2/5] Detail JRXML validation FAILED — aborting');
    process.exit(2);
  }
  log('INFO', `[Stage 2/5] Detail JRXML valid (${detailValidation.reportName})`);

  // ── Stage 2.5: Semantic master/detail validation (if relationship key given)
  if (relationshipKey) {
    log('INFO', `[Stage 2.5] Semantic M/D validation (relationship: ${relationshipKey})...`);
    const mdResult = await validateMasterDetail(
      masterJrxmlPath,
      detailJrxmlPath,
      rulesPath,
      relationshipKey
    );
    mdResult.warnings.forEach((w) => log('WARN', `[M/D] ${w}`));
    if (!mdResult.ok) {
      mdResult.errors.forEach((e) => log('ERROR', `[M/D] ${e}`));
      log('ERROR', '[Stage 2.5] Semantic M/D validation FAILED — aborting');
      process.exit(3);
    }
    log('INFO', '[Stage 2.5] Semantic M/D validation passed');
  }

  const runnerJar = ensureJavaRunnerBuilt();

  // ── Stage 3/5: Compile detail.jrxml → detail.jasper ─────────────────────
  log('INFO', '[Stage 3/5] Compiling detail JRXML...');
  const detailJasperPath = path.join(outputDir, `${detailBaseName}.jasper`);
  runCommand(
    'java',
    ['-jar', runnerJar, 'compile', path.resolve(detailJrxmlPath), path.resolve(detailJasperPath)],
    outputDir
  );
  if (!fs.existsSync(detailJasperPath)) {
    log('ERROR', `[Stage 3/5] detail.jasper not found after compilation: ${detailJasperPath}`);
    process.exit(1);
  }
  log('INFO', `[Stage 3/5] detail.jasper compiled OK: ${path.basename(detailJasperPath)}`);

  // ── Stage 4/5: Compile master.jrxml → master.jasper ─────────────────────
  log('INFO', '[Stage 4/5] Compiling master JRXML...');
  const masterJasperPath = path.join(outputDir, `${masterBaseName}.jasper`);
  runCommand(
    'java',
    ['-jar', runnerJar, 'compile', path.resolve(masterJrxmlPath), path.resolve(masterJasperPath)],
    outputDir
  );
  log('INFO', `[Stage 4/5] master.jasper compiled OK: ${path.basename(masterJasperPath)}`);

  // ── Stage 5/5: Generate PDF ──────────────────────────────────────────────
  let pdfPath = null;
  if (wantsPdf) {
    log('INFO', '[Stage 5/5] Generating master PDF (detail resolved via SUBREPORT_DETAIL_PATH)...');
    pdfPath = path.join(outputDir, `${masterBaseName}.pdf`);
    const absoluteDetailJasperPath = path.resolve(detailJasperPath);
    const dbUrl = process.env.DB_URL || 'jdbc:postgresql://172.30.64.1:5432/jasper-report-ai?sslmode=disable';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || 'postgres';
    runCommand(
      'java',
      [
        '-jar', runnerJar,
        'pdf-with-data',
        path.resolve(masterJasperPath),
        path.resolve(pdfPath),
        dbUrl, dbUser, dbPassword,
        `SUBREPORT_DETAIL_PATH=${absoluteDetailJasperPath}`
      ],
      outputDir
    );
    log('INFO', `[Stage 5/5] Master PDF generated: ${path.basename(pdfPath)}`);
  } else {
    log('INFO', '[Stage 5/5] PDF generation skipped (--pdf not specified)');
  }

  const diagnostic = assessEmptyDataRisk(pdfPath);
  log('INFO', '[Summary] Master rows: unknown (row count not exposed by current runtime)');
  log('INFO', '[Summary] Detail rows: unknown (row count not exposed by current runtime)');
  if (diagnostic.hasPdf) {
    log('INFO', `[Summary] PDF size: ${diagnostic.pdfSizeBytes} bytes`);
    if (diagnostic.possibleEmptyData) {
      log('WARN', `[Summary] ${diagnostic.message}`);
      log('WARN', '[Summary] Check field types, filter ranges and relation keys if data seems missing.');
    }
  } else {
    log('INFO', '[Summary] PDF not requested in this run (--pdf not specified)');
  }

  // ── Write log ────────────────────────────────────────────────────────────
  const logPath = path.join(outputDir, `${masterBaseName}.log`);
  fs.writeFileSync(logPath, logLines.join('\n') + '\n', 'utf8');

  // ── Write metadata with reportTopology ───────────────────────────────────
  const metadataPath = path.join(outputDir, 'metadata.json');
  const masterJrxmlContent = fs.readFileSync(masterJrxmlPath, 'utf8');
  const detailJrxmlContent = fs.readFileSync(detailJrxmlPath, 'utf8');

  const metadata = {
    reportName: masterValidation.reportName,
    generatedAt: new Date().toISOString(),
    format: 'MASTER_DETAIL',
    reportTopology: {
      type: 'MASTER_DETAIL',
      masterFile: path.basename(masterJrxmlPath),
      detailFiles: [path.basename(detailJrxmlPath)],
      relationKeys: relationshipKey ? [relationshipKey] : [],
      parameterBindings: {
        SUBREPORT_DETAIL_PATH: path.basename(detailJasperPath)
      }
    },
    outputs: {
      masterJrxml: path.basename(masterJrxmlPath),
      masterJasper: path.basename(masterJasperPath),
      detailJrxml: path.basename(detailJrxmlPath),
      detailJasper: path.basename(detailJasperPath),
      pdf: pdfPath ? path.basename(pdfPath) : null,
      log: path.basename(logPath)
    },
    checksums: {
      masterJrxml: sha256(masterJrxmlContent),
      masterJasper: sha256(fs.readFileSync(masterJasperPath)),
      detailJrxml: sha256(detailJrxmlContent),
      detailJasper: sha256(fs.readFileSync(detailJasperPath)),
      pdf: pdfPath ? sha256(fs.readFileSync(pdfPath)) : null
    },
    validation: {
      masterXmlValid: masterValidation.ok,
      detailXmlValid: detailValidation.ok,
      semanticValidation: relationshipKey ? 'passed' : 'skipped',
      relationshipKey: relationshipKey || null
    },
    diagnostics: {
      mode: 'MASTER_DETAIL',
      outputDir: outputDir,
      emptyDataRisk: diagnostic,
      troubleshootingHints: [
        'Se o detalhe estiver vazio, valide relation key e parâmetro subreport.',
        'Se PDF vier muito pequeno, revise filtros de data e classes de <field>.',
        'Use master.log para identificar a etapa que falhou no pipeline 2-stage.'
      ]
    },
    note: 'Master/Detail report compiled with 2-stage pipeline (Fase 4).'
  };

  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

  console.log(`OK [M/D] Compiled detail : ${detailJasperPath}`);
  console.log(`OK [M/D] Compiled master : ${masterJasperPath}`);
  if (pdfPath) console.log(`OK [M/D] Generated PDF   : ${pdfPath}`);
  console.log(`OK [M/D] Log             : ${logPath}`);
  console.log(`OK [M/D] Metadata        : ${metadataPath}`);
}

// ─── Simple / existing pipeline ─────────────────────────────────────────────

async function main() {
  const jrxmlArg = process.argv[2];
  const wantsPdf = process.argv.includes('--pdf');
  const blueprintFlagIdx = process.argv.indexOf('--style-blueprint');
  const blueprintPath = blueprintFlagIdx !== -1 ? process.argv[blueprintFlagIdx + 1] : null;
  const detailFlagIdx = process.argv.indexOf('--detail');
  const detailJrxmlArg = detailFlagIdx !== -1 ? process.argv[detailFlagIdx + 1] : null;
  const relFlagIdx = process.argv.indexOf('--relationship');
  const relationshipKey = relFlagIdx !== -1 ? process.argv[relFlagIdx + 1] : null;
  const rulesPath = path.resolve(__dirname, '..', 'rules', 'views.json');

  if (!jrxmlArg) {
    console.error(
      'Usage:\n' +
      '  node compile.js <report.jrxml> [--pdf] [--style-blueprint <blueprint.json>]\n' +
      '  node compile.js <master.jrxml> --detail <detail.jrxml> [--pdf] [--relationship <relKey>]'
    );
    process.exit(1);
  }

  const jrxmlPath = path.resolve(jrxmlArg);
  if (!fs.existsSync(jrxmlPath)) {
    console.error(`ERROR JRXML not found: ${jrxmlPath}`);
    process.exit(1);
  }

  // ── Master/Detail mode: dispatch to 2-stage pipeline ────────────────────
  if (detailJrxmlArg) {
    const detailJrxmlPath = path.resolve(detailJrxmlArg);
    if (!fs.existsSync(detailJrxmlPath)) {
      console.error(`ERROR Detail JRXML not found: ${detailJrxmlPath}`);
      process.exit(1);
    }
    await compileMasterDetail(jrxmlPath, detailJrxmlPath, { wantsPdf, rulesPath, relationshipKey });
    return;
  }

  // ── Simple mode (existing pipeline, unchanged) ───────────────────────────
  const validation = await runValidation(jrxmlPath, rulesPath);
  if (!validation.ok) {
    validation.errors.forEach((e) => console.error(`ERROR ${e}`));
    process.exit(2);
  }

  const outputDir = path.dirname(jrxmlPath);
  const baseName = path.basename(jrxmlPath, '.jrxml');
  ensureDir(outputDir);

  const jrxmlContent = fs.readFileSync(jrxmlPath, 'utf8');
  const jasperPath = path.join(outputDir, `${baseName}.jasper`);
  const pdfPath = path.join(outputDir, `${baseName}.pdf`);
  const logPath = path.join(outputDir, `${baseName}.log`);
  const metadataPath = path.join(outputDir, 'metadata.json');

  const runnerJar = ensureJavaRunnerBuilt();
  runCommand('java', ['-jar', runnerJar, 'compile', jrxmlPath, jasperPath], outputDir);

  if (wantsPdf) {
    const dbUrl = process.env.DB_URL || 'jdbc:postgresql://172.30.64.1:5432/jasper-report-ai?sslmode=disable';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || 'postgres';
    
     const absoluteJasperPath = path.resolve(jasperPath);
     const absolutePdfPath = path.resolve(pdfPath);
     runCommand('java', ['-jar', runnerJar, 'pdf-with-data', absoluteJasperPath, absolutePdfPath, dbUrl, dbUser, dbPassword], outputDir);
  }

  const logLines = [];
  logLines.push(`[${new Date().toISOString()}] INFO compile started`);
  logLines.push(`[${new Date().toISOString()}] INFO validation ok`);
  validation.warnings.forEach((w) => logLines.push(`[${new Date().toISOString()}] WARN ${w}`));
  logLines.push(`[${new Date().toISOString()}] INFO jasper generated: ${path.basename(jasperPath)}`);
  if (wantsPdf) {
    logLines.push(`[${new Date().toISOString()}] INFO pdf generated: ${path.basename(pdfPath)}`);
  }

  // Load blueprint if provided
  let blueprintData = null;
  let contaminationCheckStatus = 'skipped';
  if (blueprintPath && fs.existsSync(blueprintPath)) {
    try {
      blueprintData = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
    } catch (err) {
      console.warn(`WARN Failed to parse blueprint JSON: ${err.message}`);
    }
  }

  // Phase 5 fail-safe: if style came from a JRXML model, validate semantic contamination.
  if (blueprintData?.source?.jrxmlModelPath) {
    const modelPath = path.resolve(blueprintData.source.jrxmlModelPath);
    if (!fs.existsSync(modelPath)) {
      throw new Error(`Model JRXML not found for contamination check: ${modelPath}`);
    }
    const contaminations = await checkModelContamination(jrxmlPath, modelPath);
    if (contaminations.length > 0) {
      const details = contaminations.map((c) => `[${c.severity}] ${c.type}: ${c.message}`).join(' | ');
      throw new Error(`Semantic contamination detected before compile: ${details}`);
    }
    contaminationCheckStatus = 'passed';
    logLines.push(`[${new Date().toISOString()}] INFO contamination check passed (model: ${path.basename(modelPath)})`);
  }

  const diagnostic = assessEmptyDataRisk(wantsPdf ? pdfPath : null);
  logLines.push(`[${new Date().toISOString()}] INFO summary: rowCount=unknown (simple mode runtime does not expose row count)`);
  if (diagnostic.hasPdf) {
    logLines.push(`[${new Date().toISOString()}] INFO summary: pdfSizeBytes=${diagnostic.pdfSizeBytes}`);
    if (diagnostic.possibleEmptyData) {
      logLines.push(`[${new Date().toISOString()}] WARN summary: ${diagnostic.message}`);
      logLines.push(`[${new Date().toISOString()}] WARN summary: revise filtros e mapeamento de fields/classes`);
    }
  }

  fs.writeFileSync(logPath, `${logLines.join('\n')}\n`, 'utf8');

  // Build metadata with styleSource tracking
  const metadata = {
    reportName: validation.reportName,
    generatedAt: new Date().toISOString(),
    compiledAt: new Date().toISOString(),
    source: path.basename(jrxmlPath),
    reportTopology: {
      type: 'SIMPLE',
      masterFile: path.basename(jrxmlPath),
      detailFiles: [],
      relationKeys: [],
      parameterBindings: {}
    },
    outputs: {
      jrxml: path.basename(jrxmlPath),
      jasper: path.basename(jasperPath),
      pdf: wantsPdf ? path.basename(pdfPath) : null,
      log: path.basename(logPath)
    },
    checksums: {
      jrxml: sha256(jrxmlContent),
      jasper: sha256(fs.readFileSync(jasperPath)),
      pdf: wantsPdf ? sha256(fs.readFileSync(pdfPath)) : null
    },
    jrxml: {
      file: path.basename(jrxmlPath),
      hash: sha256(jrxmlContent)
    },
    jasper: {
      file: path.basename(jasperPath),
      hash: sha256(fs.readFileSync(jasperPath)),
      size: fs.statSync(jasperPath).size,
      version: 'JasperReports 6.2.0'
    },
    pdf: wantsPdf ? {
      file: path.basename(pdfPath),
      size: fs.statSync(pdfPath).size,
      hasData: true
    } : null,
    styleSource: blueprintData ? {
      type: blueprintData.source?.inputMode || 'unknown',
      path: blueprintData.source?.jrxmlModelPath || null,
      sha256: blueprintData.source?.jrxmlModelSha256 || null,
      confidence: blueprintData.confidence?.global || 0,
      fallbackApplied: false,
      appliedAt: new Date().toISOString()
    } : {
      type: 'nativa',
      path: null,
      sha256: null,
      confidence: null,
      fallbackApplied: false,
      appliedAt: new Date().toISOString()
    },
    dataSource: {
      view: null,
      fields: [],
      filters: []
    },
    validation: {
      xmlValid: validation.ok,
      sqlValid: validation.ok,
      contaminationCheck: contaminationCheckStatus,
      typeConsistency: validation.ok ? 'passed' : 'failed'
    },
    diagnostics: {
      mode: 'SIMPLE',
      outputDir: outputDir,
      emptyDataRisk: diagnostic,
      troubleshootingHints: [
        'Se PDF vier pequeno, valide filtros e retorno da view.',
        'Se houver erro de tipo, alinhe <field class> com rules/views.json.',
        'Use o .log para rastrear em qual etapa (validate/compile/pdf) ocorreu falha.'
      ]
    },
    note: 'Artifacts generated with JasperReports Java runner.'
  };

  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

  console.log(`OK Generated ${jasperPath}`);
  if (wantsPdf) console.log(`OK Generated ${pdfPath}`);
  console.log(`OK Generated ${logPath}`);
  console.log(`OK Generated ${metadataPath}`);
  
  // Output style tracking info if blueprint was used
  if (blueprintData) {
    console.log(`OK Style tracking: ${blueprintData.source?.inputMode || 'unknown'}`);
    if (blueprintData.source?.jrxmlModelPath) {
      console.log(`OK Style source: ${blueprintData.source.jrxmlModelPath}`);
    }
    if (blueprintData.confidence?.global != null) {
      const confidence = (blueprintData.confidence.global * 100).toFixed(1);
      console.log(`OK Style confidence: ${confidence}% (threshold: 65%)`);
    }
  }
}

main().catch((err) => {
  console.error(`ERROR ${err.message}`);
  const tips = errorGuidance(err.message);
  tips.forEach((tip, idx) => console.error(`HINT ${idx + 1}: ${tip}`));
  process.exit(1);
});
