package com.itwanger.pairesume.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName(value = "mock_interview_session")
public class MockInterviewSession {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    private Long resumeId;

    private String resumeSnapshot;

    private String interviewMode;

    private String targetPosition;

    private String targetYears;

    @TableField(value = "status")
    private String interviewStatus;

    private BigDecimal totalScore;

    private BigDecimal scoreTechnical;

    private BigDecimal scoreExpression;

    private BigDecimal scoreProject;

    private String evaluationSummary;

    private Integer maxRounds;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    private LocalDateTime completedAt;
}
