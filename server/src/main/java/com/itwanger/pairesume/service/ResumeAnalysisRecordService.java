package com.itwanger.pairesume.service;

import com.itwanger.pairesume.dto.ResumeAnalysisResultDTO;
import com.itwanger.pairesume.entity.ResumeAnalysisRecord;

public interface ResumeAnalysisRecordService {
    void save(ResumeAnalysisRecord record);

    ResumeAnalysisResultDTO getLatestCompletedRecord(Long userId, Long resumeId);
}
