package com.itwanger.pairesume.service;

import com.itwanger.pairesume.dto.JdMatchResult;

public interface JdMatchService {

    JdMatchResult matchResume(String jdText, String resumeContent);
}
