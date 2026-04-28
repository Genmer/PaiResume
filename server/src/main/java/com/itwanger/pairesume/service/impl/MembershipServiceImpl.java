package com.itwanger.pairesume.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.itwanger.pairesume.common.BusinessException;
import com.itwanger.pairesume.common.MembershipTier;
import com.itwanger.pairesume.common.ResultCode;
import com.itwanger.pairesume.dto.CouponQuoteDTO;
import com.itwanger.pairesume.dto.UserAdminDTO;
import com.itwanger.pairesume.entity.User;
import com.itwanger.pairesume.mapper.UserMapper;
import com.itwanger.pairesume.service.CouponService;
import com.itwanger.pairesume.service.MembershipService;
import com.itwanger.pairesume.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MembershipServiceImpl implements MembershipService {
    private final CouponService couponService;
    private final UserMapper userMapper;

    @Override
    public CouponQuoteDTO quote(String couponCode) {
        return couponService.quote(couponCode);
    }

    @Override
    public List<UserAdminDTO> listUsers() {
        return userMapper.selectList(
                new LambdaQueryWrapper<User>()
                        .orderByDesc(User::getCreatedAt)
                        .orderByDesc(User::getId)
        ).stream().map(this::toAdminDto).toList();
    }

    @Override
    public UserAdminDTO grantMembership(Long userId, Long adminUserId, String tier, int durationDays) {
        User user = getUser(userId);
        user.setMembershipStatus(tier.toUpperCase());
        user.setMembershipGrantedAt(LocalDateTime.now());
        user.setMembershipSource("ADMIN_GRANTED");
        if (durationDays > 0) {
            user.setMembershipExpiresAt(LocalDateTime.now().plusDays(durationDays));
        } else {
            user.setMembershipExpiresAt(null);
        }
        userMapper.updateById(user);
        return toAdminDto(user);
    }

    @Override
    public UserAdminDTO revokeMembership(Long userId, Long adminUserId) {
        User user = getUser(userId);
        user.setMembershipStatus("FREE");
        user.setMembershipGrantedAt(null);
        user.setMembershipSource("ADMIN_REVOKED");
        user.setMembershipExpiresAt(null);
        userMapper.updateById(user);
        return toAdminDto(user);
    }

    private User getUser(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ResultCode.USER_NOT_FOUND);
        }
        return user;
    }

    private UserAdminDTO toAdminDto(User user) {
        UserAdminDTO dto = new UserAdminDTO();
        dto.setId(user.getId());
        dto.setEmail(user.getEmail());
        dto.setNickname(user.getNickname());
        dto.setRole(user.getRole() != null && user.getRole() == 1 ? "ADMIN" : "USER");
        dto.setMembershipStatus(user.getMembershipStatus());
        dto.setMembershipGrantedAt(DateTimeUtils.format(user.getMembershipGrantedAt()));
        dto.setMembershipSource(user.getMembershipSource());
        dto.setCreatedAt(DateTimeUtils.format(user.getCreatedAt()));
        dto.setMembershipExpiresAt(DateTimeUtils.format(user.getMembershipExpiresAt()));
        MembershipTier membershipTier = MembershipTier.fromStatus(user.getMembershipStatus());
        dto.setMembershipTier(membershipTier.name());
        if (user.getMembershipExpiresAt() == null) {
            dto.setPermanent(!"FREE".equalsIgnoreCase(user.getMembershipStatus()));
            dto.setRemainingDays(null);
        } else {
            dto.setPermanent(false);
            long days = ChronoUnit.DAYS.between(LocalDateTime.now(), user.getMembershipExpiresAt());
            dto.setRemainingDays(Math.max(0, (int) days));
        }
        return dto;
    }
}
