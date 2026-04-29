package com.itwanger.pairesume.service;

import com.itwanger.pairesume.dto.*;

import java.util.List;

public interface AnalyticsService {
    List<TierDistributionDTO> getTierDistribution();
    List<SubscriptionTrendDTO> getSubscriptionTrends(int days);
    List<ConversionFunnelDTO> getConversionFunnel();
    CodeStatsDTO getActivationCodeStats();
    List<AverageRemainingDaysDTO> getAverageRemainingDays();
    List<RegistrationTrendDTO> getRegistrationTrends(int days);
}