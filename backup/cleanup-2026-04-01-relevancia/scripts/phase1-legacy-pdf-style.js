#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

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

function validatePdfPath(inputPath) {
  const resolved = path.resolve(inputPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Legacy PDF not found: ${resolved}`);
  }
  return resolved;
}

function main() {
  const legacyPdfArg = process.argv[2];
  const sourceJrxmlArg = process.argv[3];
  const outDirArg = process.argv[4] || path.join('output', 'phase1-legacy-style');

  if (!legacyPdfArg || !sourceJrxmlArg) {
    console.error('Usage: node phase1-legacy-pdf-style.js <legacy.pdf> <source.jrxml> [outDir]');
    process.exit(1);
  }

  const workspaceRoot = path.resolve(__dirname, '..');
  const legacyPdfPath = validatePdfPath(legacyPdfArg);
  const sourceJrxmlPath = path.resolve(sourceJrxmlArg);
  if (!fs.existsSync(sourceJrxmlPath)) {
    throw new Error(`Source JRXML not found: ${sourceJrxmlPath}`);
  }

  const outDir = path.resolve(outDirArg);
  fs.mkdirSync(outDir, { recursive: true });

  const blueprintPath = path.join(outDir, 'style-blueprint.phase1.json');
  const styledJrxmlPath = path.join(outDir, `${path.basename(sourceJrxmlPath, '.jrxml')}.styled.phase1.jrxml`);

  const extractScript = path.join(workspaceRoot, 'scripts', 'extract-style-blueprint-phase1.js');
  const applyScript = path.join(workspaceRoot, 'scripts', 'apply-style-blueprint-phase1.js');

  runNode(extractScript, [legacyPdfPath, blueprintPath]);
  runNode(applyScript, [blueprintPath, sourceJrxmlPath, styledJrxmlPath]);

  console.log(`OK Phase 1 blueprint: ${blueprintPath}`);
  console.log(`OK Phase 1 styled JRXML: ${styledJrxmlPath}`);
  console.log('OK Parsing/analyze used first page only.');
}

try {
  main();
} catch (err) {
  console.error(`ERROR ${err.message}`);
  process.exit(1);
}
