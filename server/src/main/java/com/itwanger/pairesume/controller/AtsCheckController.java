package com.itwanger.pairesume.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.itwanger.pairesume.common.BusinessException;
import com.itwanger.pairesume.common.Result;
import com.itwanger.pairesume.common.ResultCode;
import com.itwanger.pairesume.dto.AtsCheckResult;
import com.itwanger.pairesume.entity.Resume;
import com.itwanger.pairesume.entity.ResumeModule;
import com.itwanger.pairesume.mapper.ResumeMapper;
import com.itwanger.pairesume.mapper.ResumeModuleMapper;
import com.itwanger.pairesume.service.AtsCheckService;
import com.itwanger.pairesume.service.impl.AtsCheckServiceImpl.AtsCheckException;
import com.itwanger.pairesume.util.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.StringJoiner;

@Slf4j
@Tag(name = "ATS兼容性检测接口")
@RestController
@RequestMapping("/resumes")
public class AtsCheckController {

    private final AtsCheckService atsCheckService;
    private final ResumeMapper resumeMapper;
    private final ResumeModuleMapper moduleMapper;
    private final ObjectMapper objectMapper;

    public AtsCheckController(
            AtsCheckService atsCheckService,
            ResumeMapper resumeMapper,
            ResumeModuleMapper moduleMapper,
            ObjectMapper objectMapper
    ) {
        this.atsCheckService = atsCheckService;
        this.resumeMapper = resumeMapper;
        this.moduleMapper = moduleMapper;
        this.objectMapper = objectMapper;
    }

    @Operation(
            summary = "ATS兼容性检测",
            description = "对简历内容进行ATS（求职者跟踪系统）兼容性全面审查，包括排版格式、关键词覆盖、章节结构、联系方式和文件兼容性五个维度的评估。所有用户均可使用。"
    )
    @PostMapping("/{id}/ats-check")
    public Result<AtsCheckResult> checkAts(
            @Parameter(description = "简历 ID", required = true)
            @PathVariable Long id
    ) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }

        Resume resume = resumeMapper.selectById(id);
        if (resume == null || !resume.getUserId().equals(userId) || resume.getStatus() == 0) {
            throw new BusinessException(ResultCode.RESUME_NOT_FOUND);
        }

        List<ResumeModule> modules = moduleMapper.selectList(
                new LambdaQueryWrapper<ResumeModule>()
                        .eq(ResumeModule::getResumeId, id)
                        .orderByAsc(ResumeModule::getSortOrder)
                        .orderByAsc(ResumeModule::getId)
        );

        if (modules.isEmpty()) {
            return Result.error(400, "请先完善简历内容后再进行检测");
        }

        String resumeContent = buildResumeContent(modules);
        log.info("[ATS Check][Controller] request: resumeId={}, contentLength={}", id, resumeContent.length());

        try {
            AtsCheckResult result = atsCheckService.checkAts(resumeContent);
            return Result.success(result);
        } catch (AtsCheckException e) {
            log.warn("[ATS Check][Controller] check failed: {}", e.getMessage());
            return Result.error(400, e.getMessage());
        } catch (Exception e) {
            log.error("[ATS Check][Controller] unexpected error", e);
            return Result.error(500, "ATS检测失败: " + e.getMessage());
        }
    }

    private String buildResumeContent(List<ResumeModule> modules) {
        var joiner = new StringJoiner("\n\n");
        for (ResumeModule module : modules) {
            try {
                String json = objectMapper.writeValueAsString(module.getContent());
                joiner.add("【" + module.getModuleType() + "】\n" + json);
            } catch (Exception e) {
                log.warn("[ATS Check][Controller] failed to serialize module: id={}, type={}", module.getId(), module.getModuleType());
            }
        }
        return joiner.toString();
    }
}
