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
public class JdParseRateLimiter {

    private final StringRedisTemplate redisTemplate;
    private final UserMapper userMapper;

    public int getLimitForTier(MembershipTier tier) {
        return tier.getJdParseLimit();
    }

    public int getRemainingParses(Long userId) {
        User user = userMapper.selectById(userId);
        String status = user != null ? user.getMembershipStatus() : null;
        return getRemainingParses(userId, status);
    }

    public int getRemainingParses(Long userId, String membershipStatus) {
        MembershipTier tier = MembershipTier.fromStatus(membershipStatus);
        if (tier.isUnlimited()) {
            return -1;
        }
        int limit = getLimitForTier(tier);
        String key = buildKey(userId);
        String value = redisTemplate.opsForValue().get(key);
        int current = value != null ? Integer.parseInt(value) : 0;
        return limit - current;
    }

    public void incrementParseCount(Long userId) {
        String key = buildKey(userId);
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1) {
            redisTemplate.expire(key, ttlToEndOfMonth(), TimeUnit.SECONDS);
        }
    }

    private String buildKey(Long userId) {
        String yearMonth = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        return "jd-parse:" + userId + ":" + yearMonth;
    }

    private long ttlToEndOfMonth() {
        ZonedDateTime now = ZonedDateTime.now(ZoneId.systemDefault());
        ZonedDateTime endOfMonth = YearMonth.from(now).atEndOfMonth()
                .atTime(23, 59, 59)
                .atZone(ZoneId.systemDefault());
        return Math.max(Duration.between(now, endOfMonth).getSeconds(), 1);
    }
}
