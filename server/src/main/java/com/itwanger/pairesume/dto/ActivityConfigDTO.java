package com.itwanger.pairesume.dto;

import lombok.Data;

@Data
public class ActivityConfigDTO {
    private String activityTier;

    private Integer activityDurationDays;

    private Integer activityEnabled;

    private String activityStartAt;

    private String activityEndAt;

    private String activityLabel;
}