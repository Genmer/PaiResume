package com.itwanger.pairesume.controller;

import com.itwanger.pairesume.common.BusinessException;
import com.itwanger.pairesume.common.MembershipTier;
import com.itwanger.pairesume.common.Result;
import com.itwanger.pairesume.common.ResultCode;
import com.itwanger.pairesume.dto.CouponQuoteDTO;
import com.itwanger.pairesume.dto.MembershipQuoteRequestDTO;
import com.itwanger.pairesume.entity.ActivationCode;
import com.itwanger.pairesume.entity.User;
import com.itwanger.pairesume.mapper.ActivationCodeMapper;
import com.itwanger.pairesume.mapper.UserMapper;
import com.itwanger.pairesume.service.*;
import com.itwanger.pairesume.util.DateTimeUtils;
import com.itwanger.pairesume.util.SecurityUtils;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;

@Tag(name = "会员接口")
@RestController
@RequestMapping("/membership")
@RequiredArgsConstructor
public class MembershipController {
    private final MembershipService membershipService;
    private final MembershipExpiryService membershipExpiryService;
    private final ActivityConfigService activityConfigService;
    private final ActivationCodeService activationCodeService;
    private final JdParseRateLimiter jdParseRateLimiter;
    private final UserMapper userMapper;
    private final ActivationCodeMapper activationCodeMapper;

    @Value("${app.mode:DEV}")
    private String appMode;

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CODE_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 8;

    @Operation(summary = "会员价格报价")
    @PostMapping("/quote")
    public Result<CouponQuoteDTO> quote(@RequestBody(required = false) MembershipQuoteRequestDTO dto) {
        return Result.success(membershipService.quote(dto == null ? null : dto.getCouponCode()));
    }

    @Operation(summary = "会员状态和JD解析剩余次数")
    @GetMapping("/status")
    public Result<Map<String, Object>> status() {
        Long userId = SecurityUtils.getCurrentUserId();
        String membershipStatus = "FREE";
        User user = null;
        if (userId != null) {
            membershipExpiryService.checkAndDowngradeExpiredUser(userId);
            user = userMapper.selectById(userId);
            if (user != null && user.getMembershipStatus() != null) {
                membershipStatus = user.getMembershipStatus();
            }
        }
        int remaining = jdParseRateLimiter.getRemainingParses(userId);
        MembershipTier tier = MembershipTier.fromStatus(membershipStatus);
        Map<String, Object> data = new HashMap<>();
        data.put("appMode", appMode);
        data.put("membershipStatus", membershipStatus);
        data.put("membershipTier", tier.name());
        data.put("jdParseRemaining", remaining);
        data.put("membershipExpiresAt", user != null ? DateTimeUtils.format(user.getMembershipExpiresAt()) : null);
        data.put("isPermanent", user != null && user.getMembershipExpiresAt() == null && tier != MembershipTier.FREE);
        if (user != null && user.getMembershipExpiresAt() != null) {
            long days = ChronoUnit.DAYS.between(LocalDateTime.now(), user.getMembershipExpiresAt());
            data.put("remainingDays", Math.max(days, 0));
        } else {
            data.put("remainingDays", null);
        }
        return Result.success(data);
    }

    @Operation(summary = "兑换激活码")
    @PostMapping("/redeem")
    public Result<Map<String, Object>> redeem(@RequestBody Map<String, String> body) {
        String code = body.get("code");
        if (code == null || code.isBlank()) {
            throw new BusinessException(ResultCode.BAD_REQUEST);
        }
        Long userId = SecurityUtils.getCurrentUserId();
        activationCodeService.redeemCode(code, userId);
        User user = userMapper.selectById(userId);
        return Result.success(buildMembershipResponse(user));
    }

    @Operation(summary = "活动领取会员")
    @PostMapping("/activity-redeem")
    public Result<Map<String, Object>> activityRedeem() {
        if (!activityConfigService.isActivityActive()) {
            throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "当前没有进行中的活动");
        }
        Long userId = SecurityUtils.getCurrentUserId();
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ResultCode.USER_NOT_FOUND);
        }
        // PRO mode: limit activity redeem to once per account
        if ("PRO".equalsIgnoreCase(appMode)) {
            Long claimCount = activationCodeMapper.selectCount(
                    new LambdaQueryWrapper<ActivationCode>()
                            .eq(ActivationCode::getUsedByUserId, userId)
            );
            if (claimCount != null && claimCount > 0) {
                throw new BusinessException(ResultCode.ACTIVITY_ALREADY_CLAIMED);
            }
        }
        ActivityConfigService.ActivityActiveInfo activityInfo = activityConfigService.getActiveActivityInfo();
        MembershipTier activityTier = MembershipTier.fromStatus(activityInfo.tier());
        MembershipTier currentTier = MembershipTier.fromStatus(user.getMembershipStatus());
        if (currentTier.compareTo(activityTier) >= 0) {
            return Result.success(buildMembershipResponse(user));
        }
        LocalDateTime now = LocalDateTime.now();

        // Generate a single activation code for tracking
        ActivationCode ac = new ActivationCode();
        ac.setCode(generateActivityCode());
        ac.setTier(activityInfo.tier().toUpperCase());
        ac.setDurationDays(activityInfo.durationDays() != null ? activityInfo.durationDays() : 0);
        ac.setCodeStatus("USED");
        ac.setUsedByUserId(userId);
        ac.setUsedAt(now);
        ac.setBatchId("ACTIVITY");
        activationCodeMapper.insert(ac);

        user.setMembershipStatus(activityInfo.tier().toUpperCase());
        user.setMembershipExpiresAt(activityInfo.durationDays() != null && activityInfo.durationDays() > 0
                ? now.plusDays(activityInfo.durationDays()) : null);
        user.setMembershipSource("ACTIVITY");
        user.setMembershipGrantedAt(now);
        userMapper.updateById(user);

        Map<String, Object> data = buildMembershipResponse(user);
        data.put("activationCode", ac.getCode());
        data.put("activationTier", ac.getTier());
        data.put("activationDurationDays", ac.getDurationDays());
        return Result.success(data);
    }

    @Operation(summary = "获取当前活动信息")
    @GetMapping("/activity")
    public Result<ActivityConfigService.ActivityActiveInfo> getActivity() {
        return Result.success(activityConfigService.getActiveActivityInfo());
    }

    private Map<String, Object> buildMembershipResponse(User user) {
        String membershipStatus = user != null && user.getMembershipStatus() != null ? user.getMembershipStatus() : "FREE";
        MembershipTier tier = MembershipTier.fromStatus(membershipStatus);
        Map<String, Object> data = new HashMap<>();
        data.put("membershipStatus", membershipStatus);
        data.put("membershipTier", tier.name());
        data.put("membershipExpiresAt", user != null ? DateTimeUtils.format(user.getMembershipExpiresAt()) : null);
        data.put("isPermanent", user != null && user.getMembershipExpiresAt() == null && tier != MembershipTier.FREE);
        if (user != null && user.getMembershipExpiresAt() != null) {
            long days = ChronoUnit.DAYS.between(LocalDateTime.now(), user.getMembershipExpiresAt());
            data.put("remainingDays", Math.max(days, 0));
        } else {
            data.put("remainingDays", null);
        }
        return data;
    }

    private String generateActivityCode() {
        StringBuilder builder = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            builder.append(CODE_CHARACTERS.charAt(RANDOM.nextInt(CODE_CHARACTERS.length())));
        }
        return builder.toString();
    }
}
