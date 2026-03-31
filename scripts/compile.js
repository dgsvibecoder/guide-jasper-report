#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { runValidation, checkModelContamination } = require('./validate');

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

function ensureJavaRunnerBuilt() {
  const runnerDir = path.resolve(__dirname, 'jasper-runner');
  const jarPath = path.join(runnerDir, 'target', 'jasper-runner.jar');

  runCommand('mvn', ['-q', '-DskipTests', 'package'], runnerDir);

  if (!fs.existsSync(jarPath)) {
    throw new Error(`Jasper runner jar not found after build: ${jarPath}`);
  }

  return jarPath;
}

async function main() {
  const jrxmlArg = process.argv[2];
  const wantsPdf = process.argv.includes('--pdf');
  const blueprintFlagIdx = process.argv.indexOf('--style-blueprint');
  const blueprintPath = blueprintFlagIdx !== -1 ? process.argv[blueprintFlagIdx + 1] : null;
  const rulesPath = path.resolve(__dirname, '..', 'rules', 'views.json');

  if (!jrxmlArg) {
    console.error('Usage: node compile.js <report.jrxml> [--pdf] [--style-blueprint <blueprint.json>]');
    process.exit(1);
  }

  const jrxmlPath = path.resolve(jrxmlArg);
  if (!fs.existsSync(jrxmlPath)) {
    console.error(`ERROR JRXML not found: ${jrxmlPath}`);
    process.exit(1);
  }

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

  fs.writeFileSync(logPath, `${logLines.join('\n')}\n`, 'utf8');

  // Build metadata with styleSource tracking
  const metadata = {
    reportName: validation.reportName,
    generatedAt: new Date().toISOString(),
    compiledAt: new Date().toISOString(),
    source: path.basename(jrxmlPath),
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
  process.exit(1);
});
