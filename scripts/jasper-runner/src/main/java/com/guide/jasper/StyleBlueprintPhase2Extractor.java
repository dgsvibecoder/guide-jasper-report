package com.guide.jasper;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;

final class StyleBlueprintPhase2Extractor {

    private StyleBlueprintPhase2Extractor() {
    }

    private static class Token {
        String text;
        float x;
        float y;
        float width;
        float height;
        float fontSize;
        String fontName;

        Token(String text, float x, float y, float width, float height, float fontSize, String fontName) {
            this.text = text;
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.fontSize = fontSize;
            this.fontName = fontName;
        }
    }

    private static class Line {
        List<Token> tokens = new ArrayList<>();
        float yMin = Float.MAX_VALUE;
        float yMax = Float.MIN_VALUE;
        float avgFontSize;

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

    private static class PageTextStripper extends PDFTextStripper {
        private final List<Token> tokens = new ArrayList<>();

        PageTextStripper(int pageNumber) throws Exception {
            setStartPage(pageNumber);
            setEndPage(pageNumber);
            setSortByPosition(true);
        }

        @Override
        protected void writeString(String text, List<TextPosition> textPositions) {
            for (TextPosition tp : textPositions) {
                String unicode = tp.getUnicode();
                if (unicode == null) continue;
                String trimmed = unicode.trim();
                if (trimmed.isEmpty()) continue;
                String fontName = tp.getFont() != null ? tp.getFont().getName() : "unknown";
                tokens.add(new Token(
                    trimmed,
                    tp.getXDirAdj(),
                    tp.getYDirAdj(),
                    tp.getWidthDirAdj(),
                    tp.getHeightDir(),
                    tp.getFontSizeInPt(),
                    fontName
                ));
            }
        }
    }

    private static class PageAnalysis {
        float width;
        float height;
        List<Token> tokens;
        Segments segments;

        PageAnalysis(float width, float height, List<Token> tokens, Segments segments) {
            this.width = width;
            this.height = height;
            this.tokens = tokens;
            this.segments = segments;
        }
    }

    static void extract(String pdfPath, String blueprintOutPath) throws Exception {
        File pdf = new File(pdfPath);
        if (!pdf.exists()) {
            throw new IllegalArgumentException("PDF not found: " + pdfPath);
        }

        File outFile = new File(blueprintOutPath);
        File parent = outFile.getAbsoluteFile().getParentFile();
        if (parent != null && !parent.exists()) {
            parent.mkdirs();
        }

        try (PDDocument document = PDDocument.load(pdf)) {
            if (document.getNumberOfPages() < 1) {
                throw new IllegalArgumentException("PDF has no pages: " + pdfPath);
            }

            List<PageAnalysis> pages = new ArrayList<>();
            int pagesWithText = 0;

            for (int i = 0; i < document.getNumberOfPages(); i++) {
                int pageNum = i + 1;
                PDPage page = document.getPage(i);
                PDRectangle box = page.getMediaBox();

                PageTextStripper stripper = new PageTextStripper(pageNum);
                stripper.getText(document);
                List<Token> tokens = stripper.tokens;
                List<Line> lines = clusterLines(tokens, 3.5f);
                Segments segments = inferSegments(lines, box.getHeight());
                if (!tokens.isEmpty()) {
                    pagesWithText++;
                }

                pages.add(new PageAnalysis(box.getWidth(), box.getHeight(), tokens, segments));
            }

            if (pagesWithText == 0) {
                throw new IllegalStateException("No extractable text found in PDF. OCR is out of scope for phase 2.");
            }

            Map<String, Object> blueprint = buildBlueprint(pdf, document, pages, pagesWithText);
            Files.writeString(Path.of(blueprintOutPath), toJson(blueprint, 0), StandardCharsets.UTF_8);
        }

        System.out.println("OK Extracted phase2 style blueprint: " + blueprintOutPath);
    }

    private static Map<String, Object> buildBlueprint(File pdf, PDDocument document, List<PageAnalysis> pages, int pagesWithText) throws Exception {
        PageAnalysis first = pages.get(0);

        List<Token> allTokens = new ArrayList<>();
        List<Line> allDetails = new ArrayList<>();
        List<Line> titleCandidates = new ArrayList<>();
        List<Line> headerCandidates = new ArrayList<>();
        List<Line> footerCandidates = new ArrayList<>();

        for (PageAnalysis p : pages) {
            allTokens.addAll(p.tokens);
            allDetails.addAll(p.segments.detailLines);
            if (p.segments.title != null) titleCandidates.add(p.segments.title);
            if (p.segments.columnHeader != null) headerCandidates.add(p.segments.columnHeader);
            if (p.segments.pageFooter != null) footerCandidates.add(p.segments.pageFooter);
        }

        Line title = pickDominantLine(titleCandidates, true);
        Line columnHeader = pickDominantLine(headerCandidates, false);
        Line pageFooter = pickDominantLine(footerCandidates, false);

        List<Map<String, Object>> gridColumns = inferGridColumns(columnHeader, allDetails, first.width);
        List<Map<String, Object>> groups = inferGroups(allDetails);

        Map<String, Object> colorTokens = inferColorTokens(document, pages.size());
        Map<String, Object> fontTokens = inferFontTokens(allTokens, title, columnHeader, allDetails, pageFooter);

        Map<String, Object> root = new LinkedHashMap<>();
        root.put("schemaVersion", "1.0.0");

        Map<String, Object> source = new LinkedHashMap<>();
        source.put("inputMode", pdf.getAbsolutePath().replace('\\', '/').contains("/tmp/") ? "tmp-path" : "attachment");
        source.put("pdfReference", pdf.getAbsolutePath().replace('\\', '/'));
        source.put("sourcePdfSha256", sha256Hex(Files.readAllBytes(pdf.toPath())));
        source.put("mimeType", "application/pdf");
        source.put("sizeBytes", pdf.length());
        root.put("source", source);

        Map<String, Object> documentNode = new LinkedHashMap<>();
        Map<String, Object> pageSize = new LinkedHashMap<>();
        pageSize.put("widthPt", round2(first.width));
        pageSize.put("heightPt", round2(first.height));
        documentNode.put("pageSize", pageSize);
        documentNode.put("orientation", first.width > first.height ? "Landscape" : "Portrait");
        documentNode.put("pageCount", document.getNumberOfPages());
        documentNode.put("pagesAnalyzed", pages.size());
        root.put("document", documentNode);

        Map<String, Object> tokens = new LinkedHashMap<>();
        tokens.put("font", fontTokens);
        tokens.put("colors", colorTokens);

        Map<String, Object> borders = new LinkedHashMap<>();
        borders.put("lineWidthPt", 0.5);
        borders.put("lineStyle", "solid");
        tokens.put("borders", borders);

        Map<String, Object> spacing = new LinkedHashMap<>();
        Map<String, Object> bandHeights = new LinkedHashMap<>();
        bandHeights.put("title", round1(heightOf(title, 45f)));
        bandHeights.put("columnHeader", round1(heightOf(columnHeader, 22f)));
        bandHeights.put("detail", round1(detailBandHeight(allDetails, 18f)));
        bandHeights.put("pageFooter", round1(heightOf(pageFooter, 24f)));
        spacing.put("bandHeightsPt", bandHeights);
        spacing.put("cellPaddingPt", 2);
        tokens.put("spacing", spacing);
        root.put("tokens", tokens);

        Map<String, Object> layout = new LinkedHashMap<>();
        layout.put("gridColumns", gridColumns);
        layout.put("groups", groups);

        Map<String, Object> regions = new LinkedHashMap<>();
        regions.put("title", regionOf(title, first.width, 0, asFloat(bandHeights.get("title"))));
        regions.put("columnHeader", regionOf(columnHeader, first.width, asFloat(bandHeights.get("title")), asFloat(bandHeights.get("columnHeader"))));
        regions.put("detail", detailRegionOf(allDetails, first.width, first.height));
        regions.put("pageFooter", regionOf(pageFooter, first.width, first.height - asFloat(bandHeights.get("pageFooter")), asFloat(bandHeights.get("pageFooter"))));
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

        Map<String, Object> confidence = buildConfidence(pages, pagesWithText, title, columnHeader, allDetails, pageFooter, groups);
        root.put("confidence", confidence);

        Map<String, Object> audit = new LinkedHashMap<>();
        audit.put("generatedAt", Instant.now().toString());
        List<String> decisions = new ArrayList<>();
        decisions.add("Phase 2 extraction analyzed all pages.");
        decisions.add("Header/footer candidates consolidated by repeated text patterns.");
        decisions.add("Group candidates inferred from first detail column value changes.");
        decisions.add("Color tokens inferred from rendered page pixel sampling.");
        audit.put("decisions", decisions);
        List<String> fallbacks = new ArrayList<>();
        if (title == null) fallbacks.add("Title fallback metrics applied.");
        if (columnHeader == null) fallbacks.add("Column header fallback metrics applied.");
        if (allDetails.isEmpty()) fallbacks.add("Detail fallback region applied.");

        boolean fallbackRecommended = ((Number) confidence.get("global")).doubleValue() < 0.65;
        if (fallbackRecommended) {
            fallbacks.add("Automatic fallback recommended due to low global confidence (<0.65).");
        }

        audit.put("fallbacks", fallbacks);
        audit.put("fallbackRecommended", fallbackRecommended);
        root.put("audit", audit);

        return root;
    }

    private static Map<String, Object> inferFontTokens(List<Token> allTokens, Line title, Line header, List<Line> details, Line footer) {
        Map<String, Integer> byFamily = new HashMap<>();
        for (Token t : allTokens) {
            String family = normalizeFontFamily(t.fontName);
            byFamily.put(family, byFamily.getOrDefault(family, 0) + 1);
        }

        String primary = "DejaVu Sans";
        int max = -1;
        for (Map.Entry<String, Integer> e : byFamily.entrySet()) {
            if (e.getValue() > max) {
                max = e.getValue();
                primary = e.getKey();
            }
        }

        float detailSize = (float) averageFont(details);
        if (detailSize <= 0) detailSize = 9f;

        Map<String, Object> font = new LinkedHashMap<>();
        font.put("primaryFamily", primary);
        font.put("fallbackFamily", "DejaVu Sans");

        Map<String, Object> sizes = new LinkedHashMap<>();
        sizes.put("title", round1(title != null ? title.avgFontSize : Math.max(12f, detailSize + 2)));
        sizes.put("header", round1(header != null ? header.avgFontSize : Math.max(10f, detailSize + 1)));
        sizes.put("detail", round1(detailSize));
        sizes.put("footer", round1(footer != null ? footer.avgFontSize : Math.max(8f, detailSize - 1)));
        font.put("sizesByRole", sizes);

        return font;
    }

    private static Map<String, Object> inferColorTokens(PDDocument document, int pagesAnalyzed) throws Exception {
        PDFRenderer renderer = new PDFRenderer(document);
        int samplePages = Math.min(2, pagesAnalyzed);

        Map<Integer, Integer> histogram = new HashMap<>();
        for (int i = 0; i < samplePages; i++) {
            BufferedImage image = renderer.renderImageWithDPI(i, 72);
            int stepX = Math.max(1, image.getWidth() / 160);
            int stepY = Math.max(1, image.getHeight() / 160);
            for (int y = 0; y < image.getHeight(); y += stepY) {
                for (int x = 0; x < image.getWidth(); x += stepX) {
                    int rgb = image.getRGB(x, y) & 0xFFFFFF;
                    int quant = quantizeRgb(rgb);
                    histogram.put(quant, histogram.getOrDefault(quant, 0) + 1);
                }
            }
        }

        int background = pickMostFrequent(histogram, true, false);
        int text = pickMostFrequent(histogram, false, true);
        int accent = pickMostFrequent(histogram, false, false);

        if (background < 0) background = 0xFFFFFF;
        if (text < 0) text = 0x222222;
        if (accent < 0) accent = 0xDCE6F1;

        Map<String, Object> colors = new LinkedHashMap<>();
        colors.put("textPrimary", toHex(text));
        colors.put("backgroundPrimary", toHex(background));
        colors.put("borderPrimary", "#BFBFBF");
        colors.put("accent", toHex(accent));
        colors.put("zebraOdd", toHex(lighten(background, 0.0f)));
        colors.put("zebraEven", toHex(lighten(background, -0.04f)));
        return colors;
    }

    private static int pickMostFrequent(Map<Integer, Integer> histogram, boolean preferLight, boolean preferDark) {
        int bestColor = -1;
        int bestScore = Integer.MIN_VALUE;

        for (Map.Entry<Integer, Integer> e : histogram.entrySet()) {
            int color = e.getKey();
            int count = e.getValue();
            Color c = new Color(color);
            int brightness = (c.getRed() + c.getGreen() + c.getBlue()) / 3;

            int bonus = 0;
            if (preferLight && brightness > 220) bonus = 100000;
            if (preferDark && brightness < 70) bonus = 100000;
            if (!preferLight && !preferDark && brightness >= 85 && brightness <= 210) bonus = 40000;

            int score = count + bonus;
            if (score > bestScore) {
                bestScore = score;
                bestColor = color;
            }
        }

        return bestColor;
    }

    private static int quantizeRgb(int rgb) {
        int r = (rgb >> 16) & 0xFF;
        int g = (rgb >> 8) & 0xFF;
        int b = rgb & 0xFF;

        r = (r / 16) * 16;
        g = (g / 16) * 16;
        b = (b / 16) * 16;

        return (r << 16) | (g << 8) | b;
    }

    private static int lighten(int rgb, float delta) {
        Color c = new Color(rgb);
        int r = clamp((int) (c.getRed() + 255 * delta));
        int g = clamp((int) (c.getGreen() + 255 * delta));
        int b = clamp((int) (c.getBlue() + 255 * delta));
        return (r << 16) | (g << 8) | b;
    }

    private static int clamp(int value) {
        return Math.max(0, Math.min(255, value));
    }

    private static String toHex(int rgb) {
        return String.format("#%06X", rgb & 0xFFFFFF);
    }

    private static String normalizeFontFamily(String raw) {
        if (raw == null || raw.isBlank()) return "Unknown";
        String s = raw;
        int plus = s.indexOf('+');
        if (plus >= 0 && plus < s.length() - 1) {
            s = s.substring(plus + 1);
        }
        int comma = s.indexOf(',');
        if (comma > 0) s = s.substring(0, comma);
        return s.trim();
    }

    private static Map<String, Object> buildConfidence(
        List<PageAnalysis> pages,
        int pagesWithText,
        Line title,
        Line header,
        List<Line> details,
        Line footer,
        List<Map<String, Object>> groups
    ) {
        double pageCoverage = pages.isEmpty() ? 0 : (double) pagesWithText / (double) pages.size();

        int titlePages = 0;
        int headerPages = 0;
        int detailPages = 0;
        int footerPages = 0;
        for (PageAnalysis p : pages) {
            if (p.segments.title != null) titlePages++;
            if (p.segments.columnHeader != null) headerPages++;
            if (!p.segments.detailLines.isEmpty()) detailPages++;
            if (p.segments.pageFooter != null) footerPages++;
        }

        double titleCoverage = pages.isEmpty() ? 0 : (double) titlePages / pages.size();
        double headerCoverage = pages.isEmpty() ? 0 : (double) headerPages / pages.size();
        double detailCoverage = pages.isEmpty() ? 0 : (double) detailPages / pages.size();
        double footerCoverage = pages.isEmpty() ? 0 : (double) footerPages / pages.size();
        double groupScore = groups.isEmpty() ? 0.2 : 0.8;

        double global =
            (pageCoverage * 0.30)
            + (headerCoverage * 0.20)
            + (detailCoverage * 0.25)
            + (footerCoverage * 0.10)
            + (titleCoverage * 0.05)
            + (groupScore * 0.10);

        global = Math.max(0.0, Math.min(0.98, global));

        Map<String, Object> confidence = new LinkedHashMap<>();
        confidence.put("global", round4((float) global));

        Map<String, Object> byRegion = new LinkedHashMap<>();
        byRegion.put("title", round4((float) Math.max(0.35, titleCoverage)));
        byRegion.put("columnHeader", round4((float) Math.max(0.35, headerCoverage)));
        byRegion.put("detail", round4((float) Math.max(0.35, detailCoverage)));
        byRegion.put("pageFooter", round4((float) Math.max(0.35, footerCoverage)));
        confidence.put("byRegion", byRegion);

        return confidence;
    }

    private static Line pickDominantLine(List<Line> candidates, boolean preferLargestFont) {
        if (candidates.isEmpty()) return null;

        Map<String, Integer> freq = new HashMap<>();
        for (Line l : candidates) {
            String k = normalizeLineText(l.joinedText());
            if (!k.isBlank()) {
                freq.put(k, freq.getOrDefault(k, 0) + 1);
            }
        }

        candidates.sort((a, b) -> {
            String ka = normalizeLineText(a.joinedText());
            String kb = normalizeLineText(b.joinedText());
            int fa = freq.getOrDefault(ka, 0);
            int fb = freq.getOrDefault(kb, 0);
            if (fa != fb) return Integer.compare(fb, fa);
            if (preferLargestFont) return Float.compare(b.avgFontSize, a.avgFontSize);
            return Integer.compare(b.tokens.size(), a.tokens.size());
        });

        return candidates.get(0);
    }

    private static String normalizeLineText(String text) {
        return text == null ? "" : text.replaceAll("\\s+", " ").trim().toLowerCase();
    }

    private static List<Map<String, Object>> inferGroups(List<Line> details) {
        List<Map<String, Object>> groups = new ArrayList<>();
        if (details.isEmpty()) return groups;

        String current = null;
        int count = 0;
        int groupIndex = 0;

        for (Line l : details) {
            if (l.tokens.isEmpty()) continue;
            String key = l.tokens.get(0).text;
            if (current == null) {
                current = key;
                count = 1;
                continue;
            }
            if (current.equals(key)) {
                count++;
                continue;
            }

            Map<String, Object> group = new LinkedHashMap<>();
            group.put("index", groupIndex++);
            group.put("key", current);
            group.put("rows", count);
            groups.add(group);

            current = key;
            count = 1;
        }

        if (current != null) {
            Map<String, Object> group = new LinkedHashMap<>();
            group.put("index", groupIndex);
            group.put("key", current);
            group.put("rows", count);
            groups.add(group);
        }

        if (groups.size() > 12) {
            return groups.subList(0, 12);
        }

        return groups;
    }

    private static List<Map<String, Object>> inferGridColumns(Line header, List<Line> details, float pageWidth) {
        Set<Float> xSet = new LinkedHashSet<>();
        if (header != null) {
            for (Token t : header.tokens) {
                xSet.add(t.x);
            }
        }
        if (xSet.size() < 2 && !details.isEmpty()) {
            Line detail = details.get(0);
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
            if (l.tokens.size() >= 3 && l.yMin <= pageHeight * 0.60f) {
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

        return new Segments(title, header, details, footer);
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

    private static Map<String, Object> regionOf(Line line, float pageWidth, float fallbackY, float fallbackHeight) {
        Map<String, Object> region = new LinkedHashMap<>();
        if (line == null) {
            region.put("xPt", 0);
            region.put("yPt", round2(fallbackY));
            region.put("widthPt", round2(pageWidth));
            region.put("heightPt", round2(fallbackHeight));
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
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(data);
        StringBuilder sb = new StringBuilder();
        for (byte b : hash) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
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
}
