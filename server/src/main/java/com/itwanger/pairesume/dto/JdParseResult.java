package com.itwanger.pairesume.dto;

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

    private String jobTitle;

    private String company;

    private List<String> requiredSkills;

    private List<String> preferredSkills;

    private List<String> responsibilities;
}
