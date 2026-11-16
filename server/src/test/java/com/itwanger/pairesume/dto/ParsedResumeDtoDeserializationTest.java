package com.itwanger.pairesume.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 用 Spring Boot 同款 ObjectMapper（关闭 FAIL_ON_UNKNOWN_PROPERTIES）
 * 验证 AI 返回的新 schema 能被完整反序列化，且未知字段不炸。
 */
class ParsedResumeDtoDeserializationTest {

    private final ObjectMapper objectMapper = Jackson2ObjectMapperBuilder.json().build();

    @Test
    void deserializesFullSchemaWithNewModules() throws Exception {
        String json = """
                {
                  "basicInfo": {"name": "张三", "email": "a@b.com", "location": "上海", "jobIntention": "后端工程师"},
                  "educations": [{"school": "清华大学", "degree": "本科", "major": "计算机", "department": "计算机系", "startDate": "2019-09", "endDate": "2023-06"}],
                  "experiences": [{"company": "字节跳动", "position": "后端开发", "employmentType": "full-time", "startDate": "2023-07", "endDate": "至今", "description": "...", "achievements": ["a", "b"]}],
                  "projects": [{"projectName": "订单系统", "role": "核心开发", "techStack": ["Java", "Redis"], "description": "...", "achievements": []}],
                  "awards": [{"awardName": "国家奖学金", "awardTime": "2021-10"}],
                  "papers": [{"journalType": "SCI", "journalName": "Nature", "publishTime": "2022-03", "content": "论文题目"}],
                  "researches": [{"projectName": "实验室课题", "projectCycle": "2021-09 至 2023-06", "background": "背景", "workContent": "工作", "achievements": "结题"}],
                  "skills": ["编程语言：Java、Go"]
                }
                """;

        ParsedResumeDTO dto = objectMapper.readValue(json, ParsedResumeDTO.class);

        assertEquals("张三", dto.getBasicInfo().getName());

        assertEquals(1, dto.getEducations().size());
        assertEquals("计算机系", dto.getEducations().get(0).getDepartment());

        assertEquals(1, dto.getExperiences().size());
        assertEquals("full-time", dto.getExperiences().get(0).getEmploymentType());

        assertEquals(1, dto.getProjects().size());

        List<ParsedResumeDTO.AwardDTO> awards = dto.getAwards();
        assertNotNull(awards);
        assertEquals("国家奖学金", awards.get(0).getAwardName());
        assertEquals("2021-10", awards.get(0).getAwardTime());

        List<ParsedResumeDTO.PaperDTO> papers = dto.getPapers();
        assertNotNull(papers);
        assertEquals("SCI", papers.get(0).getJournalType());

        List<ParsedResumeDTO.ResearchDTO> researches = dto.getResearches();
        assertNotNull(researches);
        assertEquals("实验室课题", researches.get(0).getProjectName());
    }

    @Test
    void toleratesUnknownAndMissingFields() throws Exception {
        String json = """
                {
                  "basicInfo": {"name": "李四", "unknownField": 1},
                  "educations": [{"school": "北大", "futureField": true}],
                  "experiences": [{"company": "A", "department": "微信支付"}]
                }
                """;

        ParsedResumeDTO dto = objectMapper.readValue(json, ParsedResumeDTO.class);

        assertEquals("李四", dto.getBasicInfo().getName());
        assertEquals("北大", dto.getEducations().get(0).getSchool());
        // experiences.department 旧 prompt 字段：未知字段被忽略，不抛错
        assertEquals("A", dto.getExperiences().get(0).getCompany());
        assertNull(dto.getAwards());
        assertNull(dto.getPapers());
        assertNull(dto.getResearches());
    }

    @Test
    void toleratesNullArrays() throws Exception {
        ParsedResumeDTO dto = objectMapper.readValue("{\"basicInfo\":null}", ParsedResumeDTO.class);
        assertNull(dto.getBasicInfo());
        assertNull(dto.getSkills());
    }
}
