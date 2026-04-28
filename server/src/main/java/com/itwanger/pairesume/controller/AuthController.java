package com.itwanger.pairesume.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.itwanger.pairesume.common.BusinessException;
import com.itwanger.pairesume.common.MembershipTier;
import com.itwanger.pairesume.common.Result;
import com.itwanger.pairesume.common.ResultCode;
import com.itwanger.pairesume.dto.*;
import com.itwanger.pairesume.entity.ActivationCode;
import com.itwanger.pairesume.entity.User;
import com.itwanger.pairesume.mapper.ActivationCodeMapper;
import com.itwanger.pairesume.mapper.UserMapper;
import com.itwanger.pairesume.service.AuthService;
import com.itwanger.pairesume.service.JdParseRateLimiter;
import com.itwanger.pairesume.service.MembershipExpiryService;
import com.itwanger.pairesume.util.DateTimeUtils;
import com.itwanger.pairesume.util.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Tag(name = "认证接口")
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final UserMapper userMapper;
    private final ActivationCodeMapper activationCodeMapper;
    private final MembershipExpiryService membershipExpiryService;
    private final JdParseRateLimiter jdParseRateLimiter;

    @Value("${app.mode:DEV}")
    private String appMode;

    public AuthController(AuthService authService, UserMapper userMapper,
                          ActivationCodeMapper activationCodeMapper,
                          MembershipExpiryService membershipExpiryService,
                          JdParseRateLimiter jdParseRateLimiter) {
        this.authService = authService;
        this.userMapper = userMapper;
        this.activationCodeMapper = activationCodeMapper;
        this.membershipExpiryService = membershipExpiryService;
        this.jdParseRateLimiter = jdParseRateLimiter;
    }

    @Operation(summary = "用户注册")
    @PostMapping("/register")
    public Result<TokenDTO> register(@Valid @RequestBody RegisterDTO dto) {
        return Result.success(authService.register(dto));
    }

    @Operation(summary = "用户登录")
    @PostMapping("/login")
    public Result<TokenDTO> login(@Valid @RequestBody LoginDTO dto) {
        return Result.success(authService.login(dto));
    }

    @Operation(summary = "获取当前用户信息")
    @GetMapping("/me")
    public Result<UserInfoDTO> me() {
        return Result.success(authService.getCurrentUserInfo(SecurityUtils.getCurrentUserId()));
    }

    @Operation(summary = "刷新 Token")
    @PostMapping("/refresh")
    public Result<TokenDTO> refresh(@RequestBody RefreshRequest request) {
        return Result.success(authService.refreshToken(request.getRefreshToken()));
    }

    @Operation(summary = "用户登出")
    @PostMapping("/logout")
    public Result<Void> logout(@RequestHeader("Authorization") String authHeader) {
        var token = authHeader.substring(7);
        var userId = SecurityUtils.getCurrentUserId();
        authService.logout(userId, token);
        return Result.success();
    }

    @Operation(summary = "发送邮箱验证码")
    @PostMapping("/send-code")
    public Result<Void> sendCode(@Valid @RequestBody SendCodeRequest request) {
        authService.sendVerificationCode(request.getEmail());
        return Result.success();
    }

    @Operation(summary = "获取个人中心信息")
    @GetMapping("/profile")
    public Result<Map<String, Object>> profile() {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        membershipExpiryService.checkAndDowngradeExpiredUser(userId);
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ResultCode.USER_NOT_FOUND);
        }

        Map<String, Object> data = new HashMap<>();
        data.put("id", user.getId());
        data.put("email", user.getEmail());
        data.put("nickname", user.getNickname());
        data.put("avatar", user.getAvatar());
        data.put("role", user.getRole());
        data.put("createdAt", DateTimeUtils.format(user.getCreatedAt()));

        String membershipStatus = user.getMembershipStatus() != null ? user.getMembershipStatus() : "FREE";
        MembershipTier tier = MembershipTier.fromStatus(membershipStatus);
        data.put("membershipStatus", membershipStatus);
        data.put("membershipTier", tier.name());
        data.put("membershipExpiresAt", DateTimeUtils.format(user.getMembershipExpiresAt()));
        data.put("membershipSource", user.getMembershipSource());
        data.put("membershipGrantedAt", DateTimeUtils.format(user.getMembershipGrantedAt()));
        data.put("isPermanent", user.getMembershipExpiresAt() == null && tier != MembershipTier.FREE);
        if (user.getMembershipExpiresAt() != null) {
            long days = ChronoUnit.DAYS.between(LocalDateTime.now(), user.getMembershipExpiresAt());
            data.put("remainingDays", Math.max(days, 0));
        } else {
            data.put("remainingDays", null);
        }
        data.put("jdParseRemaining", jdParseRateLimiter.getRemainingParses(userId));
        data.put("appMode", appMode);

        List<ActivationCode> usedCodes = activationCodeMapper.selectList(
                new LambdaQueryWrapper<ActivationCode>()
                        .eq(ActivationCode::getUsedByUserId, userId)
                        .orderByDesc(ActivationCode::getUsedAt)
        );
        List<Map<String, Object>> codeHistory = usedCodes.stream().map(code -> {
            Map<String, Object> item = new HashMap<>();
            item.put("id", code.getId());
            item.put("code", code.getCode());
            item.put("tier", code.getTier());
            item.put("durationDays", code.getDurationDays());
            item.put("usedAt", DateTimeUtils.format(code.getUsedAt()));
            return item;
        }).collect(Collectors.toList());
        data.put("activationCodeHistory", codeHistory);

        return Result.success(data);
    }

    @Operation(summary = "更新个人资料")
    @PutMapping("/profile")
    public Result<Map<String, Object>> updateProfile(@RequestBody Map<String, String> body) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        String nickname = body.get("nickname");
        if (nickname == null || nickname.isBlank()) {
            throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "昵称不能为空");
        }
        if (nickname.length() > 20) {
            throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "昵称最长20个字符");
        }
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ResultCode.USER_NOT_FOUND);
        }
        user.setNickname(nickname.trim());
        userMapper.updateById(user);

        return profile();
    }

    @Data
    public static class RefreshRequest {
        @NotBlank
        private String refreshToken;
    }

    @Data
    public static class SendCodeRequest {
        @NotBlank @Email
        private String email;
    }
}
