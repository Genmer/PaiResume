package com.itwanger.pairesume.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.itwanger.pairesume.entity.User;
import com.itwanger.pairesume.mapper.UserMapper;
import com.itwanger.pairesume.service.MembershipExpiryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class MembershipExpiryServiceImpl implements MembershipExpiryService {

    private final UserMapper userMapper;

    @Override
    @Transactional
    public void checkAndDowngradeExpiredUser(Long userId) {
        if (userId == null) {
            return;
        }
        User user = userMapper.selectById(userId);
        if (user == null) {
            return;
        }
        downgradeIfExpired(user);
    }

    @Override
    @Transactional
    public void checkAndDowngradeAllExpired() {
        List<User> expiredUsers = userMapper.selectList(
                new LambdaQueryWrapper<User>()
                        .isNotNull(User::getMembershipExpiresAt)
                        .lt(User::getMembershipExpiresAt, LocalDateTime.now())
        );
        for (User user : expiredUsers) {
            downgradeIfExpired(user);
        }
    }

    private void downgradeIfExpired(User user) {
        LocalDateTime expiresAt = user.getMembershipExpiresAt();
        if (expiresAt == null) {
            return;
        }
        if (expiresAt.isAfter(LocalDateTime.now())) {
            return;
        }
        log.info("用户 {} 会员已过期（到期时间: {}），自动降级为 FREE", user.getId(), expiresAt);
        user.setMembershipStatus("FREE");
        user.setMembershipExpiresAt(null);
        user.setMembershipSource("EXPIRED");
        userMapper.updateById(user);
    }
}