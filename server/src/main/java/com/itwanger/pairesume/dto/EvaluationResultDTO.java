package com.itwanger.pairesume.dto;

import lombok.Data;
import java.util.List;

@Data
public class EvaluationResultDTO {
    private double totalScore;
    private double scoreTechnical;
    private double scoreExpression;
    private double scoreProject;
    private String summary;
    private List<String> suggestions;
    private List<ReferenceAnswerDTO> referenceAnswers;
}
