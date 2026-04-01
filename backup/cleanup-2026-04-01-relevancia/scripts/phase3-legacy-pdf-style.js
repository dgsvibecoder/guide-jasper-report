#!/usr/bin/env node

/**
 * phase3-legacy-pdf-style.js
 *
 * Full Phase 3 orchestrator pipeline:
 *
 *   1. Extract Phase 3 Style Blueprint from legacy PDF
 *      (multi-page analysis + image region detection + OCR metadata)
 *   2. Apply Phase 3 blueprint to source JRXML
 *      (Phase 2 visual styling + image region guidance + OCR reporting)
 *   3. Validate styled JRXML (rules/views.json checks)
 *   4. Compile styled JRXML to .jasper
 *   5. Generate PDF with real database data
 *   6. Run visual benchmark: legacy PDF vs. generated PDF
 *
 * Usage:
 *   node phase3-legacy-pdf-style.js <legacy.pdf> <source.jrxml> [outDir] [confidence-threshold] [jdbcUrl] [dbUser] [dbPassword] [--ocr]
 *
 * Defaults:
 *   outDir             output/phase3-legacy-style
 *   confidence-threshold  0.65
 *   jdbcUrl            jdbc:postgresql://172.30.64.1:5432/jasper-report-ai?sslmode=disable
 *   dbUser             postgres
 *   dbPassword         postgres
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DEFAULT_JDBC_URL = 'jdbc:postgresql://172.30.64.1:5432/jasper-report-ai?sslmode=disable';
const DEFAULT_DB_USER = 'postgres';
const DEFAULT_DB_PASS = 'postgres';

// ── helpers ───────────────────────────────────────────────────────────────────

function runNode(scriptPath, args) {
  const res = spawnSync('node', [scriptPath, ...args], {
    stdio: 'pipe',
    encoding: 'utf8',
    cwd: path.dirname(scriptPath)
  });

  if (res.status !== 0) {
    const stderr = (res.stderr || '').trim();
    const stdout = (res.stdout || '').trim();
    throw new Error(stderr || stdout || `Command failed with exit ${res.status}`);
  }

  return (res.stdout || '').trim();
}

function runJava(jarPath, javaArgs, cwd) {
  const res = spawnSync('java', ['-jar', jarPath, ...javaArgs], {
    stdio: 'pipe',
    encoding: 'utf8',
    cwd
  });

  if (res.status !== 0) {
    const stderr = (res.stderr || '').trim();
    const stdout = (res.stdout || '').trim();
    throw new Error(`Java command failed: ${stderr || stdout || `exit code ${res.status}`}`);
  }

  return (res.stdout || '').trim();
}

function ensureJar() {
  const runnerDir = path.resolve(__dirname, 'jasper-runner');
  const jarPath = path.join(runnerDir, 'target', 'jasper-runner.jar');

  const mvn = spawnSync('mvn', ['-q', '-DskipTests', 'package'], {
    cwd: runnerDir,
    stdio: 'pipe',
    encoding: 'utf8'
  });
  if (mvn.status !== 0) {
    throw new Error(`Maven build failed: ${(mvn.stderr || '').trim()}`);
  }
  if (!fs.existsSync(jarPath)) {
    throw new Error(`JAR not found after build: ${jarPath}`);
  }
  return jarPath;
}

// ── main ──────────────────────────────────────────────────────────────────────

function main() {
  const legacyPdfArg   = process.argv[2];
  const sourceJrxmlArg = process.argv[3];
  const outDirArg      = process.argv[4] || path.join('output', 'phase3-legacy-style');
  const thresholdArg   = process.argv[5] || '0.65';
  const jdbcUrl        = process.argv[6] || DEFAULT_JDBC_URL;
  const dbUser         = process.argv[7] || DEFAULT_DB_USER;
  const dbPass         = process.argv[8] || DEFAULT_DB_PASS;
  const enableOcr      = process.argv.includes('--ocr');

  if (!legacyPdfArg || !sourceJrxmlArg) {
    console.error(
      'Usage: node phase3-legacy-pdf-style.js <legacy.pdf> <source.jrxml> ' +
      '[outDir] [confidence-threshold] [jdbcUrl] [dbUser] [dbPassword] [--ocr]'
    );
    process.exit(1);
  }

  const workspaceRoot   = path.resolve(__dirname, '..');
  const legacyPdfPath   = path.resolve(legacyPdfArg);
  const sourceJrxmlPath = path.resolve(sourceJrxmlArg);

  if (!fs.existsSync(legacyPdfPath)) {
    throw new Error(`Legacy PDF not found: ${legacyPdfPath}`);
  }
  if (!fs.existsSync(sourceJrxmlPath)) {
    throw new Error(`Source JRXML not found: ${sourceJrxmlPath}`);
  }

  const outDir = path.resolve(outDirArg);
  fs.mkdirSync(outDir, { recursive: true });

  const reportName    = path.basename(sourceJrxmlPath, '.jrxml');
  const blueprintPath = path.join(outDir, 'style-blueprint.phase3.json');
  const styledJrxml   = path.join(outDir, `${reportName}.styled.phase3.jrxml`);
  const jasperPath    = path.join(outDir, `${reportName}.styled.phase3.jasper`);
  const pdfPath       = path.join(outDir, `${reportName}.styled.phase3.pdf`);
  const benchmarkDir  = path.join(outDir, 'benchmark');

  const extractScript   = path.join(workspaceRoot, 'scripts', 'extract-style-blueprint-phase3.js');
  const applyScript     = path.join(workspaceRoot, 'scripts', 'apply-style-blueprint-phase3.js');
  const validateScript  = path.join(workspaceRoot, 'scripts', 'validate.js');
  const benchmarkScript = path.join(workspaceRoot, 'scripts', 'visual-benchmark.js');

  // ── Step 1: Extract Phase 3 blueprint ──────────────────────────────────────
  console.log('\n── Step 1: Extract Phase 3 blueprint ──────────────────────────────');
  const extractArgs = [legacyPdfPath, blueprintPath];
  if (enableOcr) extractArgs.push('--ocr');
  const extractOut = runNode(extractScript, extractArgs);
  if (extractOut) console.log(extractOut);

  const blueprint  = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
  const confidence = blueprint?.confidence?.global;
  const pages      = blueprint?.document?.pagesAnalyzed;
  const groups     = Array.isArray(blueprint?.layout?.groups) ? blueprint.layout.groups.length : 0;
  const regions    = Array.isArray(blueprint?.imageRegions)   ? blueprint.imageRegions.length : 0;

  console.log(`OK Phase 3 blueprint: ${blueprintPath}`);
  console.log(`OK Pages analyzed: ${pages}`);
  console.log(`OK Groups detected: ${groups}`);
  console.log(`OK Global confidence: ${confidence}`);
  console.log(`OK Image regions detected: ${regions}`);

  // ── Step 2: Apply Phase 3 blueprint ────────────────────────────────────────
  console.log('\n── Step 2: Apply Phase 3 blueprint ────────────────────────────────');
  const applyOut = runNode(applyScript, [blueprintPath, sourceJrxmlPath, styledJrxml, thresholdArg]);
  if (applyOut) console.log(applyOut);
  console.log(`OK Phase 3 styled JRXML: ${styledJrxml}`);

  // ── Step 3: Validate styled JRXML ──────────────────────────────────────────
  console.log('\n── Step 3: Validate styled JRXML ──────────────────────────────────');
  const validateOut = runNode(validateScript, [styledJrxml]);
  if (validateOut) console.log(validateOut);

  // ── Step 4: Compile styled JRXML ───────────────────────────────────────────
  console.log('\n── Step 4: Compile styled JRXML ───────────────────────────────────');
  const jarPath = ensureJar();
  const compileOut = runJava(jarPath, ['compile', styledJrxml, jasperPath], outDir);
  if (compileOut) console.log(compileOut);
  if (!fs.existsSync(jasperPath)) {
    throw new Error(`Compiled .jasper not found: ${jasperPath}`);
  }
  const jasperSize = fs.statSync(jasperPath).size;
  console.log(`OK Compiled .jasper: ${jasperPath} (${jasperSize} bytes)`);

  // ── Step 5: Generate PDF with real data ────────────────────────────────────
  console.log('\n── Step 5: Generate PDF with real data ────────────────────────────');
  const pdfOut = runJava(
    jarPath,
    ['pdf-with-data', jasperPath, pdfPath, jdbcUrl, dbUser, dbPass],
    outDir
  );
  if (pdfOut) console.log(pdfOut);
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`Generated PDF not found: ${pdfPath}`);
  }
  const pdfSize = fs.statSync(pdfPath).size;
  if (pdfSize < 1024) {
    console.warn(`WARN PDF may be empty or near-empty (${pdfSize} bytes). Review filters and field types.`);
  }
  console.log(`OK Generated PDF: ${pdfPath} (${pdfSize} bytes)`);

  // ── Step 6: Visual benchmark ───────────────────────────────────────────────
  console.log('\n── Step 6: Visual benchmark (legacy vs. generated) ────────────────');
  try {
    const benchOut = runNode(benchmarkScript, [legacyPdfPath, pdfPath, benchmarkDir]);
    if (benchOut) console.log(benchOut);

    const reportPath = path.join(benchmarkDir, 'benchmark-report.json');
    if (fs.existsSync(reportPath)) {
      const benchReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      console.log(`OK Average similarity: ${benchReport.averageSimilarity}`);
      console.log(`OK Quality grade: ${benchReport.qualityGrade}`);
      console.log(`OK Comparable pages: ${benchReport.comparablePages}`);
    }
  } catch (benchErr) {
    // Non-fatal: benchmark failure should not block delivery.
    console.warn(`WARN Visual benchmark failed: ${benchErr.message}`);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n── Phase 3 complete ────────────────────────────────────────────────');
  console.log(`OK Blueprint:      ${blueprintPath}`);
  console.log(`OK Styled JRXML:   ${styledJrxml}`);
  console.log(`OK Jasper:         ${jasperPath}`);
  console.log(`OK PDF:            ${pdfPath}`);
  console.log(`OK Benchmark dir:  ${benchmarkDir}`);
}

try {
  main();
} catch (err) {
  console.error(`ERROR ${err.message}`);
  process.exit(1);
}
