package com.itwanger.pairesume.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * PDF 简历解析结果 DTO
 * 对齐前端 ParsedResume 接口
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParsedResumeDTO {

    private BasicInfoDTO basicInfo;

    private List<EducationDTO> educations;

    private List<String> skills;

    private List<ExperienceDTO> experiences;

    private List<ProjectDTO> projects;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BasicInfoDTO {
        private String name;
        private String email;
        private String phone;
        private String github;
        private String website;
        private String location;
        private String jobIntention;
        private String workYears;
        private String summary;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EducationDTO {
        private String id;
        private String school;
        private String degree;
        private String major;
        private String startDate;
        private String endDate;
        private String description;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExperienceDTO {
        private String id;
        private String company;
        private String position;
        private String startDate;
        private String endDate;
        private String description;
        private List<String> achievements;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectDTO {
        private String id;
        private String projectName;
        private String role;
        private String startDate;
        private String endDate;
        private List<String> techStack;
        private String description;
        private List<String> achievements;
    }
}
