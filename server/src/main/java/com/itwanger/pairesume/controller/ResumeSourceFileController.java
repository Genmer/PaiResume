package com.itwanger.pairesume.controller;

import com.itwanger.pairesume.common.BusinessException;
import com.itwanger.pairesume.common.Result;
import com.itwanger.pairesume.common.ResultCode;
import com.itwanger.pairesume.dto.ParsedResumeDTO;
import com.itwanger.pairesume.dto.ResumeSourceFileDTO;
import com.itwanger.pairesume.entity.ResumeSourceFile;
import com.itwanger.pairesume.service.ResumeSourceFileService;
import com.itwanger.pairesume.service.impl.ResumeParserServiceImpl.ResumeParseException;
import com.itwanger.pairesume.util.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;

/**
 * 简历导入原始文件存档接口
 * <p>
 * 导入简历时存档原始文件，之后可在编辑器中随时用原文件重新解析
 */
@Slf4j
@Tag(name = "简历原始文件存档接口")
@RestController
@RequestMapping("/resumes")
@RequiredArgsConstructor
public class ResumeSourceFileController {

    private final ResumeSourceFileService resumeSourceFileService;

    @Operation(summary = "上传原始文件存档", description = "导入简历成功后调用，把原始 PDF/Word 文件与简历绑定存档")
    @PostMapping("/{id}/source-file")
    public Result<ResumeSourceFileDTO> upload(
            @Parameter(description = "简历 ID", required = true) @PathVariable Long id,
            @Parameter(description = "原始文件", required = true) @RequestParam("file") MultipartFile file) {
        return Result.success(resumeSourceFileService.save(currentUserId(), id, file));
    }

    @Operation(summary = "查询存档元信息", description = "返回是否有存档、文件名、最近解析时间及解析后是否有手动修改")
    @GetMapping("/{id}/source-file")
    public Result<ResumeSourceFileDTO> getMeta(
            @Parameter(description = "简历 ID", required = true) @PathVariable Long id) {
        return Result.success(resumeSourceFileService.getMeta(currentUserId(), id));
    }

    @Operation(summary = "查看/下载原始文件", description = "返回存档的原始文件内容，PDF 可在浏览器内联预览")
    @GetMapping("/{id}/source-file/download")
    public ResponseEntity<byte[]> download(
            @Parameter(description = "简历 ID", required = true) @PathVariable Long id) {
        ResumeSourceFile archive = resumeSourceFileService.loadArchive(currentUserId(), id);
        boolean isPdf = "pdf".equals(archive.getFileType());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(isPdf
                ? MediaType.APPLICATION_PDF
                : MediaType.APPLICATION_OCTET_STREAM);
        // PDF 内联预览，Word 触发下载；文件名用 UTF-8 编码避免中文乱码
        headers.setContentDisposition(ContentDisposition.builder(isPdf ? "inline" : "attachment")
                .filename(archive.getFileName(), StandardCharsets.UTF_8)
                .build());
        return new ResponseEntity<>(archive.getFileData(), headers, HttpStatus.OK);
    }

    @Operation(summary = "用存档文件重新解析", description = "对存档的原始文件重新执行 AI 解析，仅返回解析结果，不修改简历内容")
    @PostMapping("/{id}/source-file/parse")
    public Result<ParsedResumeDTO> parse(
            @Parameter(description = "简历 ID", required = true) @PathVariable Long id) {
        try {
            return Result.success(resumeSourceFileService.parseArchived(currentUserId(), id));
        } catch (ResumeParseException e) {
            log.warn("Re-parse failed: resumeId={}, reason={}", id, e.getMessage());
            return Result.error(400, e.getMessage());
        }
    }

    @Operation(summary = "标记重新解析完成", description = "前端用解析结果重写模块后调用，刷新最近解析时间")
    @PostMapping("/{id}/source-file/mark-parsed")
    public Result<ResumeSourceFileDTO> markParsed(
            @Parameter(description = "简历 ID", required = true) @PathVariable Long id) {
        return Result.success(resumeSourceFileService.markParsed(currentUserId(), id));
    }

    private Long currentUserId() {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return userId;
    }
}
