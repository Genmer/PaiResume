package com.itwanger.pairesume.dto;

import lombok.Data;

@Data
public class ActivationCodeAdminDTO {
    private Long id;
    private String code;
    private String tier;
    private Integer durationDays;
    private String batchId;
    private String codeStatus;
    private Long usedByUserId;
    private String usedAt;
    private String expiresAt;
    private String createdAt;
}