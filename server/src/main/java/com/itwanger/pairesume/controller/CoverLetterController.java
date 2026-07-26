package com.itwanger.pairesume.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.itwanger.pairesume.common.BusinessException;
import com.itwanger.pairesume.common.Result;
import com.itwanger.pairesume.common.ResultCode;
import com.itwanger.pairesume.dto.CoverLetterResult;
import com.itwanger.pairesume.entity.Resume;
import com.itwanger.pairesume.entity.ResumeModule;
import com.itwanger.pairesume.mapper.ResumeMapper;
import com.itwanger.pairesume.mapper.ResumeModuleMapper;
import com.itwanger.pairesume.service.CoverLetterService;
import com.itwanger.pairesume.service.JdParseRateLimiter;
import com.itwanger.pairesume.service.impl.CoverLetterServiceImpl.CoverLetterException;
import com.itwanger.pairesume.util.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.StringJoiner;

@Slf4j
@Tag(name = "AI 求职信/自我介绍接口")
@RestController
@RequestMapping("/resumes")
@RequiredArgsConstructor
public class CoverLetterController {

    private final CoverLetterService coverLetterService;
    private final JdParseRateLimiter jdParseRateLimiter;
    private final ResumeMapper resumeMapper;
    private final ResumeModuleMapper moduleMapper;
    private final ObjectMapper objectMapper;

    @Operation(
            summary = "生成求职信/自我介绍",
            description = "基于简历内容生成求职信或面试自我介绍，可选提供目标岗位 JD 使内容更具针对性。与 JD 解析共享月度配额。"
    )
    @PostMapping("/{id}/cover-letter")
    public Result<CoverLetterResult> generate(
            @Parameter(description = "简历 ID", required = true)
            @PathVariable Long id,
            @Parameter(description = "生成参数: type=cover_letter/self_intro, tone=formal/friendly, jdText 可选")
            @RequestBody Map<String, String> body
    ) {
        String type = body != null ? body.get("type") : null;
        if (type == null || (!"cover_letter".equals(type) && !"self_intro".equals(type))) {
            return Result.error(400, "type 必须为 cover_letter 或 self_intro");
        }
        String tone = body.getOrDefault("tone", "formal");
        String jdText = body.get("jdText");

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
            return Result.error(400, "请先完善简历内容后再生成");
        }

        // 与 JD 解析共享月度配额；-1 表示不限次数
        int remaining = jdParseRateLimiter.getRemainingParses(userId);
        if (remaining != -1 && remaining <= 0) {
            throw new BusinessException(ResultCode.JD_PARSE_LIMIT_EXCEEDED);
        }

        String resumeContent = buildResumeContent(modules);
        log.info("[Cover Letter][Controller] request: resumeId={}, type={}, tone={}, resumeLength={}",
                id, type, tone, resumeContent.length());

        try {
            CoverLetterResult result = coverLetterService.generate(type, tone, jdText, resumeContent);
            jdParseRateLimiter.incrementParseCount(userId);
            return Result.success(result);
        } catch (CoverLetterException e) {
            log.warn("[Cover Letter][Controller] generate failed: {}", e.getMessage());
            return Result.error(400, e.getMessage());
        } catch (Exception e) {
            log.error("[Cover Letter][Controller] unexpected error", e);
            return Result.error(500, "生成失败: " + e.getMessage());
        }
    }

    private String buildResumeContent(List<ResumeModule> modules) {
        var joiner = new StringJoiner("\n\n");
        for (ResumeModule module : modules) {
            try {
                String json = objectMapper.writeValueAsString(module.getContent());
                joiner.add("【" + module.getModuleType() + "】\n" + json);
            } catch (Exception e) {
                log.warn("[Cover Letter][Controller] failed to serialize module: id={}, type={}", module.getId(), module.getModuleType());
            }
        }
        return joiner.toString();
    }
}
