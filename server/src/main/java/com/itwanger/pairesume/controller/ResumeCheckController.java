package com.itwanger.pairesume.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.itwanger.pairesume.common.BusinessException;
import com.itwanger.pairesume.common.Result;
import com.itwanger.pairesume.common.ResultCode;
import com.itwanger.pairesume.dto.ResumeCheckResult;
import com.itwanger.pairesume.entity.Resume;
import com.itwanger.pairesume.entity.ResumeModule;
import com.itwanger.pairesume.entity.User;
import com.itwanger.pairesume.mapper.ResumeMapper;
import com.itwanger.pairesume.mapper.ResumeModuleMapper;
import com.itwanger.pairesume.mapper.UserMapper;
import com.itwanger.pairesume.service.ResumeCheckService;
import com.itwanger.pairesume.service.impl.ResumeCheckServiceImpl.ResumeCheckException;
import com.itwanger.pairesume.util.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.StringJoiner;

@Slf4j
@Tag(name = "简历纠错检测接口")
@RestController
@RequestMapping("/resumes")
public class ResumeCheckController {

    private final ResumeCheckService resumeCheckService;
    private final ResumeMapper resumeMapper;
    private final ResumeModuleMapper moduleMapper;
    private final UserMapper userMapper;
    private final ObjectMapper objectMapper;

    public ResumeCheckController(
            ResumeCheckService resumeCheckService,
            ResumeMapper resumeMapper,
            ResumeModuleMapper moduleMapper,
            UserMapper userMapper,
            ObjectMapper objectMapper
    ) {
        this.resumeCheckService = resumeCheckService;
        this.resumeMapper = resumeMapper;
        this.moduleMapper = moduleMapper;
        this.userMapper = userMapper;
        this.objectMapper = objectMapper;
    }

    @Operation(
            summary = "简历纠错检测",
            description = "对简历内容进行全面审核，检查完整性、一致性和内容质量问题。会员用户获取详细报告，免费用户仅获取评分摘要。"
    )
    @PostMapping("/{id}/error-check")
    public Result<ResumeCheckResult> checkResume(
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
        log.info("[Resume Check][Controller] request: resumeId={}, contentLength={}", id, resumeContent.length());

        try {
            ResumeCheckResult result = resumeCheckService.checkResume(resumeContent);

            User user = userMapper.selectById(userId);
            boolean isMember = user != null && "ACTIVE".equals(user.getMembershipStatus());

            if (!isMember) {
                log.info("[Resume Check][Controller] free user, returning summary only");
                return Result.success(ResumeCheckResult.builder()
                        .score(result.getScore())
                        .issues(List.of())
                        .detailed(false)
                        .build());
            }

            return Result.success(result);
        } catch (ResumeCheckException e) {
            log.warn("[Resume Check][Controller] check failed: {}", e.getMessage());
            return Result.error(400, e.getMessage());
        } catch (Exception e) {
            log.error("[Resume Check][Controller] unexpected error", e);
            return Result.error(500, "简历检测失败: " + e.getMessage());
        }
    }

    private String buildResumeContent(List<ResumeModule> modules) {
        var joiner = new StringJoiner("\n\n");
        for (ResumeModule module : modules) {
            try {
                String json = objectMapper.writeValueAsString(module.getContent());
                joiner.add("【" + module.getModuleType() + "】\n" + json);
            } catch (Exception e) {
                log.warn("[Resume Check][Controller] failed to serialize module: id={}, type={}", module.getId(), module.getModuleType());
            }
        }
        return joiner.toString();
    }
}
