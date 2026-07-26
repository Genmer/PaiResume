package com.itwanger.pairesume.controller;

import com.itwanger.pairesume.common.BusinessException;
import com.itwanger.pairesume.common.Result;
import com.itwanger.pairesume.common.ResultCode;
import com.itwanger.pairesume.dto.ResumeShareStatusDTO;
import com.itwanger.pairesume.service.ResumeShareService;
import com.itwanger.pairesume.util.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "简历分享链接接口")
@RestController
@RequestMapping("/resumes")
@RequiredArgsConstructor
public class ResumeShareController {

    private final ResumeShareService resumeShareService;

    @Operation(summary = "查询分享状态")
    @GetMapping("/{id}/share")
    public Result<ResumeShareStatusDTO> getStatus(
            @Parameter(description = "简历 ID", required = true) @PathVariable Long id) {
        return Result.success(resumeShareService.getStatus(currentUserId(), id));
    }

    @Operation(summary = "开启分享", description = "首次开启生成分享 token，重新开启复用原 token")
    @PostMapping("/{id}/share/enable")
    public Result<ResumeShareStatusDTO> enable(
            @Parameter(description = "简历 ID", required = true) @PathVariable Long id) {
        return Result.success(resumeShareService.enable(currentUserId(), id));
    }

    @Operation(summary = "关闭分享", description = "关闭后分享链接立即失效")
    @PostMapping("/{id}/share/disable")
    public Result<ResumeShareStatusDTO> disable(
            @Parameter(description = "简历 ID", required = true) @PathVariable Long id) {
        return Result.success(resumeShareService.disable(currentUserId(), id));
    }

    private Long currentUserId() {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return userId;
    }
}
