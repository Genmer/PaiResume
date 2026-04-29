package com.itwanger.pairesume.service;

import com.itwanger.pairesume.dto.ActivityConfigDTO;

public interface ActivityConfigService {
    ActivityConfigDTO getConfig();

    ActivityConfigDTO updateConfig(Long adminUserId, ActivityConfigDTO dto);

    boolean isActivityActive();

    ActivityActiveInfo getActiveActivityInfo();

    record ActivityActiveInfo(String tier, String label, Integer durationDays) {}
}