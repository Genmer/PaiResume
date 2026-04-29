package com.itwanger.pairesume.service;

import com.itwanger.pairesume.common.MembershipTier;
import com.itwanger.pairesume.entity.User;
import com.itwanger.pairesume.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class MockInterviewRateLimiter {

    private final StringRedisTemplate redisTemplate;
    private final UserMapper userMapper;

    public int getRemainingInterviews(Long userId) {
        User user = userMapper.selectById(userId);
        String status = user != null ? user.getMembershipStatus() : null;
        return getRemainingInterviews(userId, status);
    }

    public int getRemainingInterviews(Long userId, String membershipStatus) {
        MembershipTier tier = MembershipTier.fromStatus(membershipStatus);
        int limit = tier.getMockInterviewLimit();
        String key = buildKey(userId);
        String value = redisTemplate.opsForValue().get(key);
        int current = value != null ? Integer.parseInt(value) : 0;
        return limit - current;
    }

    public void incrementInterviewCount(Long userId) {
        String key = buildKey(userId);
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1) {
            redisTemplate.expire(key, ttlToEndOfMonth(), TimeUnit.SECONDS);
        }
    }

    public int getInterviewCount(Long userId) {
        String key = buildKey(userId);
        String value = redisTemplate.opsForValue().get(key);
        return value != null ? Integer.parseInt(value) : 0;
    }

    private String buildKey(Long userId) {
        String yearMonth = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        return "mock-interview:" + userId + ":" + yearMonth;
    }

    private long ttlToEndOfMonth() {
        ZonedDateTime now = ZonedDateTime.now(ZoneId.systemDefault());
        ZonedDateTime endOfMonth = YearMonth.from(now).atEndOfMonth()
                .atTime(23, 59, 59)
                .atZone(ZoneId.systemDefault());
        return Math.max(Duration.between(now, endOfMonth).getSeconds(), 1);
    }
}
