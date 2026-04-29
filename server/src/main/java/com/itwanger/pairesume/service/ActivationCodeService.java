package com.itwanger.pairesume.service;

import com.itwanger.pairesume.entity.ActivationCode;

import java.util.List;
import java.util.Map;

public interface ActivationCodeService {

    List<ActivationCode> createCodes(Long adminUserId, String tier, int durationDays, int quantity, String batchId);

    List<ActivationCode> listCodes(String status, String batchId);

    ActivationCode redeemCode(String code, Long userId);

    void disableCode(Long codeId);

    Map<String, Object> getCodeStats();
}