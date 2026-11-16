package com.itwanger.pairesume.util;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;

/** 临时人工验证：对 tmp-verify/ 下的真实生成 PDF 打印抽取结果（目录不存在时自动跳过） */
class PdfExtractionManualCheckTest {

    @Test
    void printExtractionForManualReview() throws Exception {
        Path dir = Path.of("../tmp-verify");
        Assumptions.assumeTrue(Files.isDirectory(dir), "tmp-verify 目录不存在，跳过");
        try (Stream<Path> files = Files.list(dir)) {
            files.filter(p -> p.toString().endsWith(".pdf")).sorted().forEach(p -> {
                try {
                    LayoutAwarePdfTextExtractor.ExtractedText result =
                            LayoutAwarePdfTextExtractor.extract(Files.readAllBytes(p), 15);
                    System.out.println("\n===== " + p.getFileName()
                            + " | pages=" + result.pageCount()
                            + " | columnLayout=" + result.columnLayoutDetected() + " =====");
                    System.out.println(result.text());
                    System.out.println("<<< END " + p.getFileName() + " >>>");
                } catch (Exception e) {
                    System.out.println("\n===== " + p.getFileName() + " | FAILED: " + e.getMessage());
                }
            });
        }
    }
}
