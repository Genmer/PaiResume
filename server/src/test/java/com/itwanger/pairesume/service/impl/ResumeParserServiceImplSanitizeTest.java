package com.itwanger.pairesume.service.impl;

import com.itwanger.pairesume.dto.ParsedResumeDTO;
import com.itwanger.pairesume.service.impl.ResumeParserServiceImpl.ResumeParseException;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * AI 输出后校验（sanitize）的纯逻辑单测，不起 Spring 上下文。
 */
class ResumeParserServiceImplSanitizeTest {

    @Test
    void nullDtoThrows() {
        ResumeParseException ex = assertThrows(ResumeParseException.class,
                () -> ResumeParserServiceImpl.sanitize(null));
        assertTrue(ex.getMessage().contains("为空"));
    }

    @Test
    void allEmptyContentThrows() {
        ParsedResumeDTO dto = ParsedResumeDTO.builder()
                .basicInfo(ParsedResumeDTO.BasicInfoDTO.builder().build())
                .build();
        ResumeParseException ex = assertThrows(ResumeParseException.class,
                () -> ResumeParserServiceImpl.sanitize(dto));
        assertTrue(ex.getMessage().contains("未能从简历中识别出有效内容"));
    }

    @Test
    void blankElementsPrunedAndNullListsNormalized() {
        ParsedResumeDTO dto = ParsedResumeDTO.builder()
                .basicInfo(ParsedResumeDTO.BasicInfoDTO.builder().name("张三").build())
                .educations(List.of(
                        ParsedResumeDTO.EducationDTO.builder()
                                .school("北京大学").major("计算机").build(),
                        ParsedResumeDTO.EducationDTO.builder().build())) // 全空元素
                .experiences(null)
                .skills(java.util.Arrays.asList("  ", "后端：Java/Go", null))
                .build();

        ParsedResumeDTO result = ResumeParserServiceImpl.sanitize(dto);

        assertEquals(1, result.getEducations().size(), "全空 education 元素应被过滤");
        assertEquals("北京大学", result.getEducations().get(0).getSchool());
        assertNotNull(result.getExperiences(), "null 列表应补齐为空列表");
        assertTrue(result.getExperiences().isEmpty());
        assertEquals(List.of("后端：Java/Go"), result.getSkills(), "空白技能行应被过滤");
    }

    @Test
    void partiallyBlankElementKept() {
        // 有任一有效字段的元素保留
        ParsedResumeDTO dto = ParsedResumeDTO.builder()
                .awards(List.of(ParsedResumeDTO.AwardDTO.builder().awardName("国家奖学金").build()))
                .build();

        ParsedResumeDTO result = ResumeParserServiceImpl.sanitize(dto);

        assertEquals(1, result.getAwards().size());
        assertEquals("国家奖学金", result.getAwards().get(0).getAwardName());
    }

    @Test
    void experienceWithOnlyAchievementsKept() {
        // achievements 有内容但字符串字段全空 → 不是空元素
        ParsedResumeDTO dto = ParsedResumeDTO.builder()
                .experiences(List.of(ParsedResumeDTO.ExperienceDTO.builder()
                        .achievements(List.of("负责订单系统")).build()))
                .build();

        ParsedResumeDTO result = ResumeParserServiceImpl.sanitize(dto);

        assertEquals(1, result.getExperiences().size());
    }

    @Test
    void normalDtoPassesThroughUnchanged() {
        ParsedResumeDTO dto = ParsedResumeDTO.builder()
                .basicInfo(ParsedResumeDTO.BasicInfoDTO.builder()
                        .name("李四").phone("13800138000").build())
                .educations(List.of(ParsedResumeDTO.EducationDTO.builder()
                        .school("清华大学").degree("本科").build()))
                .build();

        ParsedResumeDTO result = ResumeParserServiceImpl.sanitize(dto);

        assertEquals("李四", result.getBasicInfo().getName());
        assertEquals(1, result.getEducations().size());
        assertEquals("清华大学", result.getEducations().get(0).getSchool());
    }
}
