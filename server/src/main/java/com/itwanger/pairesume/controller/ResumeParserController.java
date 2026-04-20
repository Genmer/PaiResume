package com.itwanger.pairesume.controller;

import com.itwanger.pairesume.common.Result;
import com.itwanger.pairesume.dto.ParsedResumeDTO;
import com.itwanger.pairesume.service.ResumeParserService;
import com.itwanger.pairesume.service.impl.ResumeParserServiceImpl.ResumeParseException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * 简历 PDF 解析 Controller
 * <p>
 * 提供 PDF 简历上传解析接口
 */
@Slf4j
@Tag(name = "简历解析接口")
@RestController
@RequestMapping("/resume")
@RequiredArgsConstructor
public class ResumeParserController {

    private final ResumeParserService resumeParserService;

    @Operation(
            summary = "解析 PDF 简历",
            description = "上传 PDF 简历文件，使用空间版面分析 + NLP 实体识别提取结构化信息"
    )
    @PostMapping("/parse")
    public Result<ParsedResumeDTO> parsePdf(
            @Parameter(description = "PDF 文件", required = true)
            @RequestParam("file") MultipartFile file
    ) {
        // 校验文件
        if (file.isEmpty()) {
            return Result.error(400, "请上传 PDF 文件");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !originalFilename.toLowerCase().endsWith(".pdf")) {
            return Result.error(400, "仅支持 PDF 格式文件");
        }

        // 校验文件大小（最大 10MB）
        if (file.getSize() > 10 * 1024 * 1024) {
            return Result.error(400, "文件大小不能超过 10MB");
        }

        log.info("Received PDF parse request: {}, size: {} bytes", originalFilename, file.getSize());

        try {
            ParsedResumeDTO result = resumeParserService.parsePdf(file.getInputStream(), originalFilename);
            return Result.success(result);
        } catch (ResumeParseException e) {
            log.warn("Resume parse failed: {}", e.getMessage());
            return Result.error(400, e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error during PDF parse", e);
            return Result.error(500, "PDF 解析失败: " + e.getMessage());
        }
    }
}
