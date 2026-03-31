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

function main() {
  const legacyPdfArg = process.argv[2];
  const sourceJrxmlArg = process.argv[3];
  const outDirArg = process.argv[4] || path.join('output', 'phase2-legacy-style');
  const thresholdArg = process.argv[5] || '0.65';

  if (!legacyPdfArg || !sourceJrxmlArg) {
    console.error('Usage: node phase2-legacy-pdf-style.js <legacy.pdf> <source.jrxml> [outDir] [confidence-threshold]');
    process.exit(1);
  }

  const workspaceRoot = path.resolve(__dirname, '..');
  const legacyPdfPath = path.resolve(legacyPdfArg);
  const sourceJrxmlPath = path.resolve(sourceJrxmlArg);

  if (!fs.existsSync(legacyPdfPath)) {
    throw new Error(`Legacy PDF not found: ${legacyPdfPath}`);
  }
  if (!fs.existsSync(sourceJrxmlPath)) {
    throw new Error(`Source JRXML not found: ${sourceJrxmlPath}`);
  }

  const outDir = path.resolve(outDirArg);
  fs.mkdirSync(outDir, { recursive: true });

  const blueprintPath = path.join(outDir, 'style-blueprint.phase2.json');
  const styledJrxmlPath = path.join(outDir, `${path.basename(sourceJrxmlPath, '.jrxml')}.styled.phase2.jrxml`);

  const extractScript = path.join(workspaceRoot, 'scripts', 'extract-style-blueprint-phase2.js');
  const applyScript = path.join(workspaceRoot, 'scripts', 'apply-style-blueprint-phase2.js');

  runNode(extractScript, [legacyPdfPath, blueprintPath]);
  runNode(applyScript, [blueprintPath, sourceJrxmlPath, styledJrxmlPath, thresholdArg]);

  const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
  const confidence = blueprint?.confidence?.global;
  const pages = blueprint?.document?.pagesAnalyzed;
  const groups = Array.isArray(blueprint?.layout?.groups) ? blueprint.layout.groups.length : 0;

  console.log(`OK Phase 2 blueprint: ${blueprintPath}`);
  console.log(`OK Phase 2 styled JRXML: ${styledJrxmlPath}`);
  console.log(`OK Pages analyzed: ${pages}`);
  console.log(`OK Groups detected: ${groups}`);
  console.log(`OK Global confidence: ${confidence}`);
}

try {
  main();
} catch (err) {
  console.error(`ERROR ${err.message}`);
  process.exit(1);
}
