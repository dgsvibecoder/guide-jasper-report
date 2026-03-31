#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

function toInt(value, fallback) {
  const n = Number(value);
  if (Number.isNaN(n)) return fallback;
  return Math.max(0, Math.round(n));
}

function ensureArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function applyFontToTextElements(elements, fontName, fontSize, isBold) {
  for (const el of elements) {
    const textElement = ensureArray(el.textElement)[0] || {};
    const font = ensureArray(textElement.font)[0] || {};
    font.$ = font.$ || {};
    if (fontName) font.$.fontName = fontName;
    if (fontSize != null) font.$.size = String(fontSize);
    if (isBold != null) font.$.isBold = String(!!isBold);
    textElement.font = [font];
    el.textElement = [textElement];
  }
}

function updateBandHeight(bandNode, height) {
  if (!bandNode || !bandNode[0]) return;
  bandNode[0].$ = bandNode[0].$ || {};
  bandNode[0].$.height = String(height);
}

async function main() {
  const blueprintArg = process.argv[2];
  const sourceJrxmlArg = process.argv[3];
  const outJrxmlArg = process.argv[4];

  if (!blueprintArg || !sourceJrxmlArg || !outJrxmlArg) {
    console.error('Usage: node apply-style-blueprint-phase1.js <style-blueprint.json> <source.jrxml> <out.jrxml>');
    process.exit(1);
  }

  const blueprintPath = path.resolve(blueprintArg);
  const sourceJrxmlPath = path.resolve(sourceJrxmlArg);
  const outJrxmlPath = path.resolve(outJrxmlArg);

  if (!fs.existsSync(blueprintPath)) {
    console.error(`ERROR Style blueprint not found: ${blueprintPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(sourceJrxmlPath)) {
    console.error(`ERROR Source JRXML not found: ${sourceJrxmlPath}`);
    process.exit(1);
  }

  const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
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

  const accentColor = blueprint.tokens?.colors?.accent || '#DCE6F1';

  const titleBandHeight = toInt(blueprint.tokens?.spacing?.bandHeightsPt?.title, 60);
  const headerBandHeight = toInt(blueprint.tokens?.spacing?.bandHeightsPt?.columnHeader, 24);
  const detailBandHeight = toInt(blueprint.tokens?.spacing?.bandHeightsPt?.detail, 20);
  const footerBandHeight = toInt(blueprint.tokens?.spacing?.bandHeightsPt?.pageFooter, 30);

  updateBandHeight(root.title?.[0]?.band, titleBandHeight);
  updateBandHeight(root.columnHeader?.[0]?.band, headerBandHeight);
  updateBandHeight(root.detail?.[0]?.band, detailBandHeight);
  updateBandHeight(root.pageFooter?.[0]?.band, footerBandHeight);

  const titleStaticTexts = ensureArray(root.title?.[0]?.band?.[0]?.staticText);
  applyFontToTextElements(titleStaticTexts, fallbackFont, titleSize, true);

  const titleTextFields = ensureArray(root.title?.[0]?.band?.[0]?.textField);
  applyFontToTextElements(titleTextFields, fallbackFont, Math.max(8, titleSize - 5), false);

  const headerStaticTexts = ensureArray(root.columnHeader?.[0]?.band?.[0]?.staticText);
  for (const el of headerStaticTexts) {
    el.reportElement = ensureArray(el.reportElement);
    if (!el.reportElement[0]) el.reportElement[0] = { $: {} };
    el.reportElement[0].$ = el.reportElement[0].$ || {};
    el.reportElement[0].$.mode = 'Opaque';
    el.reportElement[0].$.backcolor = accentColor;
  }
  applyFontToTextElements(headerStaticTexts, fallbackFont, headerSize, true);

  const detailTextFields = ensureArray(root.detail?.[0]?.band?.[0]?.textField);
  applyFontToTextElements(detailTextFields, fallbackFont, detailSize, false);

  const footerTextFields = ensureArray(root.pageFooter?.[0]?.band?.[0]?.textField);
  applyFontToTextElements(footerTextFields, fallbackFont, footerSize, false);

  const footerStaticTexts = ensureArray(root.pageFooter?.[0]?.band?.[0]?.staticText);
  applyFontToTextElements(footerStaticTexts, fallbackFont, footerSize, false);

  const builder = new xml2js.Builder({
    headless: false,
    renderOpts: { pretty: true, indent: '  ', newline: '\n' }
  });

  fs.mkdirSync(path.dirname(outJrxmlPath), { recursive: true });
  fs.writeFileSync(outJrxmlPath, builder.buildObject(doc), 'utf8');

  console.log(`OK Applied phase1 style blueprint to JRXML: ${outJrxmlPath}`);
}

main().catch((err) => {
  console.error(`ERROR ${err.message}`);
  process.exit(1);
});
