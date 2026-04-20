package com.itwanger.pairesume.parser;

import com.hankcs.hanlp.HanLP;
import com.hankcs.hanlp.corpus.tag.Nature;
import com.hankcs.hanlp.seg.common.Term;
import com.itwanger.pairesume.dto.ParsedResumeDTO;
import lombok.extern.slf4j.Slf4j;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * 简历 NLP 实体提取处理器
 * <p>
 * 使用 HanLP 进行：
 * 1. 词性标注（POS Tagging）
 * 2. 命名实体识别（NER）
 * 3. 短语提取
 * <p>
 * 提取目标：
 * - 学校名称（nt 机构名）
 * - 时间范围（t 时间词）
 * - 公司名称（nt 机构名）
 * - 职位名称（nz 其它专名）
 * - 技术技能（nz / ij）
 */
@Slf4j
public class ResumeNlpProcessor {

    // 常见学校关键词（用于辅助识别）
    private static final Set<String> SCHOOL_KEYWORDS = Set.of(
            "大学", "学院", "学校", "University", "College", "Institute",
            "北京", "清华", "北大", "复旦", "上交", "浙大", "中科大",
            "哈工大", "北航", "北理工", "北邮", "电子科大", "西电",
            "人 大", "人民大学", "同济", "华东师大", "华中科大", "武汉大学",
            "中山大学", "华南理工", "四川大学", "西安交大", "大连理工"
    );

    // 常见公司关键词（用于辅助识别）
    private static final Set<String> COMPANY_KEYWORDS = Set.of(
            "公司", "企业", "集团", "有限", "股份", "科技", "网络", "软件",
            "阿里巴巴", "腾讯", "字节跳动", "百度", "京东", "美团", "滴滴",
            "华为", "小米", "OPPO", "vivo", "网易", "新浪", "搜狐",
            "Microsoft", "Google", "Amazon", "Apple", "Meta", "IBM",
            "Corp", "Inc", "Ltd", "Co", "LLC", "Company"
    );

    // 常见职位关键词
    private static final Set<String> POSITION_KEYWORDS = Set.of(
            "工程师", "开发", "设计师", "经理", "总监", "架构师", "技术",
            "研发", "产品", "运营", "测试", "运维", "前端", "后端", "全栈",
            "Intern", "Engineer", "Developer", "Designer", "Manager", "Lead", "Architect"
    );

    // 技术技能关键词
    private static final Set<String> TECH_SKILLS = Set.of(
            "Java", "Python", "JavaScript", "TypeScript", "Go", "Rust", "C++", "C#",
            "React", "Vue", "Angular", "Spring", "Spring Boot", "Node.js",
            "MySQL", "PostgreSQL", "MongoDB", "Redis", "Elasticsearch",
            "Docker", "Kubernetes", "AWS", "Azure", "Git", "Linux",
            "机器学习", "深度学习", "TensorFlow", "PyTorch", "NLP",
            "前端", "后端", "全栈", "微服务", "分布式", "架构"
    );

    // 时间正则
    private static final Pattern DATE_PATTERN =
            Pattern.compile("(?:19|20)\\d{2}[年./-]?(?:0?[1-9]|1[0-2])?(?:月)?|[今现]至今|Present|至今|现在");

    private static final Pattern YEAR_RANGE_PATTERN =
            Pattern.compile("(?:19|20)\\d{2}\\s*[-~至]\\s*(?:(?:19|20)\\d{2}|至今|现在|Present)");

    /**
     * 处理分析结果，提取结构化信息
     */
    public ParsedResumeDTO process(PdfSpatialAnalyzer.AnalysisResult analysisResult) {
        ParsedResumeDTO.ParsedResumeDTOBuilder builder = ParsedResumeDTO.builder();

        // 基本信息
        builder.basicInfo(ParsedResumeDTO.BasicInfoDTO.builder()
                .name(analysisResult.getName())
                .email(analysisResult.getEmail())
                .phone(analysisResult.getPhone())
                .github(analysisResult.getGithub())
                .build());

        // 处理各个区块
        List<ParsedResumeDTO.EducationDTO> educations = new ArrayList<>();
        List<ParsedResumeDTO.ExperienceDTO> experiences = new ArrayList<>();
        List<ParsedResumeDTO.ProjectDTO> projects = new ArrayList<>();
        Set<String> skills = new HashSet<>();

        for (PdfSpatialAnalyzer.Section section : analysisResult.getSections()) {
            switch (section.getType()) {
                case EDUCATION -> {
                    List<ParsedResumeDTO.EducationDTO> edu = extractEducations(section.getText());
                    educations.addAll(edu);
                }
                case EXPERIENCE -> {
                    List<ParsedResumeDTO.ExperienceDTO> exp = extractExperiences(section.getText());
                    experiences.addAll(exp);
                }
                case PROJECT -> {
                    List<ParsedResumeDTO.ProjectDTO> proj = extractProjects(section.getText());
                    projects.addAll(proj);
                }
                case SKILL -> {
                    Set<String> extracted = extractSkills(section.getText());
                    skills.addAll(extracted);
                }
                default -> {
                    // 其它区块也尝试提取技能
                    Set<String> extracted = extractSkills(section.getText());
                    skills.addAll(extracted);
                }
            }
        }

        // 从全文中提取技能（兜底）
        Set<String> allSkills = extractSkills(analysisResult.getRawText());
        skills.addAll(allSkills);

        builder.educations(educations);
        builder.experiences(experiences);
        builder.projects(projects);
        builder.skills(new ArrayList<>(skills));

        return builder.build();
    }

    /**
     * 从教育区块提取学校、学历、时间
     */
    private List<ParsedResumeDTO.EducationDTO> extractEducations(String text) {
        List<ParsedResumeDTO.EducationDTO> results = new ArrayList<>();

        // 使用 HanLP 进行词性标注
        List<Term> terms = HanLP.segment(text);

        // 提取学校名称（nt 机构名 或 包含学校关键词的短语）
        List<String> schools = extractOrganizations(terms, SCHOOL_KEYWORDS);

        // 提取时间范围
        String[] dateRange = extractDateRange(text);

        // 提取学历
        String degree = extractDegree(text);

        // 提取专业
        String major = extractMajor(terms);

        for (String school : schools) {
            results.add(ParsedResumeDTO.EducationDTO.builder()
                    .id(UUID.randomUUID().toString())
                    .school(school)
                    .degree(degree)
                    .major(major)
                    .startDate(dateRange[0])
                    .endDate(dateRange[1])
                    .build());
        }

        return results;
    }

    /**
     * 从工作区块提取公司、职位、时间
     */
    private List<ParsedResumeDTO.ExperienceDTO> extractExperiences(String text) {
        List<ParsedResumeDTO.ExperienceDTO> results = new ArrayList<>();

        // 使用 HanLP 进行词性标注
        List<Term> terms = HanLP.segment(text);

        // 提取公司名称
        List<String> companies = extractOrganizations(terms, COMPANY_KEYWORDS);

        // 提取职位
        String position = extractPosition(terms);

        // 提取时间范围
        String[] dateRange = extractDateRange(text);

        // 提取职责描述
        String description = extractDescription(text);

        for (String company : companies) {
            results.add(ParsedResumeDTO.ExperienceDTO.builder()
                    .id(UUID.randomUUID().toString())
                    .company(company)
                    .position(position)
                    .startDate(dateRange[0])
                    .endDate(dateRange[1])
                    .description(description)
                    .build());
        }

        // 如果没有识别到公司但有时间，也创建一个记录
        if (companies.isEmpty() && (dateRange[0] != null || dateRange[1] != null)) {
            results.add(ParsedResumeDTO.ExperienceDTO.builder()
                    .id(UUID.randomUUID().toString())
                    .position(position)
                    .startDate(dateRange[0])
                    .endDate(dateRange[1])
                    .description(description)
                    .build());
        }

        return results;
    }

    /**
     * 从项目区块提取项目信息
     */
    private List<ParsedResumeDTO.ProjectDTO> extractProjects(String text) {
        List<ParsedResumeDTO.ProjectDTO> results = new ArrayList<>();

        // 提取项目名称（nz 其它专名 或 包含"项目"关键词的短语）
        List<Term> terms = HanLP.segment(text);
        List<String> projectNames = new ArrayList<>();

        for (Term term : terms) {
            if (term.nature == Nature.nz || term.nature == Nature.nx) {
                projectNames.add(term.word);
            }
        }

        // 提取时间范围
        String[] dateRange = extractDateRange(text);

        // 提取技术栈
        Set<String> techs = extractSkills(text);

        // 提取描述
        String description = extractDescription(text);

        // 按行分割，尝试识别多个项目
        String[] lines = text.split("[\n\r]+");
        for (String line : lines) {
            if (line.contains("项目") || line.contains("Project")) {
                String projectName = extractProjectName(line);
                if (projectName != null && !projectName.isEmpty()) {
                    results.add(ParsedResumeDTO.ProjectDTO.builder()
                            .id(UUID.randomUUID().toString())
                            .projectName(projectName)
                            .startDate(dateRange[0])
                            .endDate(dateRange[1])
                            .techStack(String.join(", ", techs))
                            .description(line)
                            .build());
                }
            }
        }

        return results;
    }

    /**
     * 从文本提取技能
     */
    private Set<String> extractSkills(String text) {
        Set<String> skills = new HashSet<>();

        // 精确匹配已知技能
        for (String skill : TECH_SKILLS) {
            // 使用转义后的正则进行精确匹配
            String escapedSkill = skill.replace("+", "\\+").replace(".", "\\.");
            Pattern pattern = Pattern.compile("\\b" + escapedSkill + "\\b", Pattern.CASE_INSENSITIVE);
            if (pattern.matcher(text).find()) {
                skills.add(skill);
            }
        }

        // 使用 HanLP 提取名词短语作为补充
        List<String> phrases = HanLP.extractPhrase(text, 20);
        for (String phrase : phrases) {
            if (phrase.length() >= 2 && phrase.length() <= 15) {
                // 过滤掉可能是句子成分的短语
                if (!phrase.contains("的") && !phrase.contains("是") && !phrase.contains("在")) {
                    skills.add(phrase);
                }
            }
        }

        return skills;
    }

    // ==================== Helper Methods ====================

    /**
     * 提取机构名称（nt 词性 或 包含关键词的短语）
     */
    private List<String> extractOrganizations(List<Term> terms, Set<String> keywords) {
        List<String> orgs = new ArrayList<>();
        StringBuilder phrase = new StringBuilder();

        for (int i = 0; i < terms.size(); i++) {
            Term term = terms.get(i);

            // nt = 机构团体名
            if (term.nature == Nature.nt || term.nature == Nature.ntc ||
                    term.nature == Nature.nto || term.nature == Nature.nts) {
                phrase.append(term.word);
            } else if (keywords.stream().anyMatch(kw -> term.word.contains(kw))) {
                phrase.append(term.word);
            } else if (term.nature == Nature.ns && !phrase.isEmpty()) {
                // ns = 地名，跟随在机构名后
                phrase.append(term.word);
            } else {
                if (!phrase.isEmpty()) {
                    String orgName = phrase.toString().trim();
                    if (orgName.length() >= 2) {
                        orgs.add(orgName);
                    }
                    phrase.setLength(0);
                }
            }
        }

        // 处理最后一个短语
        if (!phrase.isEmpty()) {
            String orgName = phrase.toString().trim();
            if (orgName.length() >= 2) {
                orgs.add(orgName);
            }
        }

        // 去重
        return new ArrayList<>(new LinkedHashSet<>(orgs));
    }

    /**
     * 提取职位
     */
    private String extractPosition(List<Term> terms) {
        for (Term term : terms) {
            String word = term.word;
            for (String keyword : POSITION_KEYWORDS) {
                if (word.contains(keyword)) {
                    return word;
                }
            }
        }
        return null;
    }

    /**
     * 提取时间范围
     */
    private String[] extractDateRange(String text) {
        String[] range = new String[2];

        Matcher m = YEAR_RANGE_PATTERN.matcher(text);
        if (m.find()) {
            String matched = m.group();
            String[] parts = matched.split("[-~至]");
            if (parts.length >= 1) {
                range[0] = normalizeYear(parts[0].trim());
            }
            if (parts.length >= 2) {
                range[1] = normalizeYear(parts[1].trim());
            }
        }

        // 如果没找到范围，尝试单独匹配时间
        if (range[0] == null) {
            Matcher singleDate = Pattern.compile("(?:19|20)\\d{2}").matcher(text);
            if (singleDate.find()) {
                range[0] = singleDate.group() + "-01";
            }
        }

        return range;
    }

    /**
     * 规范化年份格式
     */
    private String normalizeYear(String year) {
        if (year == null || year.isEmpty()) {
            return null;
        }
        // 移除"至今"、"现在"等
        if (year.contains("至今") || year.contains("现在") || year.contains("Present")) {
            return "至今";
        }
        // 纯年份
        if (year.matches("\\d{4}")) {
            return year + "-01";
        }
        // 年月
        if (year.matches("\\d{4}[年./-]?\\d{1,2}?")) {
            return year.replace("年", "-").replace("月", "").replace(".", "-").replace("/", "-");
        }
        return year;
    }

    /**
     * 提取学历
     */
    private String extractDegree(String text) {
        if (text.contains("博士") || text.contains("PhD")) {
            return "博士";
        }
        if (text.contains("硕士") || text.contains("研究生") || text.contains("Master")) {
            return "硕士";
        }
        if (text.contains("本科") || text.contains("学士") || text.contains("Bachelor")) {
            return "本科";
        }
        return null;
    }

    /**
     * 提取专业（从词性标注结果中提取 nz / nn 词组合）
     */
    private String extractMajor(List<Term> terms) {
        StringBuilder major = new StringBuilder();

        for (Term term : terms) {
            // 提取名词组合
            if (term.nature == Nature.nn || term.nature == Nature.n || term.nature == Nature.nz) {
                if (major.length() > 0) {
                    major.append("");
                }
                major.append(term.word);
            }
        }

        return major.length() > 0 ? major.toString() : null;
    }

    /**
     * 提取项目名称
     */
    private String extractProjectName(String line) {
        // 匹配 "项目名称：xxx" 或 "xxx 项目"
        Pattern pattern = Pattern.compile("(?:项目名称|项目名)[:：]?\\s*([^\\s,，。]+)");
        Matcher m = pattern.matcher(line);
        if (m.find()) {
            return m.group(1).trim();
        }

        // 尝试提取引号内的内容
        pattern = Pattern.compile("[《\"'](.+?)[》\"']");
        m = pattern.matcher(line);
        if (m.find()) {
            return m.group(1).trim();
        }

        // 返回第一个非关键词的连续文本
        String cleaned = line.replaceAll("(?:项目|Project)[:：]?\\s*", "");
        return cleaned.split("[，,。.\\s]")[0];
    }

    /**
     * 提取描述文本
     */
    private String extractDescription(String text) {
        // 移除时间范围
        String desc = text.replaceAll(YEAR_RANGE_PATTERN.pattern(), "");
        // 移除多余空白
        desc = desc.replaceAll("\\s+", " ").trim();
        return desc;
    }
}
