package com.itwanger.pairesume.dto;

import lombok.Data;

@Data
public class ActivationCodeStatsDTO {
    private Long total;
    private Long unused;
    private Long used;
    private Long disabled;
}