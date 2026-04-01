#!/usr/bin/env node

/**
 * apply-style-blueprint-phase3.js
 *
 * Applies a Phase 3 Style Blueprint to a source JRXML, producing a Phase 3
 * styled output. Builds on Phase 2 styling (page dimensions, fonts, colors,
 * band heights) and enriches the process with:
 *
 *   - Image region reporting: logs detected rich-content regions so the deploy
 *     team can manually place <image> elements in the appropriate bands.
 *   - OCR metadata reporting: logs word counts extracted by OCR (if available).
 *   - Extended metadata JSON including imageRegions and ocr fields.
 *
 * The output JRXML is identical in structure to the Phase 2 result; the Phase 3
 * value-add lives in the enriched metadata and console guidance.
 *
 * Usage:
 *   node apply-style-blueprint-phase3.js <phase3-blueprint.json> <source.jrxml> <out.jrxml> [confidence-threshold]
 */

'use strict';

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
    throw new Error(stderr || stdout || `exit code ${res.status}`);
  }

  return (res.stdout || '').trim();
}

function toFloat(value, fallback) {
  const n = Number(value);
  if (Number.isNaN(n)) return fallback;
  return n;
}

async function main() {
  const blueprintArg = process.argv[2];
  const sourceJrxmlArg = process.argv[3];
  const outJrxmlArg = process.argv[4];
  const thresholdArg = process.argv[5];

  if (!blueprintArg || !sourceJrxmlArg || !outJrxmlArg) {
    console.error('Usage: node apply-style-blueprint-phase3.js <phase3-blueprint.json> <source.jrxml> <out.jrxml> [confidence-threshold]');
    process.exit(1);
  }

  const blueprintPath = path.resolve(blueprintArg);
  const sourceJrxmlPath = path.resolve(sourceJrxmlArg);
  const outJrxmlPath = path.resolve(outJrxmlArg);
  const threshold = thresholdArg != null ? toFloat(thresholdArg, 0.65) : 0.65;

  if (!fs.existsSync(blueprintPath)) {
    console.error(`ERROR Phase 3 blueprint not found: ${blueprintPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(sourceJrxmlPath)) {
    console.error(`ERROR Source JRXML not found: ${sourceJrxmlPath}`);
    process.exit(1);
  }

  const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
  const confidence = toFloat(blueprint?.confidence?.global, 0);

  // ── Phase 2 apply ──────────────────────────────────────────────────────────
  // Delegate all visual-style application to the Phase 2 apply script.
  // Pass the Phase 3 blueprint directly — it is a strict superset of Phase 2
  // and is fully compatible with the Phase 2 apply script.
  const phase2ApplyScript = path.join(__dirname, 'apply-style-blueprint-phase2.js');
  const phase2Out = runNode(phase2ApplyScript, [
    blueprintPath,
    sourceJrxmlPath,
    outJrxmlPath,
    String(threshold)
  ]);
  // Echo Phase 2 apply output for full traceability.
  if (phase2Out) console.log(phase2Out);

  // Determine if fallback was triggered by Phase 2 apply.
  const fallbackApplied = confidence < threshold;

  // ── Phase 3: image region reporting ───────────────────────────────────────
  const imageRegions = Array.isArray(blueprint?.imageRegions) ? blueprint.imageRegions : [];
  if (imageRegions.length > 0) {
    console.log(`INFO ${imageRegions.length} image region(s) detected in legacy PDF:`);
    for (const r of imageRegions) {
      console.log(
        `  Page ${r.pageIndex}: type=${r.type} x=${r.xPt}pt y=${r.yPt}pt` +
        ` w=${r.widthPt}pt h=${r.heightPt}pt (native ${r.nativeWidth}×${r.nativeHeight}px)`
      );
    }
    console.log('INFO To include rich content, add <image> elements at the above coordinates in the styled JRXML.');
  } else {
    console.log('INFO No embedded image regions detected in legacy PDF.');
  }

  // ── Phase 3: OCR metadata reporting ───────────────────────────────────────
  const ocr = blueprint?.ocr || {};
  if (ocr.used === true) {
    console.log(`INFO OCR completed: ${ocr.wordsExtracted} word(s) extracted from ${ocr.pagesAttempted} page(s).`);
  } else if (ocr.available === false) {
    console.log(`INFO OCR not available: ${ocr.reason || 'Tesseract not found.'}`);
  } else {
    console.log(`INFO OCR not used: ${ocr.reason || 'Pass --ocr to enable.'}`);
  }

  // ── Phase 3: enriched metadata JSON ───────────────────────────────────────
  const metaPath = `${outJrxmlPath}.phase3.json`;
  const meta = {
    generatedAt: new Date().toISOString(),
    sourceJrxml: sourceJrxmlPath,
    outputJrxml: outJrxmlPath,
    blueprintPath,
    confidence,
    threshold,
    fallbackApplied,
    pagesAnalyzed: blueprint?.document?.pagesAnalyzed ?? null,
    groupsDetected: Array.isArray(blueprint?.layout?.groups) ? blueprint.layout.groups.length : 0,
    imageRegionsDetected: imageRegions.length,
    ocrUsed: ocr.used === true,
    ocrAvailable: ocr.available === true,
    ocrWordsExtracted: ocr.wordsExtracted ?? null
  };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

  console.log(`OK Phase 3 apply complete. Metadata: ${metaPath}`);
}

main().catch(err => {
  console.error(`ERROR ${err.message}`);
  process.exit(1);
});
