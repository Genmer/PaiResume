package com.itwanger.pairesume.dto;

import lombok.Data;

@Data
public class ReferenceAnswerDTO {
    private String question;
    private String candidateAnswer;
    private String referenceAnswer;
    private String evaluation;
}
