package com.itwanger.pairesume.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.itwanger.pairesume.common.BusinessException;
import com.itwanger.pairesume.common.MembershipTier;
import com.itwanger.pairesume.common.Result;
import com.itwanger.pairesume.common.ResultCode;
import com.itwanger.pairesume.dto.JdMatchResult;
import com.itwanger.pairesume.entity.Resume;
import com.itwanger.pairesume.entity.ResumeModule;
import com.itwanger.pairesume.entity.User;
import com.itwanger.pairesume.mapper.ResumeMapper;
import com.itwanger.pairesume.mapper.ResumeModuleMapper;
import com.itwanger.pairesume.mapper.UserMapper;
import com.itwanger.pairesume.service.JdMatchService;
import com.itwanger.pairesume.service.JdParseRateLimiter;
import com.itwanger.pairesume.service.impl.JdMatchServiceImpl.JdMatchException;
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
@Tag(name = "JD 匹配度分析接口")
@RestController
@RequestMapping("/resumes")
@RequiredArgsConstructor
public class JdMatchController {

    private final JdMatchService jdMatchService;
    private final JdParseRateLimiter jdParseRateLimiter;
    private final ResumeMapper resumeMapper;
    private final ResumeModuleMapper moduleMapper;
    private final UserMapper userMapper;
    private final ObjectMapper objectMapper;

    @Operation(
            summary = "JD-简历匹配度分析",
            description = "将 JD 文本与当前简历内容一起交给 AI，输出匹配分、技能覆盖/缺失清单和针对性修改建议。免费用户仅返回分数与摘要，会员返回完整报告。与 JD 解析共享月度配额。"
    )
    @PostMapping("/{id}/jd-match")
    public Result<JdMatchResult> matchJd(
            @Parameter(description = "简历 ID", required = true)
            @PathVariable Long id,
            @Parameter(description = "JD 文本", required = true)
            @RequestBody Map<String, String> body
    ) {
        String jdText = body != null ? body.get("jdText") : null;
        if (jdText == null || jdText.isBlank()) {
            return Result.error(400, "请提供 JD 文本内容");
        }

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
            return Result.error(400, "请先完善简历内容后再进行匹配分析");
        }

        // 与 JD 解析共享月度配额；-1 表示不限次数
        int remaining = jdParseRateLimiter.getRemainingParses(userId);
        if (remaining != -1 && remaining <= 0) {
            throw new BusinessException(ResultCode.JD_PARSE_LIMIT_EXCEEDED);
        }

        String resumeContent = buildResumeContent(modules);
        log.info("[JD Match][Controller] request: resumeId={}, jdLength={}, resumeLength={}",
                id, jdText.length(), resumeContent.length());

        try {
            JdMatchResult result = jdMatchService.matchResume(jdText, resumeContent);
            jdParseRateLimiter.incrementParseCount(userId);

            User user = userMapper.selectById(userId);
            boolean isMember = user != null
                    && MembershipTier.fromStatus(user.getMembershipStatus()) != MembershipTier.FREE;

            if (!isMember) {
                log.info("[JD Match][Controller] free user, returning score and summary only");
                return Result.success(JdMatchResult.builder()
                        .matchScore(result.getMatchScore())
                        .summary(result.getSummary())
                        .matchedSkills(List.of())
                        .missingSkills(List.of())
                        .suggestions(List.of())
                        .detailed(false)
                        .build());
            }

            return Result.success(result);
        } catch (JdMatchException e) {
            log.warn("[JD Match][Controller] match failed: {}", e.getMessage());
            return Result.error(400, e.getMessage());
        } catch (Exception e) {
            log.error("[JD Match][Controller] unexpected error", e);
            return Result.error(500, "JD 匹配分析失败: " + e.getMessage());
        }
    }

    private String buildResumeContent(List<ResumeModule> modules) {
        var joiner = new StringJoiner("\n\n");
        for (ResumeModule module : modules) {
            try {
                String json = objectMapper.writeValueAsString(module.getContent());
                joiner.add("【" + module.getModuleType() + "】\n" + json);
            } catch (Exception e) {
                log.warn("[JD Match][Controller] failed to serialize module: id={}, type={}", module.getId(), module.getModuleType());
            }
        }
        return joiner.toString();
    }
}
