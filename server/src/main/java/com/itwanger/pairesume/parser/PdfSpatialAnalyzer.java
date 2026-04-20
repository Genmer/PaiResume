package com.itwanger.pairesume.parser;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;

import java.io.IOException;
import java.io.InputStream;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * PDF 空间版面分析引擎
 * <p>
 * 核心能力：
 * 1. 通过重写 processTextPosition 拦截每个 TextPosition，获取坐标、字号、文本
 * 2. 基于 Y 轴间距突变分割文档为区块（AOI）
 * 3. 识别姓名（首页最大字号文本）
 * 4. 提取联系方式（正则匹配）
 */
@Slf4j
public class PdfSpatialAnalyzer {

    private static final float LINE_GAP_THRESHOLD = 15.0f; // Y 轴间距突变阈值
    private static final float NAME_AREA_RATIO = 0.35f; // 姓名识别区域（首页上部 35%）

    // 区块类型关键词
    private static final Set<String> EDUCATION_KEYWORDS = Set.of(
            "教育", "学历", "大学", "学院", "本科", "硕士", "博士", "研究生", "学士",
            "Bachelor", "Master", "PhD", "University", "College"
    );

    private static final Set<String> EXPERIENCE_KEYWORDS = Set.of(
            "工作", "实习", "经历", "任职", "职位", "职务", "公司", "企业",
            "Experience", "Work", "Intern", "Employment"
    );

    private static final Set<String> PROJECT_KEYWORDS = Set.of(
            "项目", "Project"
    );

    private static final Set<String> SKILL_KEYWORDS = Set.of(
            "技能", "专长", "能力", "技术", "栈",
            "Skill", "Skills", "Technical"
    );

    /**
     * 分析 PDF 文件，返回结构化文本块
     */
    public AnalysisResult analyze(InputStream pdfInputStream) throws IOException {
        try (PDDocument document = Loader.loadPDF(pdfInputStream.readAllBytes())) {
            SpatialTextStripper stripper = new SpatialTextStripper();
            stripper.setSortByPosition(true);

            String rawText = stripper.getText(document);

            List<TextBlock> allBlocks = stripper.getTextBlocks();
            List<Section> sections = segmentSections(allBlocks, document.getNumberOfPages());

            return AnalysisResult.builder()
                    .rawText(rawText)
                    .blocks(allBlocks)
                    .sections(sections)
                    .name(extractedName(allBlocks, document))
                    .email(extractedEmail(rawText))
                    .phone(extractedPhone(rawText))
                    .github(extractedGithub(rawText))
                    .build();
        }
    }

    /**
     * 姓名提取：首页上部区域中，找最大字号且独立成行的文本
     */
    private String extractedName(List<TextBlock> blocks, PDDocument document) {
        if (blocks.isEmpty()) {
            return null;
        }

        // 获取首页高度（用于计算姓名区域）
        float pageHeight = 792; // 默认 A4 纵向高度（72 DPI）
        try {
            if (document.getPages().getCount() > 0) {
                pageHeight = document.getPages().get(0).getMediaBox().getHeight();
            }
        } catch (Exception e) {
            log.warn("Failed to get page height, using default", e);
        }

        float nameAreaBottom = pageHeight * NAME_AREA_RATIO;

        // 过滤姓名候选：位于首页上部，字号较大
        List<TextBlock> candidates = blocks.stream()
                .filter(b -> b.getY() > nameAreaBottom) // Y 坐标大 = 靠上
                .filter(b -> b.getFontSize() > 10) // 字号至少 10pt
                .filter(b -> b.getText().trim().length() >= 2) // 至少 2 个字符
                .filter(b -> b.getText().trim().length() <= 10) // 最多 10 个字符
                .filter(b -> !containsContactInfo(b.getText())) // 排除联系方式
                .collect(Collectors.toList());

        if (candidates.isEmpty()) {
            return null;
        }

        // 按字号降序，取最大的
        candidates.sort((a, b) -> Float.compare(b.getFontSize(), a.getFontSize()));

        String name = candidates.get(0).getText().trim();
        log.debug("Extracted name: {} (font size: {})", name, candidates.get(0).getFontSize());

        return name;
    }

    /**
     * 基于 Y 轴间距突变分割文档为多个区块
     */
    private List<Section> segmentSections(List<TextBlock> blocks, int totalPages) {
        if (blocks.isEmpty()) {
            return Collections.emptyList();
        }

        List<Section> sections = new ArrayList<>();
        List<TextBlock> currentBlocks = new ArrayList<>();
        SectionType currentType = null;

        // 按 Y 坐标排序（从顶到底）
        List<TextBlock> sortedBlocks = blocks.stream()
                .sorted(Comparator.comparing(TextBlock::getY).reversed())
                .collect(Collectors.toList());

        float prevY = sortedBlocks.get(0).getY();

        for (TextBlock block : sortedBlocks) {
            float gap = prevY - block.getY();

            // 检测 Y 轴间距突变
            if (gap > LINE_GAP_THRESHOLD && !currentBlocks.isEmpty()) {
                // 保存当前区块
                SectionType type = detectSectionType(currentBlocks);
                sections.add(Section.builder()
                        .type(type)
                        .blocks(new ArrayList<>(currentBlocks))
                        .text(blocksToText(currentBlocks))
                        .build());

                currentBlocks.clear();
                currentType = null;
            }

            // 检测区块类型
            SectionType detectedType = detectSectionTypeFromBlock(block);
            if (detectedType != null && currentType == null) {
                currentType = detectedType;
            }

            currentBlocks.add(block);
            prevY = block.getY();
        }

        // 保存最后一个区块
        if (!currentBlocks.isEmpty()) {
            SectionType type = currentType != null ? currentType : detectSectionType(currentBlocks);
            sections.add(Section.builder()
                    .type(type)
                    .blocks(new ArrayList<>(currentBlocks))
                    .text(blocksToText(currentBlocks))
                    .build());
        }

        log.info("Segmented {} sections from {} blocks", sections.size(), blocks.size());
        return sections;
    }

    /**
     * 根据区块内容检测区块类型
     */
    private SectionType detectSectionType(List<TextBlock> blocks) {
        String text = blocksToText(blocks).toLowerCase();

        if (EDUCATION_KEYWORDS.stream().anyMatch(text::contains)) {
            return SectionType.EDUCATION;
        }
        if (PROJECT_KEYWORDS.stream().anyMatch(text::contains)) {
            return SectionType.PROJECT;
        }
        if (SKILL_KEYWORDS.stream().anyMatch(text::contains)) {
            return SectionType.SKILL;
        }
        if (EXPERIENCE_KEYWORDS.stream().anyMatch(text::contains)) {
            return SectionType.EXPERIENCE;
        }

        return SectionType.OTHER;
    }

    /**
     * 根据单个文本块检测区块类型
     */
    private SectionType detectSectionTypeFromBlock(TextBlock block) {
        String text = block.getText();

        if (EDUCATION_KEYWORDS.stream().anyMatch(text::contains)) {
            return SectionType.EDUCATION;
        }
        if (PROJECT_KEYWORDS.stream().anyMatch(text::contains)) {
            return SectionType.PROJECT;
        }
        if (SKILL_KEYWORDS.stream().anyMatch(text::contains)) {
            return SectionType.SKILL;
        }
        if (EXPERIENCE_KEYWORDS.stream().anyMatch(text::contains)) {
            return SectionType.EXPERIENCE;
        }

        return null;
    }

    /**
     * 将文本块列表合并为纯文本
     */
    private String blocksToText(List<TextBlock> blocks) {
        return blocks.stream()
                .sorted(Comparator.comparing(TextBlock::getY).reversed()
                        .thenComparing(TextBlock::getX))
                .map(TextBlock::getText)
                .collect(Collectors.joining(" "));
    }

    /**
     * 检查文本是否包含联系方式
     */
    private boolean containsContactInfo(String text) {
        return extractedEmail(text) != null
                || extractedPhone(text) != null
                || extractedGithub(text) != null;
    }

    /**
     * 邮箱正则
     */
    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})");

    private String extractedEmail(String text) {
        Matcher m = EMAIL_PATTERN.matcher(text);
        return m.find() ? m.group(1) : null;
    }

    /**
     * 手机号正则（支持多种格式）
     */
    private static final Pattern PHONE_PATTERN =
            Pattern.compile("(1[3-9]\\d{9}|(?:\\+?86[- ]?)?1[3-9]\\d{9}|(?:0?\\d{2,3}[- ]?)?\\d{7,8})");

    private String extractedPhone(String text) {
        Matcher m = PHONE_PATTERN.matcher(text);
        return m.find() ? m.group(1).replaceAll("\\s", "") : null;
    }

    /**
     * GitHub 正则
     */
    private static final Pattern GITHUB_PATTERN =
            Pattern.compile("(?:github\\.com/|@)([a-zA-Z0-9-_]+)");

    private String extractedGithub(String text) {
        Matcher m = GITHUB_PATTERN.matcher(text);
        return m.find() ? "https://github.com/" + m.group(1) : null;
    }

    // ==================== Inner Classes ====================

    /**
     * 文本块：包含坐标、字号、文本内容
     */
    @Data
    public static class TextBlock {
        private String text;
        private float x;
        private float y;
        private float fontSize;
        private int pageNumber;

        public TextBlock(String text, float x, float y, float fontSize, int pageNumber) {
            this.text = text;
            this.x = x;
            this.y = y;
            this.fontSize = fontSize;
            this.pageNumber = pageNumber;
        }
    }

    /**
     * 区块类型
     */
    public enum SectionType {
        BASIC_INFO,    // 基本信息
        EDUCATION,     // 教育经历
        EXPERIENCE,    // 工作/实习经历
        PROJECT,       // 项目经历
        SKILL,         // 技能
        OTHER          // 其他
    }

    /**
     * 区块：包含类型和文本块列表
     */
    @Data
    @lombok.Builder
    public static class Section {
        private SectionType type;
        private List<TextBlock> blocks;
        private String text;
    }

    /**
     * 分析结果
     */
    @Data
    @lombok.Builder
    public static class AnalysisResult {
        private String rawText;
        private List<TextBlock> blocks;
        private List<Section> sections;
        private String name;
        private String email;
        private String phone;
        private String github;
    }

    /**
     * 自定义 TextStripper，拦截每个 TextPosition
     */
    private static class SpatialTextStripper extends PDFTextStripper {
        private final List<TextBlock> textBlocks = new ArrayList<>();

        public SpatialTextStripper() throws IOException {
            super();
        }

        public List<TextBlock> getTextBlocks() {
            return new ArrayList<>(textBlocks);
        }

        @Override
        protected void processTextPosition(TextPosition textPosition) {
            String text = textPosition.getUnicode();
            if (text == null || text.trim().isEmpty()) {
                super.processTextPosition(textPosition);
                return;
            }

            float x = textPosition.getXDirAdj();
            float y = textPosition.getYDirAdj();
            float fontSize = textPosition.getFontSize();

            // 获取实际字体大小（有些 PDF 使用负值表示加粗等）
            if (fontSize == 0) {
                fontSize = Math.abs(textPosition.getFontSizeInPt());
            }

            textBlocks.add(new TextBlock(
                    text,
                    x,
                    y,
                    fontSize,
                    getCurrentPageNo()
            ));

            super.processTextPosition(textPosition);
        }
    }
}
