package com.itwanger.pairesume.dto;

import lombok.Data;

@Data
public class GrantMembershipDTO {
    private String tier = "LITE";
    private int durationDays = 0;
}