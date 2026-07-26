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
public class JdParseResult {

    @JsonAlias("job_title")
    private String jobTitle;

    private String company;

    @JsonAlias("required_skills")
    private List<String> requiredSkills;

    @JsonAlias("preferred_skills")
    private List<String> preferredSkills;

    private List<String> responsibilities;
}
