package com.itwanger.pairesume.dto;

import lombok.Data;

import java.util.Map;

@Data
public class CodeStatsDTO {
    private Long total;
    private Long unused;
    private Long used;
    private Long disabled;
    private Map<String, Long> byTier;
}