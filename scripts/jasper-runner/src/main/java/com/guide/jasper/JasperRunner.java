package com.guide.jasper;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;

import net.sf.jasperreports.engine.JREmptyDataSource;
import net.sf.jasperreports.engine.JRException;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperExportManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.util.JRLoader;

public class JasperRunner {

    public static void main(String[] args) throws Exception {
        if (args.length < 1) {
            usage();
            System.exit(1);
        }

        // Avoid hard failures on missing fonts in minimal environments.
        System.setProperty("net.sf.jasperreports.awt.ignore.missing.font", "true");
        // Prefer JDK javac compiler over JDT for better compatibility on newer JDKs.
        System.setProperty("net.sf.jasperreports.compiler.class", "net.sf.jasperreports.engine.design.JRJavacCompiler");

        String command = args[0];
        switch (command) {
            case "compile":
                requireArgs(args, 3);
                compile(args[1], args[2]);
                break;
            case "pdf":
                requireArgs(args, 3);
                exportPdfFromJrxml(args[1], args[2]);
                break;
            case "pdf-from-jasper":
                requireArgs(args, 3);
                exportPdfFromJasper(args[1], args[2]);
                break;
            case "pdf-with-data":
                requireArgs(args, 6);
                exportPdfWithData(args[1], args[2], args[3], args[4], args[5]);
                break;
            case "extract-style-blueprint-phase1":
                requireArgs(args, 3);
                extractStyleBlueprintPhase1(args[1], args[2]);
                break;
            case "extract-style-blueprint-phase2":
                requireArgs(args, 3);
                StyleBlueprintPhase2Extractor.extract(args[1], args[2]);
                break;
            case "extract-style-blueprint-phase3": {
                requireArgs(args, 3);
                boolean enableOcr = args.length > 3 && "--ocr".equals(args[3]);
                StyleBlueprintPhase3Extractor.extract(args[1], args[2], enableOcr);
                break;
            }
            case "visual-benchmark":
                requireArgs(args, 4);
                VisualBenchmark.run(args[1], args[2], args[3]);
                break;
            default:
                usage();
                System.exit(1);
        }
    }

    private static class Token {
        String text;
        float x;
        float y;
        float width;
        float height;
        float fontSize;

        Token(String text, float x, float y, float width, float height, float fontSize) {
            this.text = text;
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.fontSize = fontSize;
        }
    }

    private static class Line {
        List<Token> tokens = new ArrayList<>();
        float yMin = Float.MAX_VALUE;
        float yMax = Float.MIN_VALUE;
        float avgFontSize = 0;

        void add(Token t) {
            tokens.add(t);
            yMin = Math.min(yMin, t.y);
            yMax = Math.max(yMax, t.y + t.height);
        }

        void finish() {
            tokens.sort(Comparator.comparingDouble(a -> a.x));
            float sum = 0;
            for (Token t : tokens) {
                sum += t.fontSize;
            }
            avgFontSize = tokens.isEmpty() ? 0 : sum / tokens.size();
        }

        String joinedText() {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < tokens.size(); i++) {
                if (i > 0) sb.append(" ");
                sb.append(tokens.get(i).text);
            }
            return sb.toString().trim();
        }
    }

    private static class FirstPageTextStripper extends PDFTextStripper {
        List<Token> tokens = new ArrayList<>();

        FirstPageTextStripper() throws IOException {
            super();
            setStartPage(1);
            setEndPage(1);
            setSortByPosition(true);
        }

        @Override
        protected void writeString(String text, List<TextPosition> textPositions) throws IOException {
            for (TextPosition tp : textPositions) {
                String unicode = tp.getUnicode();
                if (unicode == null) continue;
                String trimmed = unicode.trim();
                if (trimmed.isEmpty()) continue;
                tokens.add(new Token(
                    trimmed,
                    tp.getXDirAdj(),
                    tp.getYDirAdj(),
                    tp.getWidthDirAdj(),
                    tp.getHeightDir(),
                    tp.getFontSizeInPt()
                ));
            }
        }
    }

    private static void extractStyleBlueprintPhase1(String pdfPath, String blueprintOutPath) throws Exception {
        File pdf = new File(pdfPath);
        if (!pdf.exists()) {
            throw new IllegalArgumentException("PDF not found: " + pdfPath);
        }

        ensureParentDir(blueprintOutPath);

        try (PDDocument document = PDDocument.load(pdf)) {
            if (document.getNumberOfPages() < 1) {
                throw new IllegalArgumentException("PDF has no pages: " + pdfPath);
            }

            PDPage page = document.getPage(0);
            PDRectangle box = page.getMediaBox();
            float pageWidth = box.getWidth();
            float pageHeight = box.getHeight();

            FirstPageTextStripper stripper = new FirstPageTextStripper();
            stripper.getText(document);
            List<Token> tokens = stripper.tokens;
            if (tokens.isEmpty()) {
                throw new IllegalStateException("No extractable text found on first page. OCR is out of scope for phase 1.");
            }

            List<Line> lines = clusterLines(tokens, 3.5f);
            Segments segments = inferSegments(lines, pageHeight);
            List<Map<String, Object>> gridColumns = inferGridColumns(segments, pageWidth);

            Map<String, Object> blueprint = buildBlueprint(pdf, pageWidth, pageHeight, document.getNumberOfPages(), lines, segments, gridColumns);

            Files.writeString(Path.of(blueprintOutPath), toJson(blueprint, 0), StandardCharsets.UTF_8);
        }

        System.out.println("OK Extracted phase1 style blueprint: " + blueprintOutPath);
    }

    private static class Segments {
        Line title;
        Line columnHeader;
        List<Line> detailLines;
        Line pageFooter;

        Segments(Line title, Line columnHeader, List<Line> detailLines, Line pageFooter) {
            this.title = title;
            this.columnHeader = columnHeader;
            this.detailLines = detailLines;
            this.pageFooter = pageFooter;
        }
    }

    private static List<Line> clusterLines(List<Token> tokens, float yTolerance) {
        List<Token> sorted = new ArrayList<>(tokens);
        sorted.sort(Comparator.comparingDouble((Token t) -> t.y).thenComparingDouble(t -> t.x));

        List<Line> lines = new ArrayList<>();
        Line current = null;
        float baseline = -1;

        for (Token t : sorted) {
            if (current == null || Math.abs(t.y - baseline) > yTolerance) {
                current = new Line();
                lines.add(current);
                baseline = t.y;
            }
            current.add(t);
        }

        for (Line line : lines) {
            line.finish();
        }
        return lines;
    }

    private static Segments inferSegments(List<Line> lines, float pageHeight) {
        Line title = null;
        float bestTitleSize = -1;
        float topThreshold = pageHeight * 0.25f;

        for (Line l : lines) {
            if (l.yMin <= topThreshold && l.avgFontSize > bestTitleSize && !l.joinedText().isBlank()) {
                bestTitleSize = l.avgFontSize;
                title = l;
            }
        }

        Line header = null;
        for (Line l : lines) {
            if (title != null && l.yMin <= title.yMax + 2) continue;
            if (l.tokens.size() >= 3 && l.yMin <= pageHeight * 0.55f) {
                header = l;
                break;
            }
        }
        if (header == null) {
            for (Line l : lines) {
                if (title == null || l.yMin > title.yMax + 2) {
                    header = l;
                    break;
                }
            }
        }

        Line footer = null;
        for (int i = lines.size() - 1; i >= 0; i--) {
            Line l = lines.get(i);
            if (l.yMin >= pageHeight * 0.80f && !l.joinedText().isBlank()) {
                footer = l;
                break;
            }
        }
        if (footer == null && !lines.isEmpty()) {
            footer = lines.get(lines.size() - 1);
        }

        List<Line> details = new ArrayList<>();
        float headerBottom = header != null ? header.yMax : 0;
        float footerTop = footer != null ? footer.yMin : pageHeight;

        Map<Integer, Integer> tokenCountFreq = new HashMap<>();
        for (Line l : lines) {
            if (l.yMin > headerBottom && l.yMax < footerTop && l.tokens.size() > 1) {
                int count = l.tokens.size();
                tokenCountFreq.put(count, tokenCountFreq.getOrDefault(count, 0) + 1);
            }
        }

        int modalCount = -1;
        int maxFreq = -1;
        for (Map.Entry<Integer, Integer> e : tokenCountFreq.entrySet()) {
            if (e.getValue() > maxFreq) {
                maxFreq = e.getValue();
                modalCount = e.getKey();
            }
        }

        for (Line l : lines) {
            if (l.yMin > headerBottom && l.yMax < footerTop && l.tokens.size() > 1) {
                if (modalCount < 0 || Math.abs(l.tokens.size() - modalCount) <= 1) {
                    details.add(l);
                }
            }
        }

        if (details.isEmpty()) {
            for (Line l : lines) {
                if (l.yMin > headerBottom && l.yMax < footerTop && !l.joinedText().isBlank()) {
                    details.add(l);
                }
            }
        }

        return new Segments(title, header, details, footer);
    }

    private static List<Map<String, Object>> inferGridColumns(Segments segments, float pageWidth) {
        Set<Float> xSet = new LinkedHashSet<>();
        if (segments.columnHeader != null) {
            for (Token t : segments.columnHeader.tokens) {
                xSet.add(t.x);
            }
        }
        if (xSet.size() < 2 && !segments.detailLines.isEmpty()) {
            Line detail = segments.detailLines.get(0);
            for (Token t : detail.tokens) {
                xSet.add(t.x);
            }
        }

        List<Float> xs = new ArrayList<>(xSet);
        xs.sort(Float::compareTo);
        if (xs.isEmpty()) {
            xs.add(0f);
            xs.add(pageWidth);
        }

        List<Map<String, Object>> columns = new ArrayList<>();
        for (int i = 0; i < xs.size(); i++) {
            float start = xs.get(i);
            float end = (i + 1 < xs.size()) ? xs.get(i + 1) : pageWidth;
            float width = Math.max(1f, end - start);

            Map<String, Object> col = new LinkedHashMap<>();
            col.put("index", i);
            col.put("widthRatio", round4(width / pageWidth));
            col.put("alignment", "left");
            columns.add(col);
        }

        return columns;
    }

    private static Map<String, Object> buildBlueprint(
        File pdf,
        float pageWidth,
        float pageHeight,
        int pageCount,
        List<Line> lines,
        Segments segments,
        List<Map<String, Object>> gridColumns
    ) throws Exception {
        float detailAvgSize = (float) averageFont(segments.detailLines);
        float headerSize = segments.columnHeader != null ? segments.columnHeader.avgFontSize : Math.max(8f, detailAvgSize + 1f);
        float titleSize = segments.title != null ? segments.title.avgFontSize : Math.max(12f, headerSize + 2f);
        float footerSize = segments.pageFooter != null ? segments.pageFooter.avgFontSize : Math.max(7f, detailAvgSize - 1f);

        Map<String, Object> root = new LinkedHashMap<>();
        root.put("schemaVersion", "1.0.0");

        Map<String, Object> source = new LinkedHashMap<>();
        source.put("inputMode", pdf.getAbsolutePath().replace('\\', '/').startsWith("/tmp/") ? "tmp-path" : "attachment");
        source.put("pdfReference", pdf.getAbsolutePath().replace('\\', '/'));
        source.put("sourcePdfSha256", sha256Hex(Files.readAllBytes(pdf.toPath())));
        source.put("mimeType", "application/pdf");
        source.put("sizeBytes", pdf.length());
        root.put("source", source);

        Map<String, Object> document = new LinkedHashMap<>();
        Map<String, Object> pageSize = new LinkedHashMap<>();
        pageSize.put("widthPt", round2(pageWidth));
        pageSize.put("heightPt", round2(pageHeight));
        document.put("pageSize", pageSize);
        document.put("orientation", pageWidth > pageHeight ? "Landscape" : "Portrait");
        document.put("pageCount", pageCount);
        root.put("document", document);

        Map<String, Object> tokens = new LinkedHashMap<>();
        Map<String, Object> font = new LinkedHashMap<>();
        font.put("primaryFamily", "Detected from legacy PDF page 1");
        font.put("fallbackFamily", "DejaVu Sans");
        Map<String, Object> sizesByRole = new LinkedHashMap<>();
        sizesByRole.put("title", round1(titleSize));
        sizesByRole.put("header", round1(headerSize));
        sizesByRole.put("detail", round1(detailAvgSize <= 0 ? 9f : detailAvgSize));
        sizesByRole.put("footer", round1(footerSize));
        font.put("sizesByRole", sizesByRole);
        tokens.put("font", font);

        Map<String, Object> colors = new LinkedHashMap<>();
        colors.put("textPrimary", "#222222");
        colors.put("backgroundPrimary", "#FFFFFF");
        colors.put("borderPrimary", "#BFBFBF");
        colors.put("accent", "#DCE6F1");
        colors.put("zebraOdd", "#FFFFFF");
        colors.put("zebraEven", "#F7F7F7");
        tokens.put("colors", colors);

        Map<String, Object> borders = new LinkedHashMap<>();
        borders.put("lineWidthPt", 0.5);
        borders.put("lineStyle", "solid");
        tokens.put("borders", borders);

        Map<String, Object> spacing = new LinkedHashMap<>();
        Map<String, Object> bandHeights = new LinkedHashMap<>();
        bandHeights.put("title", round1(heightOf(segments.title, 45f)));
        bandHeights.put("columnHeader", round1(heightOf(segments.columnHeader, 22f)));
        bandHeights.put("detail", round1(detailBandHeight(segments.detailLines, 18f)));
        bandHeights.put("pageFooter", round1(heightOf(segments.pageFooter, 24f)));
        spacing.put("bandHeightsPt", bandHeights);
        spacing.put("cellPaddingPt", 2);
        tokens.put("spacing", spacing);
        root.put("tokens", tokens);

        Map<String, Object> layout = new LinkedHashMap<>();
        layout.put("gridColumns", gridColumns);
        Map<String, Object> regions = new LinkedHashMap<>();
        regions.put("title", regionOf(segments.title, pageWidth, 0, bandHeights.get("title")));
        regions.put("columnHeader", regionOf(segments.columnHeader, pageWidth, 0, bandHeights.get("columnHeader")));
        regions.put("detail", detailRegionOf(segments.detailLines, pageWidth, pageHeight));
        regions.put("pageFooter", regionOf(segments.pageFooter, pageWidth, pageHeight - asFloat(bandHeights.get("pageFooter")), bandHeights.get("pageFooter")));
        layout.put("regions", regions);
        root.put("layout", layout);

        Map<String, Object> rules = new LinkedHashMap<>();
        Map<String, Object> alignRules = new LinkedHashMap<>();
        alignRules.put("string", "left");
        alignRules.put("number", "right");
        alignRules.put("date", "center");
        rules.put("alignmentPriorityByDataType", alignRules);
        rules.put("truncatePolicy", "truncate");
        rules.put("fallbackPolicy", "strict-default-template");
        root.put("rules", rules);

        Map<String, Object> confidence = new LinkedHashMap<>();
        double global = computeGlobalConfidence(segments, lines);
        confidence.put("global", round4((float) global));
        Map<String, Object> byRegion = new LinkedHashMap<>();
        byRegion.put("title", segments.title == null ? 0.4 : 0.85);
        byRegion.put("columnHeader", segments.columnHeader == null ? 0.45 : 0.8);
        byRegion.put("detail", segments.detailLines.isEmpty() ? 0.35 : 0.82);
        byRegion.put("pageFooter", segments.pageFooter == null ? 0.4 : 0.75);
        confidence.put("byRegion", byRegion);
        root.put("confidence", confidence);

        Map<String, Object> audit = new LinkedHashMap<>();
        audit.put("generatedAt", Instant.now().toString());
        List<String> decisions = new ArrayList<>();
        decisions.add("Phase 1 extraction used first page only.");
        decisions.add("Title inferred from largest font in top 25% area.");
        decisions.add("Column header inferred from first multi-token line after title.");
        decisions.add("Detail inferred from modal token-count lines between header and footer.");
        audit.put("decisions", decisions);
        List<String> fallbacks = new ArrayList<>();
        if (segments.title == null) fallbacks.add("Title fallback metrics applied.");
        if (segments.columnHeader == null) fallbacks.add("Column header fallback metrics applied.");
        if (segments.detailLines.isEmpty()) fallbacks.add("Detail fallback region applied.");
        audit.put("fallbacks", fallbacks);
        root.put("audit", audit);

        return root;
    }

    private static double computeGlobalConfidence(Segments s, List<Line> lines) {
        double score = 0.2;
        if (s.title != null) score += 0.2;
        if (s.columnHeader != null) score += 0.2;
        if (!s.detailLines.isEmpty()) score += 0.25;
        if (s.pageFooter != null) score += 0.15;
        if (lines.size() >= 6) score += 0.1;
        return Math.min(0.95, score);
    }

    private static double averageFont(List<Line> lines) {
        if (lines == null || lines.isEmpty()) return 9.0;
        double sum = 0;
        int count = 0;
        for (Line l : lines) {
            if (l.avgFontSize > 0) {
                sum += l.avgFontSize;
                count++;
            }
        }
        return count == 0 ? 9.0 : sum / count;
    }

    private static float detailBandHeight(List<Line> details, float fallback) {
        if (details == null || details.isEmpty()) return fallback;
        float avg = 0;
        for (Line l : details) {
            avg += (l.yMax - l.yMin);
        }
        avg = avg / details.size();
        return Math.max(fallback, avg + 2f);
    }

    private static float heightOf(Line line, float fallback) {
        if (line == null) return fallback;
        return Math.max(fallback, (line.yMax - line.yMin) + 4f);
    }

    private static float asFloat(Object value) {
        if (value instanceof Number) {
            return ((Number) value).floatValue();
        }
        return Float.parseFloat(String.valueOf(value));
    }

    private static Map<String, Object> regionOf(Line line, float pageWidth, float fallbackY, Object fallbackHeight) {
        Map<String, Object> region = new LinkedHashMap<>();
        float h = asFloat(fallbackHeight);
        if (line == null) {
            region.put("xPt", 0);
            region.put("yPt", round2(fallbackY));
            region.put("widthPt", round2(pageWidth));
            region.put("heightPt", round2(h));
            return region;
        }

        float xMin = Float.MAX_VALUE;
        float yMin = Float.MAX_VALUE;
        float xMax = Float.MIN_VALUE;
        float yMax = Float.MIN_VALUE;
        for (Token t : line.tokens) {
            xMin = Math.min(xMin, t.x);
            yMin = Math.min(yMin, t.y);
            xMax = Math.max(xMax, t.x + t.width);
            yMax = Math.max(yMax, t.y + t.height);
        }

        region.put("xPt", round2(Math.max(0, xMin)));
        region.put("yPt", round2(Math.max(0, yMin)));
        region.put("widthPt", round2(Math.max(1, xMax - xMin)));
        region.put("heightPt", round2(Math.max(1, yMax - yMin)));
        return region;
    }

    private static Map<String, Object> detailRegionOf(List<Line> lines, float pageWidth, float pageHeight) {
        Map<String, Object> region = new LinkedHashMap<>();
        if (lines == null || lines.isEmpty()) {
            region.put("xPt", 0);
            region.put("yPt", round2(pageHeight * 0.35f));
            region.put("widthPt", round2(pageWidth));
            region.put("heightPt", round2(pageHeight * 0.45f));
            return region;
        }

        float xMin = Float.MAX_VALUE;
        float yMin = Float.MAX_VALUE;
        float xMax = Float.MIN_VALUE;
        float yMax = Float.MIN_VALUE;
        for (Line l : lines) {
            for (Token t : l.tokens) {
                xMin = Math.min(xMin, t.x);
                yMin = Math.min(yMin, t.y);
                xMax = Math.max(xMax, t.x + t.width);
                yMax = Math.max(yMax, t.y + t.height);
            }
        }

        region.put("xPt", round2(Math.max(0, xMin)));
        region.put("yPt", round2(Math.max(0, yMin)));
        region.put("widthPt", round2(Math.max(1, xMax - xMin)));
        region.put("heightPt", round2(Math.max(1, yMax - yMin)));
        return region;
    }

    private static String sha256Hex(byte[] data) throws Exception {
        java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(data);
        StringBuilder sb = new StringBuilder();
        for (byte b : hash) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    private static String toJson(Object value, int indent) {
        StringBuilder sb = new StringBuilder();
        writeJson(value, sb, indent);
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private static void writeJson(Object value, StringBuilder sb, int indent) {
        if (value == null) {
            sb.append("null");
            return;
        }
        if (value instanceof String) {
            sb.append('"').append(escapeJson((String) value)).append('"');
            return;
        }
        if (value instanceof Number || value instanceof Boolean) {
            sb.append(String.valueOf(value));
            return;
        }
        if (value instanceof Map) {
            Map<String, Object> map = (Map<String, Object>) value;
            sb.append("{\n");
            int i = 0;
            for (Map.Entry<String, Object> e : map.entrySet()) {
                indent(sb, indent + 2);
                sb.append('"').append(escapeJson(e.getKey())).append('"').append(": ");
                writeJson(e.getValue(), sb, indent + 2);
                i++;
                if (i < map.size()) sb.append(',');
                sb.append('\n');
            }
            indent(sb, indent);
            sb.append('}');
            return;
        }
        if (value instanceof List) {
            List<Object> list = (List<Object>) value;
            sb.append("[\n");
            for (int i = 0; i < list.size(); i++) {
                indent(sb, indent + 2);
                writeJson(list.get(i), sb, indent + 2);
                if (i < list.size() - 1) sb.append(',');
                sb.append('\n');
            }
            indent(sb, indent);
            sb.append(']');
            return;
        }
        sb.append('"').append(escapeJson(String.valueOf(value))).append('"');
    }

    private static void indent(StringBuilder sb, int spaces) {
        for (int i = 0; i < spaces; i++) {
            sb.append(' ');
        }
    }

    private static String escapeJson(String s) {
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"': out.append("\\\""); break;
                case '\\': out.append("\\\\"); break;
                case '\b': out.append("\\b"); break;
                case '\f': out.append("\\f"); break;
                case '\n': out.append("\\n"); break;
                case '\r': out.append("\\r"); break;
                case '\t': out.append("\\t"); break;
                default:
                    if (c < 0x20) {
                        out.append(String.format("\\u%04x", (int) c));
                    } else {
                        out.append(c);
                    }
            }
        }
        return out.toString();
    }

    private static float round1(double v) {
        return (float) (Math.round(v * 10.0) / 10.0);
    }

    private static float round2(double v) {
        return (float) (Math.round(v * 100.0) / 100.0);
    }

    private static float round4(float v) {
        return (float) (Math.round(v * 10000.0f) / 10000.0f);
    }

    private static void compile(String jrxmlPath, String jasperPath) throws JRException {
        ensureParentDir(jasperPath);
        JasperCompileManager.compileReportToFile(jrxmlPath, jasperPath);
        System.out.println("OK Compiled jasper: " + jasperPath);
    }

    private static void exportPdfFromJrxml(String jrxmlPath, String pdfPath) throws JRException {
        ensureParentDir(pdfPath);

        JasperReport report = JasperCompileManager.compileReport(jrxmlPath);
        Map<String, Object> params = new HashMap<>();
        JasperPrint print = JasperFillManager.fillReport(report, params, new JREmptyDataSource(0));
        JasperExportManager.exportReportToPdfFile(print, pdfPath);

        System.out.println("OK Generated pdf: " + pdfPath);
    }

    private static void exportPdfFromJasper(String jasperPath, String pdfPath) throws JRException {
        ensureParentDir(pdfPath);

        JasperReport report = (JasperReport) JRLoader.loadObject(new File(jasperPath));
        Map<String, Object> params = new HashMap<>();
        params.put("data_inizio", null);
        params.put("data_fim", null);
        params.put("idps", null);
        JasperPrint print = JasperFillManager.fillReport(report, params, new JREmptyDataSource(0));
        JasperExportManager.exportReportToPdfFile(print, pdfPath);

        System.out.println("OK Generated pdf: " + pdfPath);
    }

    private static void exportPdfWithData(String jasperPath, String pdfPath, String dbUrl, String dbUser, String dbPassword) throws Exception {
        ensureParentDir(pdfPath);

        // Ensure PostgreSQL driver is loaded
        Class.forName("org.postgresql.Driver");
        
        JasperReport report = (JasperReport) JRLoader.loadObject(new File(jasperPath));
        Map<String, Object> params = new HashMap<>();
        
        Connection conn = null;
        try {
            conn = DriverManager.getConnection(dbUrl, dbUser, dbPassword);
            JasperPrint print = JasperFillManager.fillReport(report, params, conn);
            JasperExportManager.exportReportToPdfFile(print, pdfPath);
            System.out.println("OK Generated pdf with data: " + pdfPath);
        } finally {
            if (conn != null) {
                try {
                    conn.close();
                } catch (Exception e) {
                    // ignore
                }
            }
        }
    }

    private static void ensureParentDir(String filePath) {
        File parent = new File(filePath).getAbsoluteFile().getParentFile();
        if (parent != null && !parent.exists()) {
            parent.mkdirs();
        }
    }

    private static void requireArgs(String[] args, int size) {
        if (args.length < size) {
            usage();
            System.exit(1);
        }
    }

    private static void usage() {
        System.err.println("Usage:");
        System.err.println("  java -jar jasper-runner.jar compile <report.jrxml> <report.jasper>");
        System.err.println("  java -jar jasper-runner.jar pdf <report.jrxml> <report.pdf>");
        System.err.println("  java -jar jasper-runner.jar pdf-from-jasper <report.jasper> <report.pdf>");
        System.err.println("  java -jar jasper-runner.jar pdf-with-data <report.jasper> <report.pdf> <DB_URL> <DB_USER> <DB_PASSWORD>");
        System.err.println("  java -jar jasper-runner.jar extract-style-blueprint-phase1 <legacy.pdf> <style-blueprint.json>");
        System.err.println("  java -jar jasper-runner.jar extract-style-blueprint-phase2 <legacy.pdf> <style-blueprint.json>");
        System.err.println("  java -jar jasper-runner.jar extract-style-blueprint-phase3 <legacy.pdf> <style-blueprint.json> [--ocr]");
        System.err.println("  java -jar jasper-runner.jar visual-benchmark <legacy.pdf> <generated.pdf> <out-dir>");
    }
}
