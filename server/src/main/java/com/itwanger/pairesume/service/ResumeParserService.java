package com.itwanger.pairesume.service;

import com.itwanger.pairesume.dto.ParsedResumeDTO;

import java.io.InputStream;

/**
 * 简历 PDF 解析服务接口
 */
public interface ResumeParserService {

    /**
     * 解析 PDF 文件，提取简历结构化信息
     *
     * @param pdfInputStream PDF 文件输入流
     * @param fileName       文件名（用于日志）
     * @return 解析结果 DTO
     */
    ParsedResumeDTO parsePdf(InputStream pdfInputStream, String fileName);
}
