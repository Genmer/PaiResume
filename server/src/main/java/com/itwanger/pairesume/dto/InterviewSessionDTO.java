package com.itwanger.pairesume.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class InterviewSessionDTO {
    private Long id;
    private Long resumeId;
    private String resumeTitle;
    private String interviewMode;
    private String targetPosition;
    private String targetYears;
    private String status;
    private BigDecimal totalScore;
    private BigDecimal scoreTechnical;
    private BigDecimal scoreExpression;
    private BigDecimal scoreProject;
    private String evaluationSummary;
    private Integer maxRounds;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
    private List<InterviewMessageDTO> messages;
}
