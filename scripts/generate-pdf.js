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

const jasperArg = process.argv[2];

if (!jasperArg) {
  console.error('Usage: node generate-pdf.js <report.jasper>');
  process.exit(1);
}

const jasperPath = path.resolve(jasperArg);
if (!fs.existsSync(jasperPath)) {
  console.error(`ERROR Jasper file not found: ${jasperPath}`);
  process.exit(1);
}

try {
  const pdfPath = jasperPath.replace(/\.jasper$/i, '.pdf');
  const runnerJar = ensureJavaRunnerBuilt();
  runCommand('java', ['-jar', runnerJar, 'pdf-from-jasper', jasperPath, pdfPath], path.dirname(jasperPath));
  console.log(`OK Generated ${pdfPath}`);
} catch (err) {
  console.error(`ERROR ${err.message}`);
  process.exit(1);
}
