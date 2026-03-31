package com.guide.jasper;

import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.image.BufferedImage;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import javax.imageio.ImageIO;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;

/**
 * Phase 3 visual benchmark: renders both the legacy PDF and the generated PDF
 * to raster images and computes per-page pixel similarity. Produces a diff PNG
 * for each page pair and a summary benchmark-report.json.
 *
 * <p>The similarity metric is the percentage of pixels whose R, G and B
 * channels all fall within {@code PIXEL_THRESHOLD} of each other. This is a
 * practical structural similarity indicator suitable for layout comparison.
 */
final class VisualBenchmark {

    /** Per-channel tolerance for pixels to be considered "matching". */
    private static final int PIXEL_THRESHOLD = 30;

    /** Render resolution in DPI (72 = screen-resolution for fast comparison). */
    private static final int RENDER_DPI = 72;

    private VisualBenchmark() {
    }

    /**
     * Runs the visual benchmark.
     *
     * @param legacyPdfPath    path to the reference (legacy) PDF
     * @param generatedPdfPath path to the generated (new) PDF
     * @param outDir           directory where diff images and the report are written
     */
    static void run(String legacyPdfPath, String generatedPdfPath, String outDir) throws Exception {
        File legacyFile = new File(legacyPdfPath);
        File generatedFile = new File(generatedPdfPath);

        if (!legacyFile.exists()) {
            throw new IllegalArgumentException("Legacy PDF not found: " + legacyPdfPath);
        }
        if (!generatedFile.exists()) {
            throw new IllegalArgumentException("Generated PDF not found: " + generatedPdfPath);
        }

        File outDirFile = new File(outDir);
        outDirFile.mkdirs();

        try (PDDocument legacyDoc = PDDocument.load(legacyFile);
             PDDocument generatedDoc = PDDocument.load(generatedFile)) {

            PDFRenderer legacyRenderer = new PDFRenderer(legacyDoc);
            PDFRenderer generatedRenderer = new PDFRenderer(generatedDoc);

            int comparablePages = Math.min(
                legacyDoc.getNumberOfPages(),
                generatedDoc.getNumberOfPages()
            );

            List<Map<String, Object>> pageResults = new ArrayList<>();
            double totalSimilarity = 0.0;

            for (int i = 0; i < comparablePages; i++) {
                BufferedImage legacyImg = legacyRenderer.renderImageWithDPI(i, RENDER_DPI);
                BufferedImage genImg = generatedRenderer.renderImageWithDPI(i, RENDER_DPI);

                // Normalise dimensions so comparison is pixel-aligned.
                if (legacyImg.getWidth() != genImg.getWidth()
                        || legacyImg.getHeight() != genImg.getHeight()) {
                    genImg = resizeImage(genImg, legacyImg.getWidth(), legacyImg.getHeight());
                }

                int w = legacyImg.getWidth();
                int h = legacyImg.getHeight();
                int total = w * h;
                int matching = 0;

                BufferedImage diffImg = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);

                for (int y = 0; y < h; y++) {
                    for (int x = 0; x < w; x++) {
                        int rgb1 = legacyImg.getRGB(x, y);
                        int rgb2 = genImg.getRGB(x, y);
                        if (pixelsMatch(rgb1, rgb2)) {
                            matching++;
                            diffImg.setRGB(x, y, 0xFFFFFF); // white = same
                        } else {
                            diffImg.setRGB(x, y, 0xFF4444); // red = different
                        }
                    }
                }

                double similarity = total > 0 ? (double) matching / total : 0.0;
                totalSimilarity += similarity;

                String diffName = String.format("diff-page-%03d.png", i + 1);
                ImageIO.write(diffImg, "PNG", new File(outDir, diffName));

                Map<String, Object> pageResult = new LinkedHashMap<>();
                pageResult.put("pageIndex", i);
                pageResult.put("similarity", round4((float) similarity));
                pageResult.put("matchingPixels", matching);
                pageResult.put("totalPixels", total);
                pageResult.put("diffImage", diffName);
                pageResults.add(pageResult);
            }

            double avgSimilarity = comparablePages > 0 ? totalSimilarity / comparablePages : 0.0;
            String grade = qualityGrade(avgSimilarity);

            Map<String, Object> report = new LinkedHashMap<>();
            report.put("generatedAt", Instant.now().toString());
            report.put("legacyPdf", legacyFile.getAbsolutePath().replace('\\', '/'));
            report.put("generatedPdf", generatedFile.getAbsolutePath().replace('\\', '/'));
            report.put("legacyPageCount", legacyDoc.getNumberOfPages());
            report.put("generatedPageCount", generatedDoc.getNumberOfPages());
            report.put("comparablePages", comparablePages);
            report.put("renderDpi", RENDER_DPI);
            report.put("pixelThreshold", PIXEL_THRESHOLD);
            report.put("averageSimilarity", round4((float) avgSimilarity));
            report.put("qualityGrade", grade);
            report.put("pages", pageResults);

            Files.writeString(
                Path.of(outDir, "benchmark-report.json"),
                toJson(report, 0),
                StandardCharsets.UTF_8
            );
        }

        System.out.println("OK Visual benchmark complete: " + outDir);
        System.out.printf("OK Benchmark report: %s/benchmark-report.json%n", outDir);
    }

    // -------------------------------------------------------------------------
    // Image utilities
    // -------------------------------------------------------------------------

    private static boolean pixelsMatch(int rgb1, int rgb2) {
        int r1 = (rgb1 >> 16) & 0xFF, g1 = (rgb1 >> 8) & 0xFF, b1 = rgb1 & 0xFF;
        int r2 = (rgb2 >> 16) & 0xFF, g2 = (rgb2 >> 8) & 0xFF, b2 = rgb2 & 0xFF;
        return Math.abs(r1 - r2) <= PIXEL_THRESHOLD
            && Math.abs(g1 - g2) <= PIXEL_THRESHOLD
            && Math.abs(b1 - b2) <= PIXEL_THRESHOLD;
    }

    private static BufferedImage resizeImage(BufferedImage src, int w, int h) {
        Image scaled = src.getScaledInstance(w, h, Image.SCALE_SMOOTH);
        BufferedImage result = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = result.createGraphics();
        g.drawImage(scaled, 0, 0, null);
        g.dispose();
        return result;
    }

    private static String qualityGrade(double similarity) {
        if (similarity >= 0.90) return "A";
        if (similarity >= 0.75) return "B";
        if (similarity >= 0.60) return "C";
        if (similarity >= 0.45) return "D";
        return "F";
    }

    // -------------------------------------------------------------------------
    // JSON serialization (self-contained)
    // -------------------------------------------------------------------------

    private static float round4(float val) {
        return Math.round(val * 10000f) / 10000f;
    }

    private static String toJson(Map<String, Object> map, int depth) {
        String indent = "  ".repeat(depth);
        String itemIndent = "  ".repeat(depth + 1);
        StringBuilder sb = new StringBuilder("{\n");
        int i = 0;
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            sb.append(itemIndent)
              .append("\"").append(entry.getKey()).append("\": ");
            Object val = entry.getValue();
            if (val instanceof String) {
                sb.append("\"").append(escapeJson((String) val)).append("\"");
            } else if (val instanceof Boolean || val instanceof Integer
                    || val instanceof Long || val instanceof Double
                    || val instanceof Float) {
                sb.append(val);
            } else if (val instanceof List) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> list = (List<Map<String, Object>>) val;
                if (list.isEmpty()) {
                    sb.append("[]");
                } else {
                    sb.append("[\n");
                    for (int j = 0; j < list.size(); j++) {
                        sb.append("  ".repeat(depth + 2))
                          .append(toJson(list.get(j), depth + 2));
                        if (j < list.size() - 1) sb.append(",");
                        sb.append("\n");
                    }
                    sb.append(itemIndent).append("]");
                }
            } else if (val instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> nested = (Map<String, Object>) val;
                sb.append(toJson(nested, depth + 1));
            } else {
                sb.append(val == null ? "null"
                    : "\"" + escapeJson(String.valueOf(val)) + "\"");
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
