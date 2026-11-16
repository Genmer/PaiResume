package com.itwanger.pairesume.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 简历解析结果 DTO（PDF/Word 共用）
 * 对齐前端 ParsedResume 接口：basicInfo/educations/experiences/projects/awards/papers/researches/skills
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

    /** 获奖/证书 */
    private List<AwardDTO> awards;

    /** 论文发表 */
    private List<PaperDTO> papers;

    /** 科研经历 */
    private List<ResearchDTO> researches;

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
        private String school;
        private String degree;
        private String major;
        /** 院系（原文有则填） */
        private String department;
        private String startDate;
        private String endDate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExperienceDTO {
        private String company;
        private String position;
        /** internship | full-time，原文未明示则为 null */
        private String employmentType;
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
        private String projectName;
        private String role;
        private String startDate;
        private String endDate;
        private List<String> techStack;
        private String description;
        private List<String> achievements;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AwardDTO {
        private String awardName;
        private String awardTime;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaperDTO {
        /** 期刊/会议类型，如 SCI、EI、核心期刊、CCF-A */
        private String journalType;
        private String journalName;
        private String publishTime;
        /** 论文简述：题目+贡献 */
        private String content;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResearchDTO {
        private String projectName;
        private String projectCycle;
        private String background;
        private String workContent;
        private String achievements;
    }
}
