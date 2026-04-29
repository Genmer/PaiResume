package com.itwanger.pairesume.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.itwanger.pairesume.dto.*;
import com.itwanger.pairesume.entity.ActivationCode;
import com.itwanger.pairesume.entity.User;
import com.itwanger.pairesume.mapper.ActivationCodeMapper;
import com.itwanger.pairesume.mapper.UserMapper;
import com.itwanger.pairesume.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsServiceImpl implements AnalyticsService {

    private final UserMapper userMapper;
    private final ActivationCodeMapper activationCodeMapper;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @Override
    public List<TierDistributionDTO> getTierDistribution() {
        List<User> users = userMapper.selectList(null);
        Map<String, Long> grouped = users.stream()
                .collect(Collectors.groupingBy(
                        u -> u.getMembershipStatus() != null ? u.getMembershipStatus() : "FREE",
                        Collectors.counting()
                ));
        return grouped.entrySet().stream().map(entry -> {
            TierDistributionDTO dto = new TierDistributionDTO();
            dto.setTier(entry.getKey());
            dto.setCount(entry.getValue());
            return dto;
        }).toList();
    }

    @Override
    public List<SubscriptionTrendDTO> getSubscriptionTrends(int days) {
        LocalDate today = LocalDate.now();
        List<SubscriptionTrendDTO> result = new ArrayList<>();

        List<User> subscribedUsers = userMapper.selectList(
                new LambdaQueryWrapper<User>()
                        .isNotNull(User::getMembershipGrantedAt)
        );

        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            LocalDateTime dayStart = date.atStartOfDay();
            LocalDateTime dayEnd = date.atTime(LocalTime.MAX);

            long newSubs = subscribedUsers.stream()
                    .filter(u -> u.getMembershipGrantedAt() != null
                            && !u.getMembershipGrantedAt().isBefore(dayStart)
                            && !u.getMembershipGrantedAt().isAfter(dayEnd))
                    .count();

            long totalSubs = subscribedUsers.stream()
                    .filter(u -> u.getMembershipGrantedAt() != null
                            && !u.getMembershipGrantedAt().isAfter(dayEnd))
                    .count();

            SubscriptionTrendDTO dto = new SubscriptionTrendDTO();
            dto.setDate(date.format(DATE_FMT));
            dto.setNewSubscriptions(newSubs);
            dto.setTotalSubscriptions(totalSubs);
            result.add(dto);
        }
        return result;
    }

    @Override
    public List<ConversionFunnelDTO> getConversionFunnel() {
        long registered = userMapper.selectCount(null);
        long activated = userMapper.selectCount(
                new LambdaQueryWrapper<User>()
                        .ne(User::getMembershipStatus, "FREE")
                        .isNotNull(User::getMembershipStatus)
        );
        long subscribedLite = userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getMembershipStatus, "LITE")
        );
        long subscribedPro = userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getMembershipStatus, "PRO")
        );
        long subscribedMax = userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getMembershipStatus, "MAX")
        );

        List<ConversionFunnelDTO> result = new ArrayList<>();
        addFunnelStage(result, "registered", registered);
        addFunnelStage(result, "activated", activated);
        addFunnelStage(result, "subscribed_lite", subscribedLite);
        addFunnelStage(result, "subscribed_pro", subscribedPro);
        addFunnelStage(result, "subscribed_max", subscribedMax);
        return result;
    }

    private void addFunnelStage(List<ConversionFunnelDTO> result, String stage, long count) {
        ConversionFunnelDTO dto = new ConversionFunnelDTO();
        dto.setStage(stage);
        dto.setCount(count);
        result.add(dto);
    }

    @Override
    public CodeStatsDTO getActivationCodeStats() {
        long total = activationCodeMapper.selectCount(null);
        long unused = activationCodeMapper.selectCount(
                new LambdaQueryWrapper<ActivationCode>().eq(ActivationCode::getCodeStatus, "UNUSED")
        );
        long used = activationCodeMapper.selectCount(
                new LambdaQueryWrapper<ActivationCode>().eq(ActivationCode::getCodeStatus, "USED")
        );
        long disabled = activationCodeMapper.selectCount(
                new LambdaQueryWrapper<ActivationCode>().eq(ActivationCode::getCodeStatus, "DISABLED")
        );

        List<ActivationCode> allCodes = activationCodeMapper.selectList(null);
        Map<String, Long> byTier = allCodes.stream()
                .collect(Collectors.groupingBy(
                        ac -> ac.getTier() != null ? ac.getTier() : "UNKNOWN",
                        Collectors.counting()
                ));

        CodeStatsDTO dto = new CodeStatsDTO();
        dto.setTotal(total);
        dto.setUnused(unused);
        dto.setUsed(used);
        dto.setDisabled(disabled);
        dto.setByTier(byTier);
        return dto;
    }

    @Override
    public List<AverageRemainingDaysDTO> getAverageRemainingDays() {
        List<User> users = userMapper.selectList(
                new LambdaQueryWrapper<User>()
                        .isNotNull(User::getMembershipExpiresAt)
        );

        LocalDateTime now = LocalDateTime.now();
        Map<String, List<User>> grouped = users.stream()
                .collect(Collectors.groupingBy(
                        u -> u.getMembershipStatus() != null ? u.getMembershipStatus() : "FREE"
                ));

        List<AverageRemainingDaysDTO> result = new ArrayList<>();
        for (Map.Entry<String, List<User>> entry : grouped.entrySet()) {
            List<User> tierUsers = entry.getValue();
            double avgDays = tierUsers.stream()
                    .mapToLong(u -> {
                        long seconds = java.time.Duration.between(now, u.getMembershipExpiresAt()).getSeconds();
                        return seconds / 86400;
                    })
                    .average()
                    .orElse(0.0);

            AverageRemainingDaysDTO dto = new AverageRemainingDaysDTO();
            dto.setTier(entry.getKey());
            dto.setAverageDays(Math.round(avgDays * 100.0) / 100.0);
            dto.setUserCount((long) tierUsers.size());
            result.add(dto);
        }
        return result;
    }

    @Override
    public List<RegistrationTrendDTO> getRegistrationTrends(int days) {
        LocalDate today = LocalDate.now();
        List<RegistrationTrendDTO> result = new ArrayList<>();

        List<User> allUsers = userMapper.selectList(null);

        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            LocalDateTime dayStart = date.atStartOfDay();
            LocalDateTime dayEnd = date.atTime(LocalTime.MAX);

            long count = allUsers.stream()
                    .filter(u -> u.getCreatedAt() != null
                            && !u.getCreatedAt().isBefore(dayStart)
                            && !u.getCreatedAt().isAfter(dayEnd))
                    .count();

            RegistrationTrendDTO dto = new RegistrationTrendDTO();
            dto.setDate(date.format(DATE_FMT));
            dto.setNewUsers(count);
            result.add(dto);
        }
        return result;
    }
}