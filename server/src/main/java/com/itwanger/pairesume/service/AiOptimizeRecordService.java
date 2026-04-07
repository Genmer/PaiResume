package com.itwanger.pairesume.service;

import com.itwanger.pairesume.dto.AiFieldOptimizeRecordDTO;
import com.itwanger.pairesume.entity.AiOptimizeRecord;

public interface AiOptimizeRecordService {
    void save(AiOptimizeRecord record);

    AiFieldOptimizeRecordDTO getLatestRecord(Long userId, Long resumeId, Long moduleId, String fieldType, Integer fieldIndex);
}
