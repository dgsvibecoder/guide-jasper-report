#!/usr/bin/env node

/**
 * visual-benchmark.js
 *
 * Runs a pixel-level visual similarity benchmark between a legacy (reference)
 * PDF and a generated (new) PDF. For each comparable page pair it:
 *
 *   1. Renders both pages to images at 72 DPI using PDFBox.
 *   2. Normalises image dimensions (resizes generated to match legacy).
 *   3. Computes per-pixel similarity (channels within ±30 threshold).
 *   4. Saves a diff PNG (white = matching, red = differing).
 *   5. Writes a benchmark-report.json with scores and quality grade.
 *
 * Quality grades:  A ≥ 90%  |  B ≥ 75%  |  C ≥ 60%  |  D ≥ 45%  |  F < 45%
 *
 * Usage:
 *   node visual-benchmark.js <legacy.pdf> <generated.pdf> [outDir]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function runCommand(command, args, cwd) {
  const res = spawnSync(command, args, {
    cwd: cwd || process.cwd(),
    stdio: 'pipe',
    encoding: 'utf8'
  });

  if (res.status !== 0) {
    const stderr = (res.stderr || '').trim();
    const stdout = (res.stdout || '').trim();
    throw new Error(`${command} failed: ${stderr || stdout || `exit code ${res.status}`}`);
  }

  return (res.stdout || '').trim();
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

function main() {
  const legacyPdfArg = process.argv[2];
  const generatedPdfArg = process.argv[3];
  const outDirArg = process.argv[4] || path.join('output', 'benchmark');

  if (!legacyPdfArg || !generatedPdfArg) {
    console.error('Usage: node visual-benchmark.js <legacy.pdf> <generated.pdf> [outDir]');
    process.exit(1);
  }

  const legacyPdfPath = path.resolve(legacyPdfArg);
  const generatedPdfPath = path.resolve(generatedPdfArg);
  const outDir = path.resolve(outDirArg);

  if (!fs.existsSync(legacyPdfPath)) {
    console.error(`ERROR Legacy PDF not found: ${legacyPdfPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(generatedPdfPath)) {
    console.error(`ERROR Generated PDF not found: ${generatedPdfPath}`);
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  const jarPath = ensureJavaRunnerBuilt();

  runCommand(
    'java',
    ['-jar', jarPath, 'visual-benchmark', legacyPdfPath, generatedPdfPath, outDir],
    outDir
  );

  const reportPath = path.join(outDir, 'benchmark-report.json');
  if (!fs.existsSync(reportPath)) {
    console.error(`ERROR Benchmark report not found: ${reportPath}`);
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const pages = Array.isArray(report.pages) ? report.pages : [];

  console.log(`OK Benchmark report: ${reportPath}`);
  console.log(`OK Legacy pages: ${report.legacyPageCount} | Generated pages: ${report.generatedPageCount}`);
  console.log(`OK Comparable pages: ${report.comparablePages}`);
  console.log(`OK Average similarity: ${report.averageSimilarity}`);
  console.log(`OK Quality grade: ${report.qualityGrade}`);

  for (const p of pages) {
    console.log(`   Page ${p.pageIndex + 1}: similarity=${p.similarity} diff=${p.diffImage}`);
  }
}

try {
  main();
} catch (err) {
  console.error(`ERROR ${err.message}`);
  process.exit(1);
}
