package com.itwanger.pairesume.controller;

import com.itwanger.pairesume.common.Result;
import com.itwanger.pairesume.dto.*;
import com.itwanger.pairesume.entity.ActivationCode;
import com.itwanger.pairesume.entity.ResumeShowcase;
import com.itwanger.pairesume.service.ActivityConfigService;
import com.itwanger.pairesume.service.*;
import com.itwanger.pairesume.util.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Tag(name = "管理后台接口")
@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {
    private final PlatformConfigService platformConfigService;
    private final ActivityConfigService activityConfigService;
    private final FeedbackSubmissionService feedbackSubmissionService;
    private final CouponService couponService;
    private final MembershipService membershipService;
    private final ResumeShowcaseService resumeShowcaseService;
    private final ActivationCodeService activationCodeService;
    private final AnalyticsService analyticsService;

    @Operation(summary = "获取平台配置")
    @GetMapping("/platform-config")
    public Result<PlatformConfigDTO> getPlatformConfig() {
        return Result.success(platformConfigService.getConfig());
    }

    @Operation(summary = "更新平台配置")
    @PutMapping("/platform-config")
    public Result<PlatformConfigDTO> updatePlatformConfig(@Valid @RequestBody PlatformConfigDTO dto) {
        return Result.success(platformConfigService.updateConfig(SecurityUtils.getCurrentUserId(), dto));
    }

    @Operation(summary = "获取活动配置")
    @GetMapping("/activity-config")
    public Result<ActivityConfigDTO> getActivityConfig() {
        return Result.success(activityConfigService.getConfig());
    }

    @Operation(summary = "更新活动配置")
    @PutMapping("/activity-config")
    public Result<ActivityConfigDTO> updateActivityConfig(@Valid @RequestBody ActivityConfigDTO dto) {
        return Result.success(activityConfigService.updateConfig(SecurityUtils.getCurrentUserId(), dto));
    }

    @Operation(summary = "获取问卷列表")
    @GetMapping("/feedback-submissions")
    public Result<List<FeedbackSubmissionAdminDTO>> listFeedbackSubmissions() {
        return Result.success(feedbackSubmissionService.listAdminSubmissions());
    }

    @Operation(summary = "通过问卷并发放优惠码")
    @PostMapping("/feedback-submissions/{id}/approve")
    public Result<FeedbackSubmissionAdminDTO> approveFeedback(@PathVariable Long id,
                                                              @RequestBody(required = false) ApproveFeedbackSubmissionDTO dto) {
        return Result.success(feedbackSubmissionService.approve(id, SecurityUtils.getCurrentUserId(), dto));
    }

    @Operation(summary = "拒绝问卷")
    @PostMapping("/feedback-submissions/{id}/reject")
    public Result<FeedbackSubmissionAdminDTO> rejectFeedback(@PathVariable Long id,
                                                             @Valid @RequestBody RejectFeedbackSubmissionDTO dto) {
        return Result.success(feedbackSubmissionService.reject(id, SecurityUtils.getCurrentUserId(), dto));
    }

    @Operation(summary = "发布评价")
    @PostMapping("/feedback-submissions/{id}/publish")
    public Result<FeedbackSubmissionAdminDTO> publishFeedback(@PathVariable Long id) {
        return Result.success(feedbackSubmissionService.publish(id, SecurityUtils.getCurrentUserId()));
    }

    @Operation(summary = "下线评价")
    @PostMapping("/feedback-submissions/{id}/unpublish")
    public Result<FeedbackSubmissionAdminDTO> unpublishFeedback(@PathVariable Long id) {
        return Result.success(feedbackSubmissionService.unpublish(id, SecurityUtils.getCurrentUserId()));
    }

    @Operation(summary = "重发优惠码")
    @PostMapping("/feedback-submissions/{id}/resend-coupon")
    public Result<FeedbackSubmissionAdminDTO> resendCoupon(@PathVariable Long id) {
        return Result.success(feedbackSubmissionService.resendCoupon(id, SecurityUtils.getCurrentUserId()));
    }

    @Operation(summary = "获取优惠码列表")
    @GetMapping("/coupons")
    public Result<List<CouponAdminDTO>> listCoupons() {
        return Result.success(couponService.listCoupons());
    }

    @Operation(summary = "获取用户列表")
    @GetMapping("/users")
    public Result<List<UserAdminDTO>> listUsers() {
        return Result.success(membershipService.listUsers());
    }

    @Operation(summary = "手工开通会员")
    @PostMapping("/users/{id}/membership/grant")
    public Result<UserAdminDTO> grantMembership(@PathVariable Long id,
                                                @RequestBody GrantMembershipDTO dto) {
        return Result.success(membershipService.grantMembership(id, SecurityUtils.getCurrentUserId(),
                dto.getTier(), dto.getDurationDays()));
    }

    @Operation(summary = "撤销会员")
    @PostMapping("/users/{id}/membership/revoke")
    public Result<UserAdminDTO> revokeMembership(@PathVariable Long id) {
        return Result.success(membershipService.revokeMembership(id, SecurityUtils.getCurrentUserId()));
    }

    @Operation(summary = "获取样例列表")
    @GetMapping("/showcases")
    public Result<List<ResumeShowcase>> listShowcases() {
        return Result.success(resumeShowcaseService.listAdminShowcases());
    }

    @Operation(summary = "创建样例")
    @PostMapping("/showcases")
    public Result<ResumeShowcase> createShowcase(@Valid @RequestBody ResumeShowcaseUpsertDTO dto) {
        return Result.success(resumeShowcaseService.create(SecurityUtils.getCurrentUserId(), dto));
    }

    @Operation(summary = "更新样例")
    @PutMapping("/showcases/{id}")
    public Result<ResumeShowcase> updateShowcase(@PathVariable Long id,
                                                 @Valid @RequestBody ResumeShowcaseUpsertDTO dto) {
        return Result.success(resumeShowcaseService.update(id, SecurityUtils.getCurrentUserId(), dto));
    }

    @Operation(summary = "创建激活码")
    @PostMapping("/activation-codes")
    public Result<List<ActivationCodeAdminDTO>> createActivationCodes(
            @Valid @RequestBody ActivationCodeCreateDTO dto) {
        List<ActivationCode> codes = activationCodeService.createCodes(
                SecurityUtils.getCurrentUserId(),
                dto.getTier(),
                dto.getDurationDays(),
                dto.getQuantity(),
                dto.getBatchId()
        );
        List<ActivationCodeAdminDTO> result = codes.stream().map(this::toActivationCodeAdminDto).toList();
        return Result.success(result);
    }

    @Operation(summary = "获取激活码列表")
    @GetMapping("/activation-codes")
    public Result<List<ActivationCodeAdminDTO>> listActivationCodes(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String batchId) {
        List<ActivationCode> codes = activationCodeService.listCodes(status, batchId);
        List<ActivationCodeAdminDTO> result = codes.stream().map(this::toActivationCodeAdminDto).toList();
        return Result.success(result);
    }

    @Operation(summary = "禁用激活码")
    @PatchMapping("/activation-codes/{id}/disable")
    public Result<Void> disableActivationCode(@PathVariable Long id) {
        activationCodeService.disableCode(id);
        return Result.success(null);
    }

    @Operation(summary = "获取激活码统计")
    @GetMapping("/activation-codes/stats")
    public Result<ActivationCodeStatsDTO> getActivationCodeStats() {
        Map<String, Object> stats = activationCodeService.getCodeStats();
        ActivationCodeStatsDTO dto = new ActivationCodeStatsDTO();
        dto.setTotal(((Number) stats.getOrDefault("total", 0L)).longValue());
        dto.setUnused(((Number) stats.getOrDefault("unused", 0L)).longValue());
        dto.setUsed(((Number) stats.getOrDefault("used", 0L)).longValue());
        dto.setDisabled(((Number) stats.getOrDefault("disabled", 0L)).longValue());
        return Result.success(dto);
    }

    @Operation(summary = "获取会员等级分布")
    @GetMapping("/analytics/tier-distribution")
    public Result<List<TierDistributionDTO>> getTierDistribution() {
        return Result.success(analyticsService.getTierDistribution());
    }

    @Operation(summary = "获取订阅趋势")
    @GetMapping("/analytics/subscription-trends")
    public Result<List<SubscriptionTrendDTO>> getSubscriptionTrends(
            @RequestParam(defaultValue = "30") int days) {
        return Result.success(analyticsService.getSubscriptionTrends(days));
    }

    @Operation(summary = "获取转化漏斗")
    @GetMapping("/analytics/conversion-funnel")
    public Result<List<ConversionFunnelDTO>> getConversionFunnel() {
        return Result.success(analyticsService.getConversionFunnel());
    }

    @Operation(summary = "获取激活码统计(分析)")
    @GetMapping("/analytics/code-stats")
    public Result<CodeStatsDTO> getAnalyticsCodeStats() {
        return Result.success(analyticsService.getActivationCodeStats());
    }

    @Operation(summary = "获取平均剩余天数")
    @GetMapping("/analytics/average-remaining-days")
    public Result<List<AverageRemainingDaysDTO>> getAverageRemainingDays() {
        return Result.success(analyticsService.getAverageRemainingDays());
    }

    @Operation(summary = "获取注册趋势")
    @GetMapping("/analytics/registration-trends")
    public Result<List<RegistrationTrendDTO>> getRegistrationTrends(
            @RequestParam(defaultValue = "30") int days) {
        return Result.success(analyticsService.getRegistrationTrends(days));
    }

    private static final DateTimeFormatter DTO_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private ActivationCodeAdminDTO toActivationCodeAdminDto(ActivationCode ac) {
        ActivationCodeAdminDTO dto = new ActivationCodeAdminDTO();
        dto.setId(ac.getId());
        dto.setCode(ac.getCode());
        dto.setTier(ac.getTier());
        dto.setDurationDays(ac.getDurationDays());
        dto.setBatchId(ac.getBatchId());
        dto.setCodeStatus(ac.getCodeStatus());
        dto.setUsedByUserId(ac.getUsedByUserId());
        dto.setUsedAt(ac.getUsedAt() != null ? ac.getUsedAt().format(DTO_FMT) : null);
        dto.setExpiresAt(ac.getExpiresAt() != null ? ac.getExpiresAt().format(DTO_FMT) : null);
        dto.setCreatedAt(ac.getCreatedAt() != null ? ac.getCreatedAt().format(DTO_FMT) : null);
        return dto;
    }
}
