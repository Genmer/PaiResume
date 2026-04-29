package com.itwanger.pairesume.service;

import com.itwanger.pairesume.dto.*;
import com.itwanger.pairesume.entity.MockInterviewMessage;
import com.itwanger.pairesume.entity.MockInterviewSession;
import com.itwanger.pairesume.entity.ResumeModule;

import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

public interface MockInterviewService {
    InterviewSessionDTO startInterview(Long userId, StartInterviewRequestDTO request);

    boolean chat(Long sessionId, Long userId, String userMessage, Consumer<Map<String, Object>> eventConsumer);

    EvaluationResultDTO endInterview(Long sessionId, Long userId);

    List<InterviewHistoryItemDTO> getHistory(Long userId);

    InterviewSessionDTO getDetail(Long sessionId, Long userId);
}
