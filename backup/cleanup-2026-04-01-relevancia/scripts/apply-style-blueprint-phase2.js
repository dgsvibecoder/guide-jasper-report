#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

function toInt(value, fallback) {
  const n = Number(value);
  if (Number.isNaN(n)) return fallback;
  return Math.max(0, Math.round(n));
}

function toFloat(value, fallback) {
  const n = Number(value);
  if (Number.isNaN(n)) return fallback;
  return n;
}

function ensureArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function applyFontToTextElements(elements, fontName, fontSize, isBold, forecolor) {
  for (const el of elements) {
    const textElement = ensureArray(el.textElement)[0] || {};
    const font = ensureArray(textElement.font)[0] || {};
    font.$ = font.$ || {};

    if (fontName) font.$.fontName = fontName;
    if (fontSize != null) font.$.size = String(fontSize);
    if (isBold != null) font.$.isBold = String(!!isBold);

    textElement.font = [font];
    el.textElement = [textElement];

    el.reportElement = ensureArray(el.reportElement);
    if (!el.reportElement[0]) el.reportElement[0] = { $: {} };
    el.reportElement[0].$ = el.reportElement[0].$ || {};
    if (forecolor) el.reportElement[0].$.forecolor = forecolor;
  }
}

function updateBandHeight(bandNode, height) {
  if (!bandNode || !bandNode[0]) return;
  bandNode[0].$ = bandNode[0].$ || {};
  bandNode[0].$.height = String(height);
}

function getElementBottom(el) {
  const reportElement = ensureArray(el?.reportElement)[0];
  const attrs = reportElement?.$ || {};
  const y = toInt(attrs.y, 0);
  const h = toInt(attrs.height, 0);
  return y + h;
}

function computeMinBandHeight(bandObject) {
  if (!bandObject) return 0;

  const keys = ['staticText', 'textField', 'rectangle', 'line', 'image', 'frame'];
  let maxBottom = 0;

  for (const key of keys) {
    const elements = ensureArray(bandObject[key]);
    for (const el of elements) {
      maxBottom = Math.max(maxBottom, getElementBottom(el));
    }
  }

  return maxBottom > 0 ? maxBottom + 2 : 0;
}

function copyWithFallback(source, target, confidence, threshold, reason) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);

  const metadata = {
    fallbackApplied: true,
    reason,
    confidence,
    threshold,
    generatedAt: new Date().toISOString()
  };

  fs.writeFileSync(`${target}.fallback.json`, JSON.stringify(metadata, null, 2), 'utf8');
}

async function main() {
  const blueprintArg = process.argv[2];
  const sourceJrxmlArg = process.argv[3];
  const outJrxmlArg = process.argv[4];
  const thresholdArg = process.argv[5];

  if (!blueprintArg || !sourceJrxmlArg || !outJrxmlArg) {
    console.error('Usage: node apply-style-blueprint-phase2.js <style-blueprint.json> <source.jrxml> <out.jrxml> [confidence-threshold]');
    process.exit(1);
  }

  const blueprintPath = path.resolve(blueprintArg);
  const sourceJrxmlPath = path.resolve(sourceJrxmlArg);
  const outJrxmlPath = path.resolve(outJrxmlArg);
  const threshold = thresholdArg != null ? toFloat(thresholdArg, 0.65) : 0.65;

  if (!fs.existsSync(blueprintPath)) {
    console.error(`ERROR Style blueprint not found: ${blueprintPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(sourceJrxmlPath)) {
    console.error(`ERROR Source JRXML not found: ${sourceJrxmlPath}`);
    process.exit(1);
  }

  const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
  const confidence = toFloat(blueprint?.confidence?.global, 0);

  if (confidence < threshold) {
    copyWithFallback(
      sourceJrxmlPath,
      outJrxmlPath,
      confidence,
      threshold,
      'Global confidence below threshold; strict-default-template fallback triggered.'
    );
    console.log(`WARN Fallback applied due to low confidence (${confidence} < ${threshold}).`);
    console.log(`OK Copied source JRXML as fallback output: ${outJrxmlPath}`);
    return;
  }

  const xmlRaw = fs.readFileSync(sourceJrxmlPath, 'utf8');
  const parser = new xml2js.Parser({ explicitArray: true, trim: true });
  const doc = await parser.parseStringPromise(xmlRaw);

  const root = doc.jasperReport;
  if (!root) {
    throw new Error('Invalid JRXML: missing jasperReport root.');
  }

  const pageWidth = toInt(blueprint.document?.pageSize?.widthPt, 595);
  const pageHeight = toInt(blueprint.document?.pageSize?.heightPt, 842);
  const orientation = blueprint.document?.orientation === 'Landscape' ? 'Landscape' : 'Portrait';
  const leftMargin = toInt(blueprint.document?.marginsPt?.left, 40);
  const rightMargin = toInt(blueprint.document?.marginsPt?.right, 40);
  const topMargin = toInt(blueprint.document?.marginsPt?.top, 40);
  const bottomMargin = toInt(blueprint.document?.marginsPt?.bottom, 40);

  root.$ = root.$ || {};
  root.$.pageWidth = String(pageWidth);
  root.$.pageHeight = String(pageHeight);
  root.$.orientation = orientation;
  root.$.leftMargin = String(leftMargin);
  root.$.rightMargin = String(rightMargin);
  root.$.topMargin = String(topMargin);
  root.$.bottomMargin = String(bottomMargin);
  root.$.columnWidth = String(Math.max(100, pageWidth - leftMargin - rightMargin));

  const fallbackFont = blueprint.tokens?.font?.fallbackFamily || 'DejaVu Sans';
  const titleSize = toInt(blueprint.tokens?.font?.sizesByRole?.title, 15);
  const headerSize = toInt(blueprint.tokens?.font?.sizesByRole?.header, 10);
  const detailSize = toInt(blueprint.tokens?.font?.sizesByRole?.detail, 9);
  const footerSize = toInt(blueprint.tokens?.font?.sizesByRole?.footer, 8);

  const colorText = blueprint.tokens?.colors?.textPrimary || '#222222';
  const colorAccent = blueprint.tokens?.colors?.accent || '#DCE6F1';
  const colorZebraEven = blueprint.tokens?.colors?.zebraEven || '#F7F7F7';

  const titleBandHeightTarget = toInt(blueprint.tokens?.spacing?.bandHeightsPt?.title, 60);
  const headerBandHeightTarget = toInt(blueprint.tokens?.spacing?.bandHeightsPt?.columnHeader, 24);
  const detailBandHeightTarget = toInt(blueprint.tokens?.spacing?.bandHeightsPt?.detail, 20);
  const footerBandHeightTarget = toInt(blueprint.tokens?.spacing?.bandHeightsPt?.pageFooter, 30);

  const titleBandObj = root.title?.[0]?.band?.[0];
  const headerBandObj = root.columnHeader?.[0]?.band?.[0];
  const detailBandObj = root.detail?.[0]?.band?.[0];
  const footerBandObj = root.pageFooter?.[0]?.band?.[0];

  const titleBandHeight = Math.max(titleBandHeightTarget, computeMinBandHeight(titleBandObj));
  const headerBandHeight = Math.max(headerBandHeightTarget, computeMinBandHeight(headerBandObj));
  const detailBandHeight = Math.max(detailBandHeightTarget, computeMinBandHeight(detailBandObj));
  const footerBandHeight = Math.max(footerBandHeightTarget, computeMinBandHeight(footerBandObj));

  updateBandHeight(root.title?.[0]?.band, titleBandHeight);
  updateBandHeight(root.columnHeader?.[0]?.band, headerBandHeight);
  updateBandHeight(root.detail?.[0]?.band, detailBandHeight);
  updateBandHeight(root.pageFooter?.[0]?.band, footerBandHeight);

  const titleStaticTexts = ensureArray(root.title?.[0]?.band?.[0]?.staticText);
  applyFontToTextElements(titleStaticTexts, fallbackFont, titleSize, true, colorText);
  const titleTextFields = ensureArray(root.title?.[0]?.band?.[0]?.textField);
  applyFontToTextElements(titleTextFields, fallbackFont, Math.max(8, titleSize - 5), false, colorText);

  const headerStaticTexts = ensureArray(root.columnHeader?.[0]?.band?.[0]?.staticText);
  for (const el of headerStaticTexts) {
    el.reportElement = ensureArray(el.reportElement);
    if (!el.reportElement[0]) el.reportElement[0] = { $: {} };
    el.reportElement[0].$ = el.reportElement[0].$ || {};
    el.reportElement[0].$.mode = 'Opaque';
    el.reportElement[0].$.backcolor = colorAccent;
  }
  applyFontToTextElements(headerStaticTexts, fallbackFont, headerSize, true, colorText);

  const detailTextFields = ensureArray(root.detail?.[0]?.band?.[0]?.textField);
  applyFontToTextElements(detailTextFields, fallbackFont, detailSize, false, colorText);

  const detailBand = root.detail?.[0]?.band?.[0];
  if (detailBand) {
    detailBand.rectangle = ensureArray(detailBand.rectangle);
    if (!detailBand.rectangle[0]) {
      detailBand.rectangle[0] = { reportElement: [{ $: {} }] };
    }
    const rec = detailBand.rectangle[0];
    rec.reportElement = ensureArray(rec.reportElement);
    if (!rec.reportElement[0]) rec.reportElement[0] = { $: {} };
    rec.reportElement[0].$ = rec.reportElement[0].$ || {};
    rec.reportElement[0].$.x = rec.reportElement[0].$.x || '0';
    rec.reportElement[0].$.y = rec.reportElement[0].$.y || '0';
    rec.reportElement[0].$.width = rec.reportElement[0].$.width || root.$.columnWidth || '515';
    rec.reportElement[0].$.height = rec.reportElement[0].$.height || String(detailBandHeight);
    rec.reportElement[0].$.mode = 'Opaque';
    rec.reportElement[0].$.backcolor = colorZebraEven;
  }

  const footerTextFields = ensureArray(root.pageFooter?.[0]?.band?.[0]?.textField);
  applyFontToTextElements(footerTextFields, fallbackFont, footerSize, false, colorText);
  const footerStaticTexts = ensureArray(root.pageFooter?.[0]?.band?.[0]?.staticText);
  applyFontToTextElements(footerStaticTexts, fallbackFont, footerSize, false, colorText);

  const builder = new xml2js.Builder({
    headless: false,
    renderOpts: { pretty: true, indent: '  ', newline: '\n' }
  });

  fs.mkdirSync(path.dirname(outJrxmlPath), { recursive: true });
  fs.writeFileSync(outJrxmlPath, builder.buildObject(doc), 'utf8');

  const metadata = {
    fallbackApplied: false,
    confidence,
    threshold,
    groupsDetected: Array.isArray(blueprint?.layout?.groups) ? blueprint.layout.groups.length : 0,
    pagesAnalyzed: blueprint?.document?.pagesAnalyzed || null,
    generatedAt: new Date().toISOString()
  };
  fs.writeFileSync(`${outJrxmlPath}.phase2.json`, JSON.stringify(metadata, null, 2), 'utf8');

  console.log(`OK Applied phase2 style blueprint to JRXML: ${outJrxmlPath}`);
  console.log(`OK Confidence ${confidence} >= threshold ${threshold}; fallback not required.`);
}

main().catch((err) => {
  console.error(`ERROR ${err.message}`);
  process.exit(1);
});
