package com.itwanger.pairesume.dto;

import lombok.Data;

@Data
public class AverageRemainingDaysDTO {
    private String tier;
    private Double averageDays;
    private Long userCount;
}