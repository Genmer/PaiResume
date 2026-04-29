package com.itwanger.pairesume.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class InterviewHistoryItemDTO {
    private Long id;
    private String resumeTitle;
    private String interviewMode;
    private BigDecimal totalScore;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
}
