package com.itwanger.pairesume.service.impl;

import com.itwanger.pairesume.dto.ParsedResumeDTO;
import com.itwanger.pairesume.parser.PdfSpatialAnalyzer;
import com.itwanger.pairesume.parser.ResumeNlpProcessor;
import com.itwanger.pairesume.service.ResumeParserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;

/**
 * 简历 PDF 解析服务实现
 * <p>
 * 流程：
 * 1. PDFBox 空间版面分析 → 提取坐标、字号、文本块、分割区块
 * 2. HanLP NLP 处理 → 词性标注、命名实体识别、提取学校/公司/职位/技能
 * 3. 正则兜底 → 邮箱、手机号、GitHub 等标准化字段
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ResumeParserServiceImpl implements ResumeParserService {

    private final PdfSpatialAnalyzer spatialAnalyzer;
    private final ResumeNlpProcessor nlpProcessor;

    public ResumeParserServiceImpl() {
        this.spatialAnalyzer = new PdfSpatialAnalyzer();
        this.nlpProcessor = new ResumeNlpProcessor();
    }

    @Override
    public ParsedResumeDTO parsePdf(InputStream pdfInputStream, String fileName) {
        log.info("Starting PDF parse for file: {}", fileName);

        try {
            // Step 1: 空间版面分析
            PdfSpatialAnalyzer.AnalysisResult analysisResult = spatialAnalyzer.analyze(pdfInputStream);
            log.debug("Spatial analysis complete. Blocks: {}, Sections: {}",
                    analysisResult.getBlocks().size(),
                    analysisResult.getSections().size());

            // Step 2: NLP 实体提取
            ParsedResumeDTO result = nlpProcessor.process(analysisResult);
            log.info("NLP processing complete. Name: {}, Educations: {}, Experiences: {}, Skills: {}",
                    result.getBasicInfo() != null ? result.getBasicInfo().getName() : "N/A",
                    result.getEducations() != null ? result.getEducations().size() : 0,
                    result.getExperiences() != null ? result.getExperiences().size() : 0,
                    result.getSkills() != null ? result.getSkills().size() : 0);

            return result;

        } catch (InvalidPasswordException e) {
            log.error("PDF is encrypted and requires password: {}", fileName, e);
            throw new ResumeParseException("PDF 文件已加密，请提供密码或导出未加密的 PDF", e);
        } catch (IOException e) {
            log.error("Failed to parse PDF file: {}", fileName, e);
            throw new ResumeParseException("PDF 文件解析失败，可能是文件损坏或格式不支持: " + e.getMessage(), e);
        }
    }

    /**
     * 解析异常
     */
    public static class ResumeParseException extends RuntimeException {
        public ResumeParseException(String message) {
            super(message);
        }

        public ResumeParseException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
