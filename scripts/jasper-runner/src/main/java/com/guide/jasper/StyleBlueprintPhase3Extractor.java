package com.guide.jasper;

import java.awt.geom.Point2D;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import javax.imageio.ImageIO;

import org.apache.pdfbox.contentstream.PDFGraphicsStreamEngine;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.graphics.image.PDImage;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.util.Matrix;

/**
 * Phase 3 extractor: extends Phase 2 blueprint with OCR support (optional,
 * requires Tesseract in PATH) and image/rich-block region detection via
 * PDFGraphicsStreamEngine.
 */
final class StyleBlueprintPhase3Extractor {

    private StyleBlueprintPhase3Extractor() {
    }

    /**
     * Runs Phase 2 extraction as base, then enriches the resulting JSON with
     * image region data and OCR metadata at the root level.
     *
     * @param pdfPath         path to the legacy PDF
     * @param blueprintOutPath path where the Phase 3 blueprint JSON is written
     * @param enableOcr       true to attempt OCR when no text is extractable
     */
    static void extract(String pdfPath, String blueprintOutPath, boolean enableOcr) throws Exception {
        File pdf = new File(pdfPath);
        if (!pdf.exists()) {
            throw new IllegalArgumentException("PDF not found: " + pdfPath);
        }

        File outFile = new File(blueprintOutPath);
        File parent = outFile.getAbsoluteFile().getParentFile();
        if (parent != null && !parent.exists()) {
            parent.mkdirs();
        }

        // Step 1: Delegate to Phase 2 to produce the base blueprint.
        Path tempPath = Files.createTempFile("phase3-base-", ".json");
        try {
            StyleBlueprintPhase2Extractor.extract(pdfPath, tempPath.toString());
            String baseJson = Files.readString(tempPath, StandardCharsets.UTF_8).trim();

            // Step 2: Extract image / rich-block regions.
            List<Map<String, Object>> imageRegions = extractImageRegions(pdfPath);

            // Step 3: OCR metadata (run only when --ocr flag is set).
            Map<String, Object> ocrInfo = performOcr(pdfPath, enableOcr);

            // Step 4: Inject Phase 3 fields before the closing root brace.
            String imageRegionsJson = toJsonArray(imageRegions, 1);
            String ocrJson = toJsonObject(ocrInfo, 1);

            int lastBrace = baseJson.lastIndexOf('}');
            String enriched = baseJson.substring(0, lastBrace)
                + ",\n  \"imageRegions\": " + imageRegionsJson
                + ",\n  \"ocr\": " + ocrJson
                + "\n}";

            Files.writeString(Path.of(blueprintOutPath), enriched, StandardCharsets.UTF_8);
        } finally {
            Files.deleteIfExists(tempPath);
        }

        System.out.println("OK Extracted phase3 style blueprint: " + blueprintOutPath);
    }

    // -------------------------------------------------------------------------
    // Image region extraction via PDFGraphicsStreamEngine
    // -------------------------------------------------------------------------

    private static List<Map<String, Object>> extractImageRegions(String pdfPath) throws Exception {
        List<Map<String, Object>> all = new ArrayList<>();
        File pdf = new File(pdfPath);
        try (PDDocument doc = PDDocument.load(pdf)) {
            for (int i = 0; i < doc.getNumberOfPages(); i++) {
                PDPage page = doc.getPage(i);
                ImageLocator locator = new ImageLocator(page, i);
                try {
                    locator.processPage(page);
                } catch (Exception ignored) {
                    // Non-fatal: a page without drawable images may throw; continue.
                }
                all.addAll(locator.regions);
            }
        }
        return all;
    }

    /**
     * PDFGraphicsStreamEngine subclass that intercepts drawImage() calls and
     * converts the current transformation matrix to axis-aligned bounding boxes
     * in Jasper coordinate space (origin top-left, y increases downward).
     */
    private static class ImageLocator extends PDFGraphicsStreamEngine {

        final List<Map<String, Object>> regions = new ArrayList<>();
        final float pageHeight;
        final int pageIndex;

        ImageLocator(PDPage page, int pageIndex) throws IOException {
            super(page);
            this.pageHeight = page.getMediaBox().getHeight();
            this.pageIndex = pageIndex;
        }

        @Override
        public void drawImage(PDImage pdImage) throws IOException {
            Matrix ctm = getGraphicsState().getCurrentTransformationMatrix();
            // Extract affine components from the CTM.
            float a = ctm.getValue(0, 0); // scaleX
            float b = ctm.getValue(0, 1); // shearY
            float c = ctm.getValue(1, 0); // shearX
            float d = ctm.getValue(1, 1); // scaleY
            float e = ctm.getValue(2, 0); // translateX
            float f = ctm.getValue(2, 1); // translateY

            // Map the unit-square corners [0,0],[1,0],[0,1],[1,1] through the CTM.
            float[] xs = { e, a + e, c + e, a + c + e };
            float[] ys = { f, b + f, d + f, b + d + f };

            float minX = xs[0], maxX = xs[0];
            float minY = ys[0], maxY = ys[0];
            for (int i = 1; i < 4; i++) {
                if (xs[i] < minX) minX = xs[i];
                if (xs[i] > maxX) maxX = xs[i];
                if (ys[i] < minY) minY = ys[i];
                if (ys[i] > maxY) maxY = ys[i];
            }

            float w = maxX - minX;
            float h = maxY - minY;

            // Skip decorative micro-images (< 2pt in either dimension).
            if (w < 2f || h < 2f) return;

            // Convert PDF y (bottom-up) to Jasper y (top-down).
            float jasperY = pageHeight - maxY;

            Map<String, Object> region = new LinkedHashMap<>();
            region.put("pageIndex", pageIndex);
            region.put("xPt", round2(minX));
            region.put("yPt", round2(jasperY));
            region.put("widthPt", round2(w));
            region.put("heightPt", round2(h));
            region.put("type", pdImage.isStencil() ? "stencil" : "raster");
            region.put("nativeWidth", pdImage.getWidth());
            region.put("nativeHeight", pdImage.getHeight());
            regions.add(region);
        }

        // Required abstract methods — not needed for image detection.
        @Override public void appendRectangle(Point2D p0, Point2D p1, Point2D p2, Point2D p3) throws IOException {}
        @Override public void clip(int windingRule) throws IOException {}
        @Override public void moveTo(float x, float y) throws IOException {}
        @Override public void lineTo(float x, float y) throws IOException {}
        @Override public void curveTo(float x1, float y1, float x2, float y2, float x3, float y3) throws IOException {}
        @Override public Point2D getCurrentPoint() throws IOException { return new Point2D.Float(0, 0); }
        @Override public void closePath() throws IOException {}
        @Override public void endPath() throws IOException {}
        @Override public void strokePath() throws IOException {}
        @Override public void fillPath(int windingRule) throws IOException {}
        @Override public void fillAndStrokePath(int windingRule) throws IOException {}
        @Override public void shadingFill(COSName shadingName) throws IOException {}
    }

    // -------------------------------------------------------------------------
    // OCR — optional, requires Tesseract in PATH
    // -------------------------------------------------------------------------

    private static Map<String, Object> performOcr(String pdfPath, boolean enabled) {
        Map<String, Object> ocr = new LinkedHashMap<>();
        boolean tesseractAvailable = checkTesseract();

        if (!enabled) {
            ocr.put("available", tesseractAvailable);
            ocr.put("used", false);
            ocr.put("reason", "OCR not requested. Pass --ocr to extract-style-blueprint-phase3 to enable.");
            return ocr;
        }

        ocr.put("available", tesseractAvailable);
        if (!tesseractAvailable) {
            ocr.put("used", false);
            ocr.put("reason", "Tesseract not found in PATH. Install Tesseract OCR to enable.");
            return ocr;
        }

        // Tesseract is available — render pages to PNG and run OCR.
        try {
            File pdf = new File(pdfPath);
            int wordsExtracted = 0;
            int pagesAttempted = 0;

            try (PDDocument doc = PDDocument.load(pdf)) {
                PDFRenderer renderer = new PDFRenderer(doc);
                int limit = Math.min(doc.getNumberOfPages(), 5); // cap at 5 pages for performance

                for (int i = 0; i < limit; i++) {
                    BufferedImage img = renderer.renderImageWithDPI(i, 150);
                    Path tmpImg = Files.createTempFile("ocr-p" + i + "-", ".png");
                    try {
                        ImageIO.write(img, "PNG", tmpImg.toFile());
                        pagesAttempted++;

                        ProcessBuilder pb = new ProcessBuilder(
                            "tesseract", tmpImg.toString(), "stdout",
                            "--oem", "3", "--psm", "3");
                        pb.redirectErrorStream(true);
                        Process p = pb.start();
                        String text = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                        p.waitFor();

                        String[] words = text.trim().split("\\s+");
                        if (words.length > 0 && !words[0].isEmpty()) {
                            wordsExtracted += words.length;
                        }
                    } finally {
                        Files.deleteIfExists(tmpImg);
                    }
                }
            }

            ocr.put("used", true);
            ocr.put("pagesAttempted", pagesAttempted);
            ocr.put("wordsExtracted", wordsExtracted);
            ocr.put("reason", "OCR completed via Tesseract.");
        } catch (Exception ex) {
            ocr.put("used", false);
            ocr.put("reason", "OCR failed: " + ex.getMessage());
        }

        return ocr;
    }

    private static boolean checkTesseract() {
        try {
            ProcessBuilder pb = new ProcessBuilder("tesseract", "--version");
            pb.redirectErrorStream(true);
            Process p = pb.start();
            p.getInputStream().readAllBytes();
            return p.waitFor() == 0;
        } catch (Exception e) {
            return false;
        }
    }

    // -------------------------------------------------------------------------
    // JSON serialization helpers (self-contained, no external deps)
    // -------------------------------------------------------------------------

    private static float round2(float val) {
        return Math.round(val * 100f) / 100f;
    }

    private static String toJsonArray(List<Map<String, Object>> list, int depth) {
        if (list.isEmpty()) return "[]";
        String indent = "  ".repeat(depth);
        String itemIndent = "  ".repeat(depth + 1);
        StringBuilder sb = new StringBuilder("[\n");
        for (int i = 0; i < list.size(); i++) {
            sb.append(itemIndent).append(toJsonObject(list.get(i), depth + 1));
            if (i < list.size() - 1) sb.append(",");
            sb.append("\n");
        }
        sb.append(indent).append("]");
        return sb.toString();
    }

    private static String toJsonObject(Map<String, Object> map, int depth) {
        String indent = "  ".repeat(depth);
        String itemIndent = "  ".repeat(depth + 1);
        StringBuilder sb = new StringBuilder("{\n");
        int i = 0;
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            sb.append(itemIndent)
              .append("\"").append(escapeJson(entry.getKey())).append("\": ");
            Object val = entry.getValue();
            if (val instanceof String) {
                sb.append("\"").append(escapeJson((String) val)).append("\"");
            } else if (val instanceof Boolean || val instanceof Integer
                    || val instanceof Long || val instanceof Float
                    || val instanceof Double) {
                sb.append(val);
            } else if (val instanceof List) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> nested = (List<Map<String, Object>>) val;
                sb.append(toJsonArray(nested, depth + 1));
            } else if (val instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> nested = (Map<String, Object>) val;
                sb.append(toJsonObject(nested, depth + 1));
            } else {
                sb.append(val == null ? "null" : "\"" + escapeJson(String.valueOf(val)) + "\"");
            }
            if (i < map.size() - 1) sb.append(",");
            sb.append("\n");
            i++;
        }
        sb.append(indent).append("}");
        return sb.toString();
    }

    private static String escapeJson(String s) {
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
