#!/usr/bin/env node

/**
 * extract-style-blueprint-phase3.js
 *
 * Extracts a Phase 3 Style Blueprint from a legacy PDF.
 * Phase 3 = Phase 2 base (multi-page, groups, colors, confidence)
 *          + image/rich-block region detection (all pages)
 *          + OCR metadata (optional, --ocr flag, requires Tesseract in PATH)
 *
 * Usage:
 *   node extract-style-blueprint-phase3.js <legacy.pdf> <style-blueprint.json> [--ocr]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

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
  const outArg = process.argv[3];
  const enableOcr = process.argv.includes('--ocr');

  if (!legacyPdfArg || !outArg) {
    console.error('Usage: node extract-style-blueprint-phase3.js <legacy.pdf> <style-blueprint.json> [--ocr]');
    process.exit(1);
  }

  const legacyPdfPath = path.resolve(legacyPdfArg);
  const blueprintOutPath = path.resolve(outArg);

  if (!fs.existsSync(legacyPdfPath)) {
    console.error(`ERROR Legacy PDF not found: ${legacyPdfPath}`);
    process.exit(1);
  }

  const jarPath = ensureJavaRunnerBuilt();

  const javaArgs = [
    '-jar', jarPath,
    'extract-style-blueprint-phase3',
    legacyPdfPath,
    blueprintOutPath
  ];
  if (enableOcr) javaArgs.push('--ocr');

  runCommand('java', javaArgs, path.dirname(blueprintOutPath));

  if (!fs.existsSync(blueprintOutPath)) {
    console.error(`ERROR Blueprint was not generated: ${blueprintOutPath}`);
    process.exit(1);
  }

  const blueprint = JSON.parse(fs.readFileSync(blueprintOutPath, 'utf8'));
  const analyzed = blueprint?.document?.pagesAnalyzed;
  const confidence = blueprint?.confidence?.global;
  const regions = Array.isArray(blueprint?.imageRegions) ? blueprint.imageRegions.length : 0;
  const ocrUsed = blueprint?.ocr?.used;
  const ocrAvailable = blueprint?.ocr?.available;

  console.log(`OK Generated phase3 style blueprint: ${blueprintOutPath}`);
  console.log(`OK Pages analyzed: ${analyzed}`);
  console.log(`OK Global confidence: ${confidence}`);
  console.log(`OK Image regions detected: ${regions}`);
  console.log(`OK OCR available: ${ocrAvailable} | OCR used: ${ocrUsed}`);
  if (!ocrAvailable && enableOcr) {
    console.log('WARN Tesseract not found in PATH. Install Tesseract OCR to enable text extraction from image-only PDFs.');
  }
}

try {
  main();
} catch (err) {
  console.error(`ERROR ${err.message}`);
  process.exit(1);
}
