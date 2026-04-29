package com.itwanger.pairesume.dto;

import lombok.Data;

@Data
public class StartInterviewRequestDTO {
    private Long resumeId;
    private String mode;
    private String targetPosition;
    private String targetYears;
    private Integer maxRounds;
}
