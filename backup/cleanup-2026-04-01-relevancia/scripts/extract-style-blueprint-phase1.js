#!/usr/bin/env node

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

function normalizeInputPath(inputPath) {
  const raw = String(inputPath || '').trim();
  if (!raw) {
    throw new Error('Legacy PDF path is required.');
  }
  return path.resolve(raw);
}

function main() {
  const legacyPdfArg = process.argv[2];
  const outArg = process.argv[3];

  if (!legacyPdfArg || !outArg) {
    console.error('Usage: node extract-style-blueprint-phase1.js <legacy.pdf> <style-blueprint.json>');
    process.exit(1);
  }

  const legacyPdfPath = normalizeInputPath(legacyPdfArg);
  const blueprintOutPath = path.resolve(outArg);

  if (!fs.existsSync(legacyPdfPath)) {
    console.error(`ERROR Legacy PDF not found: ${legacyPdfPath}`);
    process.exit(1);
  }

  const jarPath = ensureJavaRunnerBuilt();
  runCommand('java', ['-jar', jarPath, 'extract-style-blueprint-phase1', legacyPdfPath, blueprintOutPath], path.dirname(blueprintOutPath));

  if (!fs.existsSync(blueprintOutPath)) {
    console.error(`ERROR Blueprint was not generated: ${blueprintOutPath}`);
    process.exit(1);
  }

  console.log(`OK Generated style blueprint: ${blueprintOutPath}`);
  console.log('OK Parser executed only first PDF page (phase 1 rule).');
}

try {
  main();
} catch (err) {
  console.error(`ERROR ${err.message}`);
  process.exit(1);
}
