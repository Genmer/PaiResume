package com.itwanger.pairesume.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ResumeTextCleanerTest {

    @Test
    void cleanTextNormalizesLineEndingsAndDropsNoiseLines() {
        String raw = "张三\r\n\r\n  \n• 后端工程师\n1、负责订单系统\n\n Java   /   Go\n-";
        String cleaned = ResumeTextCleaner.cleanText(raw);

        assertEquals("张三\n• 后端工程师\n1、负责订单系统\nJava / Go", cleaned);
    }

    @Test
    void cleanTextReturnsEmptyForNullOrBlank() {
        assertEquals("", ResumeTextCleaner.cleanText(null));
        assertEquals("", ResumeTextCleaner.cleanText("   \n \t "));
    }

    @Test
    void looksScannedDetectsImageOnlyPdf() {
        // 2 页只有 10 个字符：每页 5 字，远低于阈值 → 疑似扫描件
        assertTrue(ResumeTextCleaner.looksScanned(2, 10));
        // 1 页 200 字符的正常简历
        assertFalse(ResumeTextCleaner.looksScanned(1, 200));
        // 0 页（Word 等场景）不触发
        assertFalse(ResumeTextCleaner.looksScanned(0, 0));
    }

    @Test
    void garbledRatioDetectsCidAndPrivateUseArea() {
        // 一半字符是 (cid:1) 片段
        String cidText = "张三 (cid:1)(cid:2)(cid:3)";
        double ratio = ResumeTextCleaner.garbledRatio(cidText);
        assertTrue(ratio > ResumeTextCleanerTestHelper.maxRatio(),
                "cid 片段应显著拉高乱码率，实际=" + ratio);

        // 正常中文 + 英文文本乱码率为 0
        assertEquals(0.0, ResumeTextCleaner.garbledRatio("张三 后端工程师 Java/Go, 3年经验"));
        assertEquals(0.0, ResumeTextCleaner.garbledRatio(null));
    }

    @Test
    void isGarbledBeyondRecoveryUsesThreshold() {
        String heavy = "\uE001\uE002\uE003\uE004 张三丰";
        assertTrue(ResumeTextCleaner.isGarbledBeyondRecovery(heavy));

        String normal = "张三丰，后端工程师，5年经验，熟悉 Java/Go/Redis。";
        assertFalse(ResumeTextCleaner.isGarbledBeyondRecovery(normal));
    }

    @Test
    void capTextHardTruncates() {
        assertEquals("abc", ResumeTextCleaner.capText("abcdef", 3));
        assertEquals("abc", ResumeTextCleaner.capText("abc", 10));
        assertNull(ResumeTextCleaner.capText(null, 10));
    }

    /** 测试辅助：暴露阈值常量给断言消息 */
    static final class ResumeTextCleanerTestHelper {
        static double maxRatio() {
            return 0.2;
        }
    }
}
