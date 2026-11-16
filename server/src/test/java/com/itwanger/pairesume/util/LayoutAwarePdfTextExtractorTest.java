package com.itwanger.pairesume.util;

import com.itwanger.pairesume.util.LayoutAwarePdfTextExtractor.ColumnOrderResult;
import com.itwanger.pairesume.util.LayoutAwarePdfTextExtractor.ExtractedText;
import com.itwanger.pairesume.util.LayoutAwarePdfTextExtractor.TextLine;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class LayoutAwarePdfTextExtractorTest {

    /** 三栏布局：两条列缝都应找出，重排为第 1 栏→第 2 栏→第 3 栏 */
    @Test
    void threeColumnPageReorderedColumnMajor() {
        List<TextLine> lines = new ArrayList<>();
        // 全宽标题（横跨，作为段分隔）
        lines.add(new TextLine("周雨桐 - 全栈工程师", 0, 200, 10, 16f));
        // 三栏：col1 x 0-55，col2 x 72-127，col3 x 145-200（缝宽 17pt/18pt ≥ 阈值 14pt）；行间 y 交错
        String[][] cols = {
                {"联系方式", "电话：139", "邮箱：a@b", "城市：深圳"},
                {"技能", "前端：React", "后端：Node", "运维：Docker"},
                {"作品", "简历生成器", "博客引擎", "AI 搜索"},
        };
        float[] xs = {0f, 72f, 145f};
        for (int row = 0; row < 4; row++) {
            for (int c = 0; c < 3; c++) {
                lines.add(new TextLine(cols[c][row], xs[c], xs[c] + 55, 50 + row * 15, row == 0 ? 12f : 9f));
            }
        }

        ColumnOrderResult result = LayoutAwarePdfTextExtractor.orderLines(lines);

        assertTrue(result.columnLayout(), "三栏应被识别");
        String text = result.lines().stream().map(TextLine::text).collect(java.util.stream.Collectors.joining("|"));
        // 每栏内容应整块连续出现
        assertTrue(text.indexOf("城市：深圳") < text.indexOf("技能"), "第 1 栏应先于第 2 栏: " + text);
        assertTrue(text.indexOf("运维：Docker") < text.indexOf("作品"), "第 2 栏应先于第 3 栏: " + text);
        int contactStart = text.indexOf("联系方式");
        int skillStart = text.indexOf("技能");
        int workStart = text.indexOf("作品");
        assertTrue(contactStart < skillStart && skillStart < workStart, "栏标题按栏序输出: " + text);
    }

    /** 四栏（表格网格）：缝数 >2 应拒绝重排，退回单栏自然顺序 */
    @Test
    void fourColumnGridRefused() {
        List<TextLine> lines = new ArrayList<>();
        String[][] cols = {
                {"姓名", "电话", "邮箱", "城市", "学历"},
                {"张三", "138", "a@b", "北京", "本科"},
                {"李四", "139", "c@d", "上海", "硕士"},
                {"王五", "136", "e@f", "广州", "博士"},
        };
        float[] xs = {0f, 41f, 82f, 123f, 164f};
        for (int row = 0; row < 4; row++) {
            for (int c = 0; c < 5; c++) {
                lines.add(new TextLine(cols[row][c], xs[c], xs[c] + 40, 50 + row * 15, 9f));
            }
        }
        ColumnOrderResult result = LayoutAwarePdfTextExtractor.orderLines(lines);
        assertFalse(result.columnLayout(), "4 条缝=5 列网格应拒绝重排");
    }

    /** 页面横向 span 200（x: 0..200），中间 95..105 是列缝的双栏布局 */
    private static List<TextLine> twoColumnPage() {
        List<TextLine> lines = new ArrayList<>();
        // 全宽标题
        lines.add(new TextLine("张三的简历", 0, 200, 10, 18f));
        lines.add(new TextLine("基本信息", 0, 200, 30, 14f));
        // 左栏（联系方式）
        lines.add(new TextLine("电话：138xxxx", 0, 90, 50, 10f));
        lines.add(new TextLine("邮箱：a@b.com", 0, 90, 65, 10f));
        lines.add(new TextLine("地点：上海", 0, 90, 80, 10f));
        lines.add(new TextLine("技能：Java/Go", 0, 90, 95, 10f));
        // 右栏（经历，y 与左栏交错——这是 sortByPosition 会并行的场景）
        lines.add(new TextLine("公司A 后端工程师", 110, 200, 50, 10f));
        lines.add(new TextLine("2021-01 至今", 110, 200, 65, 10f));
        lines.add(new TextLine("负责订单系统", 110, 200, 80, 10f));
        lines.add(new TextLine("公司B 实习生", 110, 200, 95, 10f));
        // 全宽底部
        lines.add(new TextLine("自我评价：靠谱", 0, 200, 120, 10f));
        return lines;
    }

    @Test
    void detectColumnGapFindsGapInTwoColumnLayout() {
        Float gap = LayoutAwarePdfTextExtractor.detectColumnGap(twoColumnPage());
        assertNotNull(gap, "双栏布局应检测到列缝");
        assertTrue(gap > 90 && gap < 110, "列缝应在 95..105 之间，实际=" + gap);
    }

    @Test
    void detectColumnGapReturnsNullForSingleColumn() {
        List<TextLine> lines = new ArrayList<>();
        for (int i = 0; i < 8; i++) {
            lines.add(new TextLine("第" + i + "行内容文本", 0, 190, 10 + i * 15, 10f));
        }
        assertNull(LayoutAwarePdfTextExtractor.detectColumnGap(lines));
    }

    @Test
    void orderLinesReadsLeftColumnThenRightColumn() {
        ColumnOrderResult result = LayoutAwarePdfTextExtractor.orderLines(twoColumnPage());
        assertTrue(result.columnLayout());

        List<String> texts = result.lines().stream().map(TextLine::text).toList();
        int contact = texts.indexOf("电话：138xxxx");
        int companyA = texts.indexOf("公司A 后端工程师");
        int skills = texts.indexOf("技能：Java/Go");
        int companyB = texts.indexOf("公司B 实习生");
        int footer = texts.indexOf("自我评价：靠谱");

        // 左栏整体在右栏之前
        assertTrue(contact < companyA, "左栏应先于右栏: " + texts);
        assertTrue(skills < companyB, "左栏末行应先于右栏末行: " + texts);
        // 全宽行（标题/底部）保持原有相对位置：标题最先，底部最后
        assertEquals(0, texts.indexOf("张三的简历"));
        assertTrue(footer > companyB, "全宽底部行应在右栏之后");
    }

    @Test
    void orderLinesFallsBackToSingleColumnWhenTooFewSideLines() {
        List<TextLine> lines = new ArrayList<>();
        lines.add(new TextLine("标题", 0, 200, 10, 16f));
        lines.add(new TextLine("左1", 0, 90, 30, 10f));
        lines.add(new TextLine("右1", 110, 200, 30, 10f));
        lines.add(new TextLine("左2", 0, 90, 50, 10f));
        lines.add(new TextLine("右2", 110, 200, 50, 10f));

        ColumnOrderResult result = LayoutAwarePdfTextExtractor.orderLines(lines);
        assertFalse(result.columnLayout(), "两侧行数不足时不应判定双栏");
        assertEquals(5, result.lines().size());
    }

    @Test
    void annotateHeadingsMarksLargeFontLines() {
        List<TextLine> lines = new ArrayList<>();
        lines.add(new TextLine("工作经历", 0, 100, 10, 16f));   // 1.6 倍中位 → 标题
        lines.add(new TextLine("公司A", 0, 100, 30, 10f));
        lines.add(new TextLine("公司B", 0, 100, 45, 10f));
        lines.add(new TextLine("教育背景", 0, 100, 60, 16f));
        lines.add(new TextLine("学校C", 0, 100, 75, 10f));
        lines.add(new TextLine("学校D", 0, 100, 90, 10f));
        lines.add(new TextLine("专业技能", 0, 100, 105, 10.5f)); // 1.05 倍 → 非标题

        List<TextLine> annotated = LayoutAwarePdfTextExtractor.annotateHeadings(lines);
        assertEquals("## 工作经历", annotated.get(0).text());
        assertEquals("公司A", annotated.get(1).text());
        assertEquals("## 教育背景", annotated.get(3).text());
        assertEquals("专业技能", annotated.get(6).text(), "接近中位数的行不应被标记");
    }

    @Test
    void annotateHeadingsSkipsWhenTooFewSizes() {
        List<TextLine> lines = List.of(
                new TextLine("唯一一行", 0, 100, 10, 20f),
                new TextLine("第二行", 0, 100, 30, 10f));
        assertEquals(lines, LayoutAwarePdfTextExtractor.annotateHeadings(lines));
    }

    @Test
    void runsToLinesMergesRunsWithinTolerance() {
        List<LayoutAwarePdfTextExtractor.Run> runs = List.of(
                new LayoutAwarePdfTextExtractor.Run("姓名：张三", 0, 60, 100, 12f),
                new LayoutAwarePdfTextExtractor.Run("职位：工程师", 65, 130, 100.8f, 12f),   // 同行（y 差 0.8）
                new LayoutAwarePdfTextExtractor.Run("第二行文本", 0, 60, 110, 12f));         // 新行（y 差 ~9）
        List<TextLine> lines = LayoutAwarePdfTextExtractor.runsToLines(runs);

        assertEquals(2, lines.size());
        assertEquals("姓名：张三 职位：工程师", lines.get(0).text(), "gap>1.5 应补空格");
        assertEquals("第二行文本", lines.get(1).text());
    }

    /** 回归：左右两栏同视觉行的 run，若 y 排序后右栏 run 在前、左栏 run x 回退，不得拼成一行 */
    @Test
    void runsToLinesSplitsWhenXGoesBackwardAcrossColumns() {
        List<LayoutAwarePdfTextExtractor.Run> runs = List.of(
                // y 排序后右栏 run 先出现（y 略小），左栏 run 紧随（y 差 0.9 在容差内，x 回退）
                new LayoutAwarePdfTextExtractor.Run("项目经历", 195.6f, 245.6f, 360.9f, 12f),
                new LayoutAwarePdfTextExtractor.Run("2019-09 至 2023-06", 42.5f, 122.6f, 361.8f, 9f));
        List<TextLine> lines = LayoutAwarePdfTextExtractor.runsToLines(runs);

        assertEquals(2, lines.size(), "x 回退的 run 必须拆行，不得与右栏文字拼接");
        assertEquals("项目经历", lines.get(0).text());
        assertEquals("2019-09 至 2023-06", lines.get(1).text());
    }

    // ==================== 页眉页脚去重 ====================

    private static List<List<TextLine>> pagesOf(String[][] pagesText) {
        List<List<TextLine>> pages = new ArrayList<>();
        for (String[] texts : pagesText) {
            List<TextLine> lines = new ArrayList<>();
            float y = 10;
            for (String t : texts) {
                lines.add(new TextLine(t, 0, 100, y, 10f));
                y += 12;
            }
            pages.add(lines);
        }
        return pages;
    }

    @Test
    void repeatedHeaderKeptOnlyOnFirstPage() {
        List<List<TextLine>> pages = pagesOf(new String[][]{
                {"张三的简历", "教育经历", "内容A"},
                {"张三的简历", "实习经历", "内容B"},
                {"张三的简历", "项目经历", "内容C"},
        });
        LayoutAwarePdfTextExtractor.dropRepeatedHeaderFooterLines(pages);

        assertTrue(pages.get(0).stream().anyMatch(l -> l.text().equals("张三的简历")), "首页页眉保留");
        assertFalse(pages.get(1).stream().anyMatch(l -> l.text().equals("张三的简历")), "第 2 页页眉去除");
        assertFalse(pages.get(2).stream().anyMatch(l -> l.text().equals("张三的简历")), "第 3 页页眉去除");
        assertTrue(pages.get(1).stream().anyMatch(l -> l.text().equals("内容B")), "正文不受影响");
    }

    @Test
    void pageNumberLinesDroppedFromAllPages() {
        List<List<TextLine>> pages = pagesOf(new String[][]{
                {"正文一", "第 1 页 共 2 页"},
                {"正文二", "第 2 页 共 2 页"},
        });
        LayoutAwarePdfTextExtractor.dropPageNumberLines(pages);

        assertEquals(List.of("正文一"), pages.get(0).stream().map(TextLine::text).toList());
        assertEquals(List.of("正文二"), pages.get(1).stream().map(TextLine::text).toList());
    }

    @Test
    void bodyLineRepeatedOnTwoPagesOfManyIsKept() {
        // 5 页中只有 2 页出现的正文行（跨页续段）不应被当页眉删除（阈值 ≥ 半数页）
        List<List<TextLine>> pages = pagesOf(new String[][]{
                {"段首行"}, {"段首行"}, {"其他C"}, {"其他D"}, {"其他E"},
        });
        LayoutAwarePdfTextExtractor.dropRepeatedHeaderFooterLines(pages);
        assertTrue(pages.get(1).stream().anyMatch(l -> l.text().equals("段首行")));
    }

    /** 端到端：用 PDFBox 合成真实双栏 PDF（612x792 letter），验证抽取→列检测→重排→标题标注全链路 */
    @Test
    void extractEndToEndOnSyntheticTwoColumnPdf() throws Exception {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.LETTER);
            doc.addPage(page);

            PDType1Font bodyFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            PDType1Font titleFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);

            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                // 全宽标题（16pt，大字号 → 应被标注 "## "）
                writeLine(cs, titleFont, 16f, 50, 750, "John Doe Resume");
                // 左栏 x=50：联系方式 4 行（10pt）
                writeLine(cs, bodyFont, 10f, 50, 700, "Phone: 138-0013-8000");
                writeLine(cs, bodyFont, 10f, 50, 680, "Email: john@example.com");
                writeLine(cs, bodyFont, 10f, 50, 660, "City: Shanghai");
                writeLine(cs, bodyFont, 10f, 50, 640, "Skills: Java / Go / Redis");
                // 右栏 x=320：经历 4 行，与左栏 y 交错（sortByPosition 会交错并行的场景）
                writeLine(cs, bodyFont, 10f, 320, 700, "CompanyA Backend Engineer");
                writeLine(cs, bodyFont, 10f, 320, 680, "2021-01 present");
                writeLine(cs, bodyFont, 10f, 320, 660, "Order system, performance");
                writeLine(cs, bodyFont, 10f, 320, 640, "CompanyB Intern");
            }

            ExtractedText result = LayoutAwarePdfTextExtractor.extract(doc, 15);

            assertEquals(1, result.pageCount());
            assertTrue(result.columnLayoutDetected(), "合成双栏 PDF 应检测到双栏布局，实际输出:\n" + result.text());
            String text = result.text();
            assertTrue(text.contains("## John Doe Resume"), "16pt 标题应被字号标注，实际输出:\n" + text);
            // 阅读顺序：左栏整体先于右栏（ sortByPosition 会把 Phone 和 CompanyA 并成一行 ）
            assertTrue(text.indexOf("Phone") < text.indexOf("CompanyA"), "左栏应先于右栏，实际:\n" + text);
            assertTrue(text.indexOf("Skills") < text.indexOf("CompanyB"), "左栏末行应先于右栏末行，实际:\n" + text);
        }
    }

    private static void writeLine(PDPageContentStream cs, PDType1Font font, float size,
                                  float x, float y, String text) throws IOException {
        cs.beginText();
        cs.setFont(font, size);
        cs.newLineAtOffset(x, y);
        cs.showText(text);
        cs.endText();
    }

    /** 端到端：正文只写 "GitHub" 但挂了 Link annotation → 真实 URI 应以 "链接：" 行补出 */
    @Test
    void extractAppendsLinkAnnotationUrisNotAlreadyInText() throws Exception {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.LETTER);
            doc.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                writeLine(cs, new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12f, 50, 700, "GitHub");
                writeLine(cs, new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12f, 50, 680, "Blog: https://me.example.com");
            }
            // GitHub 挂链接 annotation；Blog 的 URI 已在正文出现，不应重复追加
            org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotationLink link =
                    new org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotationLink();
            org.apache.pdfbox.pdmodel.interactive.action.PDActionURI action =
                    new org.apache.pdfbox.pdmodel.interactive.action.PDActionURI();
            action.setURI("https://github.com/alice-coder");
            link.setAction(action);
            page.getAnnotations().add(link);

            ExtractedText result = LayoutAwarePdfTextExtractor.extract(doc, 15);

            assertTrue(result.text().contains("链接：https://github.com/alice-coder"),
                    "annotation URI 应以链接行补出，实际:\n" + result.text());
            assertFalse(result.text().contains("链接：https://me.example.com"),
                    "正文已有的 URI 不应重复追加");
        }
    }

    /** 单元级：appendLinkUris 去重 + 已在正文不重复 */
    @Test
    void appendLinkUrisDeduplicatesAndSkipsExisting() {
        StringBuilder out = new StringBuilder("正文行\n");
        List<TextLine> lines = List.of(
                new TextLine("GitHub", 0, 50, 100, 10f),
                new TextLine("Blog: https://visible.com", 0, 50, 120, 10f));
        LayoutAwarePdfTextExtractor.appendLinkUris(out, lines,
                java.util.Arrays.asList("https://github.com/a", "https://github.com/a", "https://visible.com"));

        assertEquals("正文行\n链接：https://github.com/a\n", out.toString());
    }
}
