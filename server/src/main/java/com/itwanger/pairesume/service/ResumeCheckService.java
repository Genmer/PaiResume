package com.itwanger.pairesume.service;

import com.itwanger.pairesume.dto.ResumeCheckResult;

public interface ResumeCheckService {

    ResumeCheckResult checkResume(String resumeContent);
}
