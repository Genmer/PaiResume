package com.itwanger.pairesume.security;

import com.itwanger.pairesume.common.BusinessException;
import com.itwanger.pairesume.common.ResultCode;
import com.itwanger.pairesume.entity.User;
import com.itwanger.pairesume.mapper.UserMapper;
import com.itwanger.pairesume.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

@Aspect
@Component
@RequiredArgsConstructor
public class MembershipAspect {

    private final UserMapper userMapper;

    @Around("@annotation(com.itwanger.pairesume.security.RequireMembership)")
    public Object checkMembership(ProceedingJoinPoint joinPoint) throws Throwable {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }

        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ResultCode.USER_NOT_FOUND);
        }

        if (!"ACTIVE".equals(user.getMembershipStatus())) {
            throw new BusinessException(ResultCode.MEMBERSHIP_REQUIRED);
        }

        return joinPoint.proceed();
    }
}
