package com.itwanger.pairesume.util;

/**
 * 简历文本清洗与质量检测工具。
 * <p>
 * 负责在把 PDF/Word 抽取文本交给 AI 之前做三件事：
 * 1. 规整行文（去空行、压缩行内空白、丢弃单字符噪声行）
 * 2. 检测扫描件/图片型 PDF（按页均文字量判定）
 * 3. 检测乱码（PDFBox 对无 ToUnicode 映射的内嵌字体输出 "(cid:xx)" 或私有区字符）
 */
public final class ResumeTextCleaner {

    /** 平均每页少于该字符数视为疑似扫描件/图片型 PDF */
    static final int MIN_CHARS_PER_PAGE = 30;

    /** 乱码字符占比超过该阈值视为编码异常 */
    static final double MAX_GARBLED_RATIO = 0.2;

    private ResumeTextCleaner() {
    }

    /**
     * 规整抽取文本：统一换行、去空行、行内空白压缩为单空格、丢弃孤立符号行。
     */
    public static String cleanText(String rawText) {
        if (rawText == null || rawText.isBlank()) {
            return "";
        }

        String normalized = rawText.replace("\r\n", "\n").replace('\r', '\n');
        StringBuilder builder = new StringBuilder(normalized.length());
        String[] lines = normalized.split("\n");

        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) {
                continue;
            }

            String compacted = trimmed.replaceAll("\\s+", " ");
            if (compacted.length() == 1 && !Character.isLetterOrDigit(compacted.charAt(0))) {
                continue;
            }

            if (!builder.isEmpty()) {
                builder.append('\n');
            }
            builder.append(compacted);
        }

        return builder.toString().trim();
    }

    /**
     * 按页均文字量判断是否疑似扫描件/图片型 PDF。
     */
    public static boolean looksScanned(int pageCount, int textLength) {
        if (pageCount <= 0) {
            return false;
        }
        return textLength / (double) pageCount < MIN_CHARS_PER_PAGE;
    }

    /**
     * 计算乱码字符占比：
     * - Unicode 私有使用区字符 (U+E000..U+F8FF)
     * - 替换字符 U+FFFD
     * - PDFBox 无法映射字形时输出的 "(cid:xx)" 片段（按 3 个乱码字符计）
     * 分母为非空白字符数。文本过短时返回 0。
     */
    public static double garbledRatio(String text) {
        if (text == null || text.isEmpty()) {
            return 0.0;
        }

        int total = 0;
        int garbled = 0;
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (Character.isWhitespace(c)) {
                continue;
            }
            total++;
            if (isGarbledChar(c)) {
                garbled++;
            }
        }

        int cidCount = countOccurrences(text, "(cid:");
        garbled += cidCount * 3;

        if (total == 0) {
            return 0.0;
        }
        return Math.min(1.0, garbled / (double) total);
    }

    /**
     * 是否超过乱码阈值。
     */
    public static boolean isGarbledBeyondRecovery(String text) {
        return garbledRatio(text) > MAX_GARBLED_RATIO;
    }

    /**
     * 限制送入 AI 的文本长度，防止超长 PDF 撑爆 prompt。
     */
    public static String capText(String text, int maxChars) {
        if (text == null || text.length() <= maxChars) {
            return text;
        }
        return text.substring(0, maxChars);
    }

    private static boolean isGarbledChar(char c) {
        return c == '\uFFFD' || (c >= '\uE000' && c <= '\uF8FF');
    }

    private static int countOccurrences(String text, String token) {
        int count = 0;
        int index = 0;
        while ((index = text.indexOf(token, index)) >= 0) {
            count++;
            index += token.length();
        }
        return count;
    }
}
