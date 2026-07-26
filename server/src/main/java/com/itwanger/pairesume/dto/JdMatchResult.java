package com.itwanger.pairesume.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JdMatchResult {

    @JsonAlias("match_score")
    private Integer matchScore;

    private String summary;

    @JsonAlias("matched_skills")
    private List<String> matchedSkills;

    @JsonAlias("missing_skills")
    private List<String> missingSkills;

    private List<Suggestion> suggestions;

    /** 是否包含详细建议（免费用户仅返回分数与摘要） */
    private boolean detailed;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Suggestion {

        /** 建议针对的简历模块，如 skill/project/work_experience */
        private String module;

        private String advice;
    }
}
