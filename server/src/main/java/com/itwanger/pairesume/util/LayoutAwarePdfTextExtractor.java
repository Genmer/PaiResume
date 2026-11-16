package com.itwanger.pairesume.util;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.interactive.action.PDActionURI;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotation;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotationLink;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * 版式感知的 PDF 文本抽取器。
 * <p>
 * 解决两个 PDFTextStripper 的老问题：
 * 1. 双栏简历（左栏技能/联系 + 右栏经历）经 sortByPosition 后左右栏同一视觉行被并成一行交错输出。
 *    本类按行 x 区间做列缝检测，检测到双栏时按"全宽行分段，段内先左栏后右栏"重排阅读序。
 * 2. 段落标题（字号更大）在纯文本中丢失。本类按页中位数字号识别标题行并加 "## " 前缀，
 *    供下游 prompt 利用其定位板块。
 * <p>
 * 任何解析异常都会回退到原生 PDFTextStripper（sortByPosition=true），保证不比现状差。
 */
public final class LayoutAwarePdfTextExtractor {

    /** 单页内行 y 坐标差在该值内视为同一视觉行 */
    private static final float LINE_Y_TOLERANCE = 2.5f;

    /** 列缝最小宽度（pt），低于此宽度不视为双栏 */
    private static final float MIN_COLUMN_GAP_PT = 14f;

    /** 标题行字号需达到页中位数字号的倍数 */
    private static final float HEADING_SIZE_RATIO = 1.18f;

    /** 标题行最大字符数 */
    private static final int HEADING_MAX_CHARS = 40;

    /** 同一视觉行内 run 间水平间隙超过该值（且与字号相关）视为跨栏，拆成独立行参与列检测 */
    private static final float COLUMN_SPLIT_GAP_PT = 15f;

    private LayoutAwarePdfTextExtractor() {
    }

    /** 抽取结果：文本 + 总页数 + 是否检测到双栏版式 */
    public record ExtractedText(String text, int pageCount, boolean columnLayoutDetected) {}

    /** 一行文本的水平占位与字号（纯逻辑单元，便于单测） */
    public record TextLine(String text, float x, float endX, float y, float maxFontSize) {
        public float width() {
            return endX - x;
        }
    }

    public static ExtractedText extract(byte[] pdfBytes, int maxPages) throws IOException {
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            return extract(document, maxPages);
        }
    }

    public static ExtractedText extract(PDDocument document, int maxPages) throws IOException {
        int pageCount = document.getNumberOfPages();
        int pagesToProcess = Math.min(Math.max(pageCount, 1), Math.max(maxPages, 1));
        try {
            List<List<TextLine>> pageLines = new ArrayList<>(pagesToProcess);
            List<List<String>> pageUris = new ArrayList<>(pagesToProcess);
            for (int page = 1; page <= pagesToProcess; page++) {
                pageLines.add(collectLines(document, page));
                pageUris.add(collectLinkUris(document, page));
            }
            if (pageLines.size() > 1) {
                dropRepeatedHeaderFooterLines(pageLines);
                dropPageNumberLines(pageLines);
            }
            StringBuilder out = new StringBuilder();
            boolean anyColumn = false;
            for (int i = 0; i < pageLines.size(); i++) {
                ColumnOrderResult ordered = orderLines(pageLines.get(i));
                anyColumn |= ordered.columnLayout();
                appendPage(out, ordered.lines());
                appendLinkUris(out, ordered.lines(), pageUris.get(i));
            }
            return new ExtractedText(out.toString().trim(), pageCount, anyColumn);
        } catch (Exception e) {
            // 版式分析彻底失败：整档回退原生抽取，保证可用性
            return new ExtractedText(plainExtract(document, pagesToProcess), pageCount, false);
        }
    }

    /** 页码行模式：第 x 页 / x 共 y 页 / x/y / page x of y */
    private static final java.util.regex.Pattern PAGE_NUMBER_LINE =
            java.util.regex.Pattern.compile(
                    "^(?:第\\s*\\d+\\s*页(?:\\s*共\\s*\\d+\\s*页)?|\\d{1,3}\\s*/\\s*\\d{1,3}|page\\s*\\d+(?:\\s*(?:of|/)\\s*\\d+)?)$",
                    java.util.regex.Pattern.CASE_INSENSITIVE);

    /**
     * 跨页完全相同的行（页眉/页脚）在超过一半的页出现时，仅保留第一次出现。
     * 包私有 static 便于单测。
     */
    static void dropRepeatedHeaderFooterLines(List<List<TextLine>> pages) {
        java.util.Map<String, Integer> pageCountByText = new java.util.HashMap<>();
        for (List<TextLine> page : pages) {
            // 同页内相同文本只计一次
            java.util.Set<String> seenOnPage = new java.util.HashSet<>();
            for (TextLine line : page) {
                String key = normalizeForRepeat(line.text());
                if (!key.isEmpty() && seenOnPage.add(key)) {
                    pageCountByText.merge(key, 1, Integer::sum);
                }
            }
        }
        int threshold = Math.max(2, (pages.size() + 1) / 2);
        for (int i = 1; i < pages.size(); i++) {
            pages.get(i).removeIf(line -> pageCountByText.getOrDefault(normalizeForRepeat(line.text()), 0) >= threshold);
        }
    }

    /** 丢弃页码行（"第 1 页"、"1 / 2"、"page 1 of 2"），所有页都删 */
    static void dropPageNumberLines(List<List<TextLine>> pages) {
        for (List<TextLine> page : pages) {
            page.removeIf(line -> PAGE_NUMBER_LINE.matcher(line.text().trim()).matches());
        }
    }

    private static String normalizeForRepeat(String text) {
        return text == null ? "" : text.replaceAll("\\s+", " ").trim();
    }

    // ==================== 超链接 annotation ====================

    /** 读取页面 Link annotation 中的 URI（正文可见文字是"GitHub/个人主页"但挂了真实链接的场景） */
    private static List<String> collectLinkUris(PDDocument document, int page) throws IOException {
        List<String> uris = new ArrayList<>();
        for (PDAnnotation annotation : document.getPage(page - 1).getAnnotations()) {
            if (annotation instanceof PDAnnotationLink link
                    && link.getAction() instanceof PDActionURI uriAction) {
                String uri = uriAction.getURI();
                if (uri != null && !uri.isBlank()) {
                    uris.add(uri.trim());
                }
            }
        }
        return uris;
    }

    /**
     * 把页面上未在正文中出现的 URI 以 "链接：<uri>" 行追加到页尾（已在正文里的不重复追加）。
     * 包私有 static 便于单测。
     */
    static void appendLinkUris(StringBuilder out, List<TextLine> pageLines, List<String> uris) {
        if (uris == null || uris.isEmpty()) {
            return;
        }
        String pageText = pageLines == null ? "" : pageLines.stream().map(TextLine::text).collect(java.util.stream.Collectors.joining("\n"));
        java.util.Set<String> emitted = new java.util.HashSet<>();
        for (String uri : uris) {
            if (pageText.contains(uri) || !emitted.add(uri)) {
                continue;
            }
            out.append("链接：").append(uri).append('\n');
        }
    }

    private static String plainExtract(PDDocument document, int lastPage) throws IOException {
        PDFTextStripper stripper = new PDFTextStripper();
        stripper.setSortByPosition(true);
        stripper.setStartPage(1);
        stripper.setEndPage(lastPage);
        return stripper.getText(document);
    }

    // ==================== 纯逻辑部分（可单测） ====================

    /** orderLines 的结果 */
    public record ColumnOrderResult(List<TextLine> lines, boolean columnLayout) {}

    /**
     * 将行集合重排为人类阅读序。检测到双栏时：全宽行作为分段符，段内先输出左栏（y 升序）再右栏。
     */
    public static ColumnOrderResult orderLines(List<TextLine> input) {
        List<TextLine> sorted = new ArrayList<>(input);
        sorted.sort(Comparator.comparingDouble(TextLine::y).thenComparingDouble(TextLine::x));

        List<Float> splits = detectColumnSplits(sorted);
        if (splits.isEmpty()) {
            return new ColumnOrderResult(sorted, false);
        }
        int cols = splits.size() + 1;

        // 以横跨缝的行（全宽标题/分隔线）为界切段；段内按列序输出（第 1 列 → 第 N 列）
        List<TextLine> result = new ArrayList<>(sorted.size());
        List<List<TextLine>> bandCols = new ArrayList<>(cols);
        for (int i = 0; i < cols; i++) {
            bandCols.add(new ArrayList<>());
        }
        int[] colCounts = new int[cols];
        int separators = 0;
        for (TextLine line : sorted) {
            boolean crosses = false;
            for (float split : splits) {
                if (line.x() < split - 1f && line.endX() > split + 1f) {
                    crosses = true;
                    break;
                }
            }
            if (crosses) {
                flushBand(result, bandCols);
                result.add(line);
                separators++;
            } else {
                bandCols.get(columnOf(line.x(), splits)).add(line);
                colCounts[columnOf(line.x(), splits)]++;
            }
        }
        flushBand(result, bandCols);

        // 任一列行数不足或横跨线过多时，分栏判定不可信，退回单栏顺序
        for (int count : colCounts) {
            if (count < 4) {
                return new ColumnOrderResult(sorted, false);
            }
        }
        if (separators > sorted.size() * 0.5) {
            return new ColumnOrderResult(sorted, false);
        }
        return new ColumnOrderResult(result, true);
    }

    /** x 坐标落在第几列（0 基） */
    private static int columnOf(float x, List<Float> splits) {
        int col = 0;
        for (float split : splits) {
            if (x > split) {
                col++;
            }
        }
        return col;
    }

    /** 页面字号的简单中位数（无有效字号返回 0） */
    private static float medianFontSize(List<TextLine> lines) {
        List<Float> sizes = new ArrayList<>();
        for (TextLine line : lines) {
            if (line.maxFontSize() > 0) {
                sizes.add(line.maxFontSize());
            }
        }
        if (sizes.isEmpty()) {
            return 0f;
        }
        sizes.sort(Float::compare);
        return sizes.get(sizes.size() / 2);
    }

    private static void flushBand(List<TextLine> out, List<List<TextLine>> bandCols) {
        for (List<TextLine> col : bandCols) {
            out.addAll(col);
            col.clear();
        }
    }

    /**
     * 检测双栏列缝：在文本区域中间 60% 范围内，用"窄行"（非全宽标题）的 x 覆盖寻找空走廊。
     * 返回列缝中心 x；未检测到返回 null。
     */
    public static Float detectColumnGap(List<TextLine> lines) {
        List<Float> splits = detectColumnSplits(lines);
        return splits.isEmpty() ? null : splits.get(0);
    }

    /**
     * 检测全部列缝（支持双栏与三栏）：窄行 x 覆盖的空走廊即候选缝。
     * 缝数超过 2（即 4 列以上）视为表格/网格，拒绝重排。
     * 每列要求窄行起点 ≥4，且起点簇 top-N 覆盖 ≥80%（N=列数）。
     */
    static List<Float> detectColumnSplits(List<TextLine> lines) {
        if (lines.size() < 6) {
            return List.of();
        }

        float minX = Float.MAX_VALUE;
        float maxX = -Float.MAX_VALUE;
        for (TextLine line : lines) {
            minX = Math.min(minX, line.x());
            maxX = Math.max(maxX, line.endX());
        }
        float span = maxX - minX;
        if (span < 100f) {
            return List.of();
        }

        // 只统计窄行，避免全宽标题把列缝盖住；居中大字号标题（>1.18x 中位字号）也排除——
        // 它们是横跨在真走廊上的装饰元素，其墨迹不应抹掉列缝证据
        float medianFontSize = medianFontSize(lines);
        float binSize = 2f;
        int binCount = (int) Math.ceil(span / binSize) + 1;
        boolean[] covered = new boolean[binCount];
        int narrowLines = 0;
        for (TextLine line : lines) {
            if (line.width() < span * 0.6f) {
                narrowLines++;
                boolean isHeading = medianFontSize > 0 && line.maxFontSize() > medianFontSize * 1.18f;
                if (isHeading) {
                    continue;
                }
                int from = (int) Math.max(0, (line.x() - minX) / binSize);
                int to = (int) Math.min(binCount - 1, (line.endX() - minX) / binSize);
                for (int b = from; b <= to; b++) {
                    covered[b] = true;
                }
            }
        }
        if (narrowLines < 5) {
            return List.of();
        }

        // 走廊 = 两侧均有窄行覆盖的内部空带（页边距/参差右缘只在单侧有覆盖，天然出局），
        // 全宽扫描；缝数超过 2（即 4 列以上）视为表格/网格，拒绝重排。
        float minGap = Math.max(MIN_COLUMN_GAP_PT, span * 0.025f);
        List<Float> splits = new ArrayList<>();
        int b = 0;
        while (b < binCount) {
            if (!covered[b]) {
                int runStart = b;
                while (b < binCount && !covered[b]) {
                    b++;
                }
                boolean leftBounded = runStart > 0;
                boolean rightBounded = b < binCount;
                if (leftBounded && rightBounded && (b - runStart) * binSize >= minGap) {
                    splits.add(minX + (runStart + (b - runStart) / 2f) * binSize);
                }
            } else {
                b++;
            }
        }
        if (splits.isEmpty() || splits.size() > 2) {
            return List.of();
        }

        // 每列窄行起点数量校验（右侧假缝右边的"列"没有真实起点）
        int cols = splits.size() + 1;
        int[] startCounts = new int[cols];
        for (TextLine line : lines) {
            if (line.width() < span * 0.6f) {
                startCounts[columnOf(line.x(), splits)]++;
            }
        }
        for (int count : startCounts) {
            if (count < 4) {
                return List.of();
            }
        }

        // 起始 x 聚类校验：N 栏版式的行起点应集中在 N 个簇
        if (!startXClustersMatchColumns(lines, span, cols)) {
            return List.of();
        }
        return splits;
    }

    /**
     * 真实 N 栏版式中，窄行的起始 x 应集中在 N 个簇（允许缩进产生的相邻小簇）。
     * 若前 N 大簇覆盖率不足 80%，更可能是表格/多列网格，不按栏重排。
     */
    private static boolean startXClustersMatchColumns(List<TextLine> lines, float span, int columns) {
        final float binSize = 3f;
        int binCount = (int) (span / binSize) + 2;
        int[] counts = new int[binCount];
        int total = 0;
        for (TextLine line : lines) {
            if (line.width() >= span * 0.6f) {
                continue;
            }
            int bin = Math.min(binCount - 1, Math.max(0, (int) (line.x() / binSize)));
            counts[bin]++;
            total++;
        }
        if (total == 0) {
            return false;
        }
        // 相邻非空 bin 视为同一簇（簇间隙 > 2 个空 bin 才分开）
        List<Integer> clusterSizes = new ArrayList<>();
        int cur = 0;
        int emptyRun = 0;
        for (int count : counts) {
            if (count > 0) {
                cur += count;
                emptyRun = 0;
            } else if (cur > 0) {
                emptyRun++;
                if (emptyRun > 2) {
                    clusterSizes.add(cur);
                    cur = 0;
                }
            }
        }
        if (cur > 0) {
            clusterSizes.add(cur);
        }
        clusterSizes.sort(Comparator.reverseOrder());
        int topN = 0;
        for (int i = 0; i < Math.min(columns, clusterSizes.size()); i++) {
            topN += clusterSizes.get(i);
        }
        return topN >= total * 0.8f;
    }

    /**
     * 按页中位数字号给标题行加 "## " 前缀。
     */
    public static List<TextLine> annotateHeadings(List<TextLine> lines) {
        List<Float> sizes = new ArrayList<>();
        for (TextLine line : lines) {
            if (line.maxFontSize() > 0) {
                sizes.add(line.maxFontSize());
            }
        }
        if (sizes.size() < 6) {
            return lines;
        }
        sizes.sort(Float::compare);
        float median = sizes.get(sizes.size() / 2);
        if (median <= 0) {
            return lines;
        }

        List<TextLine> result = new ArrayList<>(lines.size());
        for (TextLine line : lines) {
            String text = line.text();
            boolean heading = line.maxFontSize() >= median * HEADING_SIZE_RATIO
                    && !text.isBlank()
                    && text.length() <= HEADING_MAX_CHARS;
            result.add(heading
                    ? new TextLine("## " + text, line.x(), line.endX(), line.y(), line.maxFontSize())
                    : line);
        }
        return result;
    }

    // ==================== PDF 解析部分 ====================

    /** 单个文本 run（包私有以便测试） */
    record Run(String text, float x, float endX, float y, float fontSize) {}

    private static List<TextLine> collectLines(PDDocument document, int page) throws IOException {
        PositionCollector collector = new PositionCollector();
        collector.setStartPage(page);
        collector.setEndPage(page);
        collector.getText(document);
        return runsToLines(collector.runs);
    }

    static List<TextLine> runsToLines(List<Run> runs) {
        List<Run> sorted = new ArrayList<>(runs);
        sorted.sort(Comparator.comparingDouble(Run::y).thenComparingDouble(Run::x));

        List<TextLine> lines = new ArrayList<>();
        StringBuilder text = new StringBuilder();
        float lineY = 0;
        float lineX = 0;
        float lineEndX = 0;
        float lineSize = 0;
        boolean open = false;
        float prevEndX = Float.NaN;

        for (Run run : sorted) {
            boolean sameLine = open && Math.abs(run.y() - lineY) <= LINE_Y_TOLERANCE;
            // 同一视觉行但 run 间有很大的水平空隙、或 run 的 x 比上一 run 结束位置还靠前（x 回退，
            // 说明左右两栏各自的 run 在 y 排序后交错出现）→ 拆成独立行参与列检测，
            // 否则合并会造出横跨列缝的"伪全宽行"或左右栏文字拼接，使列检测失效
            boolean columnSplit = sameLine && !Float.isNaN(prevEndX)
                    && (run.x() < prevEndX - 1.5f
                        || run.x() - prevEndX > Math.max(COLUMN_SPLIT_GAP_PT, 2.5f * run.fontSize()));
            if (!sameLine || columnSplit) {
                if (open) {
                    lines.add(new TextLine(text.toString().trim(), lineX, lineEndX, lineY, lineSize));
                }
                text.setLength(0);
                lineY = run.y();
                lineX = run.x();
                lineEndX = run.endX();
                lineSize = run.fontSize();
                prevEndX = Float.NaN;
                open = true;
            } else if (!Float.isNaN(prevEndX) && run.x() - prevEndX > 1.5f) {
                text.append(' ');
            }
            text.append(run.text());
            lineEndX = Math.max(lineEndX, run.endX());
            lineSize = Math.max(lineSize, run.fontSize());
            prevEndX = run.endX();
        }
        if (open) {
            lines.add(new TextLine(text.toString().trim(), lineX, lineEndX, lineY, lineSize));
        }

        List<TextLine> nonEmpty = new ArrayList<>(lines.size());
        for (TextLine line : lines) {
            if (!line.text().isBlank()) {
                nonEmpty.add(line);
            }
        }
        return nonEmpty;
    }

    private static void appendPage(StringBuilder out, List<TextLine> lines) {
        List<TextLine> annotated = annotateHeadings(lines);
        if (annotated.isEmpty()) {
            return;
        }
        if (!out.isEmpty()) {
            out.append("\n\n");
        }
        for (int i = 0; i < annotated.size(); i++) {
            if (i > 0) {
                out.append('\n');
            }
            out.append(annotated.get(i).text());
        }
    }

    /** 收集每个文本 run 的坐标与字号（覆盖 writeString 以拿到 TextPosition） */
    private static final class PositionCollector extends PDFTextStripper {

        private final List<Run> runs = new ArrayList<>();

        PositionCollector() throws IOException {
            super();
        }

        @Override
        protected void writeString(String text, List<TextPosition> textPositions) {
            if (text == null || text.isBlank() || textPositions == null || textPositions.isEmpty()) {
                return;
            }
            TextPosition first = textPositions.get(0);
            TextPosition last = textPositions.get(textPositions.size() - 1);
            float x = first.getXDirAdj();
            float endX = Math.max(last.getXDirAdj() + last.getWidthDirAdj(), x);
            float y = first.getYDirAdj();
            float fontSize = 0f;
            for (TextPosition position : textPositions) {
                fontSize = Math.max(fontSize, position.getFontSizeInPt());
            }
            runs.add(new Run(text, x, endX, y, fontSize));
        }
    }
}
