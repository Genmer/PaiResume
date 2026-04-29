package com.itwanger.pairesume.dto;

import lombok.Data;

@Data
public class SubscriptionTrendDTO {
    private String date;
    private Long newSubscriptions;
    private Long totalSubscriptions;
}