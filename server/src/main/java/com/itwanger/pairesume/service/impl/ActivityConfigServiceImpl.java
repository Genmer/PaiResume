package com.itwanger.pairesume.service.impl;

import com.itwanger.pairesume.dto.ActivityConfigDTO;
import com.itwanger.pairesume.entity.ActivityConfig;
import com.itwanger.pairesume.mapper.ActivityConfigMapper;
import com.itwanger.pairesume.service.ActivityConfigService;
import com.itwanger.pairesume.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ActivityConfigServiceImpl implements ActivityConfigService {
    private static final long ACTIVITY_CONFIG_ID = 1L;

    private final ActivityConfigMapper activityConfigMapper;

    @Override
    public ActivityConfigDTO getConfig() {
        return toDto(getConfigEntity());
    }

    @Override
    public ActivityConfigDTO updateConfig(Long adminUserId, ActivityConfigDTO dto) {
        ActivityConfig config = getConfigEntity();
        config.setActivityTier(dto.getActivityTier());
        config.setActivityDurationDays(dto.getActivityDurationDays());
        config.setActivityEnabled(dto.getActivityEnabled());
        config.setActivityStartAt(DateTimeUtils.parse(dto.getActivityStartAt()));
        config.setActivityEndAt(DateTimeUtils.parse(dto.getActivityEndAt()));
        config.setActivityLabel(dto.getActivityLabel());
        config.setUpdatedBy(adminUserId);
        activityConfigMapper.updateById(config);
        return toDto(config);
    }

    @Override
    public boolean isActivityActive() {
        ActivityConfig config = activityConfigMapper.selectById(ACTIVITY_CONFIG_ID);
        if (config == null || config.getActivityEnabled() == null || config.getActivityEnabled() != 1) {
            return false;
        }
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startAt = config.getActivityStartAt();
        LocalDateTime endAt = config.getActivityEndAt();
        if (startAt != null && now.isBefore(startAt)) {
            return false;
        }
        if (endAt != null && now.isAfter(endAt)) {
            return false;
        }
        return true;
    }

    @Override
    public ActivityActiveInfo getActiveActivityInfo() {
        if (!isActivityActive()) {
            return new ActivityActiveInfo(null, null, null);
        }
        ActivityConfig config = activityConfigMapper.selectById(ACTIVITY_CONFIG_ID);
        if (config == null) {
            return new ActivityActiveInfo(null, null, null);
        }
        return new ActivityActiveInfo(
                config.getActivityTier(),
                config.getActivityLabel(),
                config.getActivityDurationDays()
        );
    }

    private ActivityConfig getConfigEntity() {
        ActivityConfig config = activityConfigMapper.selectById(ACTIVITY_CONFIG_ID);
        if (config != null) {
            return config;
        }
        config = new ActivityConfig();
        config.setId(ACTIVITY_CONFIG_ID);
        config.setActivityEnabled(0);
        activityConfigMapper.insert(config);
        return config;
    }

    private ActivityConfigDTO toDto(ActivityConfig config) {
        ActivityConfigDTO dto = new ActivityConfigDTO();
        dto.setActivityTier(config.getActivityTier());
        dto.setActivityDurationDays(config.getActivityDurationDays());
        dto.setActivityEnabled(config.getActivityEnabled());
        dto.setActivityStartAt(DateTimeUtils.format(config.getActivityStartAt()));
        dto.setActivityEndAt(DateTimeUtils.format(config.getActivityEndAt()));
        dto.setActivityLabel(config.getActivityLabel());
        return dto;
    }
}