package com.itwanger.pairesume.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.itwanger.pairesume.common.BusinessException;
import com.itwanger.pairesume.common.MembershipTier;
import com.itwanger.pairesume.common.ResultCode;
import com.itwanger.pairesume.entity.ActivationCode;
import com.itwanger.pairesume.entity.User;
import com.itwanger.pairesume.mapper.ActivationCodeMapper;
import com.itwanger.pairesume.mapper.UserMapper;
import com.itwanger.pairesume.service.ActivationCodeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ActivationCodeServiceImpl implements ActivationCodeService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CODE_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 8;

    private final ActivationCodeMapper activationCodeMapper;
    private final UserMapper userMapper;

    @Override
    @Transactional
    public List<ActivationCode> createCodes(Long adminUserId, String tier, int durationDays, int quantity, String batchId) {
        MembershipTier.valueOf(tier.toUpperCase());

        List<ActivationCode> codes = new ArrayList<>();
        for (int i = 0; i < quantity; i++) {
            ActivationCode ac = new ActivationCode();
            ac.setCode(generateUniqueCode());
            ac.setTier(tier.toUpperCase());
            ac.setDurationDays(durationDays);
            ac.setBatchId(batchId);
            ac.setCodeStatus("UNUSED");
            ac.setCreatedBy(adminUserId);
            activationCodeMapper.insert(ac);
            codes.add(ac);
        }
        return codes;
    }

    @Override
    public List<ActivationCode> listCodes(String status, String batchId) {
        LambdaQueryWrapper<ActivationCode> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(status)) {
            wrapper.eq(ActivationCode::getCodeStatus, status);
        }
        if (StringUtils.hasText(batchId)) {
            wrapper.eq(ActivationCode::getBatchId, batchId);
        }
        wrapper.orderByDesc(ActivationCode::getCreatedAt).orderByDesc(ActivationCode::getId);
        return activationCodeMapper.selectList(wrapper);
    }

    @Override
    @Transactional
    public ActivationCode redeemCode(String code, Long userId) {
        ActivationCode ac = activationCodeMapper.selectOne(
                new LambdaQueryWrapper<ActivationCode>()
                        .eq(ActivationCode::getCode, code.trim().toUpperCase())
                        .last("LIMIT 1")
        );
        if (ac == null) {
            throw new BusinessException(ResultCode.ACTIVATION_CODE_NOT_FOUND);
        }

        if (!"UNUSED".equals(ac.getCodeStatus())) {
            if ("USED".equals(ac.getCodeStatus())) {
                throw new BusinessException(ResultCode.ACTIVATION_CODE_ALREADY_USED);
            }
            if ("DISABLED".equals(ac.getCodeStatus())) {
                throw new BusinessException(ResultCode.ACTIVATION_CODE_DISABLED);
            }
            throw new BusinessException(ResultCode.ACTIVATION_CODE_INVALID);
        }

        if (ac.getExpiresAt() != null && ac.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(ResultCode.ACTIVATION_CODE_EXPIRED);
        }

        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ResultCode.USER_NOT_FOUND);
        }

        MembershipTier codeTier = MembershipTier.valueOf(ac.getTier());
        MembershipTier currentTier = MembershipTier.fromStatus(user.getMembershipStatus());

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = computeExpiresAt(user, codeTier, currentTier, ac.getDurationDays(), now);

        String newStatus = ac.getTier();

        ac.setCodeStatus("USED");
        ac.setUsedByUserId(userId);
        ac.setUsedAt(now);
        activationCodeMapper.updateById(ac);

        user.setMembershipStatus(newStatus);
        user.setMembershipGrantedAt(now);
        user.setMembershipSource("ACTIVATION_CODE");
        user.setMembershipExpiresAt(expiresAt);
        userMapper.updateById(user);

        return ac;
    }

    @Override
    public void disableCode(Long codeId) {
        ActivationCode ac = activationCodeMapper.selectById(codeId);
        if (ac == null) {
            throw new BusinessException(ResultCode.ACTIVATION_CODE_NOT_FOUND);
        }
        if ("USED".equals(ac.getCodeStatus())) {
            throw new BusinessException(ResultCode.ACTIVATION_CODE_ALREADY_USED);
        }
        ac.setCodeStatus("DISABLED");
        activationCodeMapper.updateById(ac);
    }

    @Override
    public Map<String, Object> getCodeStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("total", activationCodeMapper.selectCount(null));
        stats.put("unused", activationCodeMapper.selectCount(
                new LambdaQueryWrapper<ActivationCode>().eq(ActivationCode::getCodeStatus, "UNUSED")));
        stats.put("used", activationCodeMapper.selectCount(
                new LambdaQueryWrapper<ActivationCode>().eq(ActivationCode::getCodeStatus, "USED")));
        stats.put("disabled", activationCodeMapper.selectCount(
                new LambdaQueryWrapper<ActivationCode>().eq(ActivationCode::getCodeStatus, "DISABLED")));
        return stats;
    }

    private LocalDateTime computeExpiresAt(User user, MembershipTier codeTier, MembershipTier currentTier, int durationDays, LocalDateTime now) {
        boolean isPermanentCode = durationDays == 0;
        boolean isCurrentUserPermanent = user.getMembershipExpiresAt() == null
                && currentTier != MembershipTier.FREE;

        if (currentTier == MembershipTier.FREE) {
            if (isPermanentCode) {
                return null;
            }
            return now.plusDays(durationDays);
        }

        int comparison = codeTier.compareTo(currentTier);

        if (comparison < 0) {
            throw new BusinessException(ResultCode.ACTIVATION_CODE_TIER_LOWER);
        }

        if (comparison == 0) {
            if (isCurrentUserPermanent) {
                return null;
            }
            if (isPermanentCode) {
                return null;
            }
            LocalDateTime currentExpiry = user.getMembershipExpiresAt();
            LocalDateTime base = currentExpiry.isAfter(now) ? currentExpiry : now;
            return base.plusDays(durationDays);
        }

        // comparison > 0: higher tier upgrade
        if (isPermanentCode) {
            return null;
        }
        return now.plusDays(durationDays);
    }

    private String generateUniqueCode() {
        for (int i = 0; i < 10; i++) {
            String code = buildCode();
            Long count = activationCodeMapper.selectCount(
                    new LambdaQueryWrapper<ActivationCode>().eq(ActivationCode::getCode, code)
            );
            if (count == null || count == 0) {
                return code;
            }
        }
        throw new BusinessException(ResultCode.ACTIVATION_CODE_BATCH_CREATE_FAILED);
    }

    private String buildCode() {
        StringBuilder builder = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            builder.append(CODE_CHARACTERS.charAt(RANDOM.nextInt(CODE_CHARACTERS.length())));
        }
        return builder.toString();
    }
}