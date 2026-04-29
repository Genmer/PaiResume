package com.itwanger.pairesume.service;

import com.itwanger.pairesume.dto.AtsCheckResult;

public interface AtsCheckService {

    AtsCheckResult checkAts(String resumeContent);
}
