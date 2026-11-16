package com.itwanger.pairesume.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.itwanger.pairesume.dto.ParsedResumeDTO;
import com.itwanger.pairesume.service.ResumeParserService;
import com.itwanger.pairesume.util.LayoutAwarePdfTextExtractor;
import com.itwanger.pairesume.util.ResumeTextCleaner;
import com.itwanger.pairesume.util.TruncatedJsonRepair;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException;
import org.apache.poi.hwpf.HWPFDocument;
import org.apache.poi.hwpf.extractor.WordExtractor;
import org.apache.poi.poifs.filesystem.FileMagic;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.yaml.snakeyaml.Yaml;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class ResumeParserServiceImpl implements ResumeParserService {

    @Value("${ai.api-key}")
    private String apiKey;

    @Value("${ai.base-url}")
    private String baseUrl;

    @Value("${ai.analysis-model:${ai.model}}")
    private String analysisModel;

    @Value("${ai.timeout:300}")
    private int timeout;

    /** 解析单次调用的 max_tokens（description 与 achievements 双份输出时 4000 易截断） */
    @Value("${ai.parse-max-tokens:8192}")
    private int parseMaxTokens;

    /** 解析温度：信息抽取任务取低值保证稳定 */
    @Value("${ai.parse-temperature:0.1}")
    private double parseTemperature;

    /** 最多解析的 PDF 页数，防止超长文档打爆 token 预算 */
    @Value("${ai.parse-max-pages:15}")
    private int parseMaxPages;

    /** 送入 prompt 的文本硬上限（字符数） */
    @Value("${ai.parse-max-text-chars:24000}")
    private int parseMaxTextChars;

    @Value("${app.prompts.resume-parse.config-file:config/resume-parse-prompt.yml}")
    private String promptConfigFile;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public ResumeParserServiceImpl(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.webClient = WebClient.builder().build();
    }

    @Override
    public ParsedResumeDTO parsePdf(InputStream pdfInputStream, String fileName) {
        log.info("Starting AI-based PDF parse for file: {}", fileName);
        byte[] bytes;
        try {
            bytes = pdfInputStream.readAllBytes();
        } catch (IOException e) {
            throw new ResumeParseException("PDF 文件读取失败: " + e.getMessage(), e);
        }

        LayoutAwarePdfTextExtractor.ExtractedText extraction;
        try (PDDocument document = Loader.loadPDF(bytes)) {
            extraction = LayoutAwarePdfTextExtractor.extract(document, parseMaxPages);
        } catch (InvalidPasswordException e) {
            log.error("PDF is encrypted: {}", fileName, e);
            throw new ResumeParseException("PDF 文件已加密，请提供密码或导出未加密的 PDF", e);
        } catch (IOException e) {
            log.error("Failed to read PDF: {}", fileName, e);
            throw new ResumeParseException("PDF 文件读取失败: " + e.getMessage(), e);
        }

        if (extraction.columnLayoutDetected()) {
            log.info("Column layout detected for {}, reordering to reading sequence", fileName);
        }

        String cleanedText = ResumeTextCleaner.cleanText(extraction.text());
        validatePdfText(cleanedText, extraction.pageCount());

        return parseWithAi(cleanedText, fileName);
    }

    @Override
    public ParsedResumeDTO parseWord(InputStream wordInputStream, String fileName) {
        log.info("Starting AI-based Word parse for file: {}", fileName);
        String resumeText;
        try {
            resumeText = extractTextFromWord(wordInputStream);
        } catch (IOException e) {
            log.error("Failed to read Word file: {}", fileName, e);
            throw new ResumeParseException("Word 文件读取失败: " + e.getMessage(), e);
        }

        String cleanedText = ResumeTextCleaner.cleanText(resumeText);
        if (cleanedText.isBlank()) {
            throw new ResumeParseException("Word 文件内容为空，无法解析");
        }
        if (ResumeTextCleaner.isGarbledBeyondRecovery(cleanedText)) {
            throw new ResumeParseException("Word 文本疑似乱码（编码异常），无法解析");
        }

        return parseWithAi(cleanedText, fileName);
    }

    // ==================== 共享 AI 解析流程 ====================

    private ParsedResumeDTO parseWithAi(String cleanedText, String fileName) {
        String cappedText = ResumeTextCleaner.capText(cleanedText, parseMaxTextChars);
        if (cappedText.length() < cleanedText.length()) {
            log.warn("Resume text capped from {} to {} chars for file: {}",
                    cleanedText.length(), cappedText.length(), fileName);
        }

        PromptConfig promptConfig = loadPromptConfig();
        String userPrompt = promptConfig.parsePrompt.replace("{{resumeText}}", cappedText);

        String aiResponse = requestAiJson(promptConfig.systemPrompt, userPrompt);
        ParsedResumeDTO result = sanitize(parseResumeJson(aiResponse));

        log.info("Parse complete for {}. Name: {}, Educations: {}, Experiences: {}, Projects: {}, Awards: {}, Papers: {}, Researches: {}, Skills: {}",
                fileName,
                result.getBasicInfo() != null ? result.getBasicInfo().getName() : "N/A",
                sizeOf(result.getEducations()),
                sizeOf(result.getExperiences()),
                sizeOf(result.getProjects()),
                sizeOf(result.getAwards()),
                sizeOf(result.getPapers()),
                sizeOf(result.getResearches()),
                sizeOf(result.getSkills()));
        return result;
    }

    private static int sizeOf(java.util.List<?> list) {
        return list == null ? 0 : list.size();
    }

    // ==================== AI 输出后校验（sanitize） ====================

    /**
     * AI 输出后校验：过滤全空元素、补齐 null 列表；若整个结果无任何有效内容则报错，
     * 避免静默导入一份只有文件名标题的空简历。包私有 static 便于单测。
     */
    static ParsedResumeDTO sanitize(ParsedResumeDTO dto) {
        if (dto == null) {
            throw new ResumeParseException("AI 返回结果为空，无法解析简历");
        }
        dto.setEducations(pruneList(dto.getEducations()));
        dto.setExperiences(pruneList(dto.getExperiences()));
        dto.setProjects(pruneList(dto.getProjects()));
        dto.setAwards(pruneList(dto.getAwards()));
        dto.setPapers(pruneList(dto.getPapers()));
        dto.setResearches(pruneList(dto.getResearches()));
        dto.setSkills(dto.getSkills() == null
                ? java.util.List.of()
                : dto.getSkills().stream().filter(s -> s != null && !s.isBlank()).toList());

        boolean basicInfoEmpty = basicInfoAllBlank(dto.getBasicInfo());
        boolean allEmpty = basicInfoEmpty
                && dto.getEducations().isEmpty() && dto.getExperiences().isEmpty()
                && dto.getProjects().isEmpty() && dto.getAwards().isEmpty()
                && dto.getPapers().isEmpty() && dto.getResearches().isEmpty()
                && dto.getSkills().isEmpty();
        if (allEmpty) {
            throw new ResumeParseException("未能从简历中识别出有效内容，请确认文件是简历正文而非封面/图片");
        }
        return dto;
    }

    private static boolean basicInfoAllBlank(ParsedResumeDTO.BasicInfoDTO info) {
        if (info == null) {
            return true;
        }
        return allBlank(info.getName(), info.getEmail(), info.getPhone(), info.getGithub(),
                info.getWebsite(), info.getLocation(), info.getJobIntention(),
                info.getWorkYears(), info.getSummary());
    }

    private static <T> List<T> pruneList(List<T> list) {
        if (list == null) {
            return List.of();
        }
        return list.stream().filter(item -> !isAllBlankItem(item)).toList();
    }

    /** 元素的所有字符串字段（含列表内字符串）全为 null/空白 → 视为空元素 */
    private static boolean isAllBlankItem(Object item) {
        if (item == null) {
            return true;
        }
        if (item instanceof ParsedResumeDTO.BasicInfoDTO o) {
            return basicInfoAllBlank(o);
        }
        if (item instanceof ParsedResumeDTO.EducationDTO o) {
            return allBlank(o.getSchool(), o.getDegree(), o.getMajor(), o.getDepartment(),
                    o.getStartDate(), o.getEndDate());
        }
        if (item instanceof ParsedResumeDTO.ExperienceDTO o) {
            return allBlank(o.getCompany(), o.getPosition(), o.getEmploymentType(),
                    o.getStartDate(), o.getEndDate(), o.getDescription())
                    && allBlank(o.getAchievements());
        }
        if (item instanceof ParsedResumeDTO.ProjectDTO o) {
            return allBlank(o.getProjectName(), o.getRole(), o.getStartDate(), o.getEndDate(),
                    o.getDescription())
                    && allBlank(o.getTechStack()) && allBlank(o.getAchievements());
        }
        if (item instanceof ParsedResumeDTO.AwardDTO o) {
            return allBlank(o.getAwardName(), o.getAwardTime());
        }
        if (item instanceof ParsedResumeDTO.PaperDTO o) {
            return allBlank(o.getJournalType(), o.getJournalName(), o.getPublishTime(), o.getContent());
        }
        if (item instanceof ParsedResumeDTO.ResearchDTO o) {
            return allBlank(o.getProjectName(), o.getProjectCycle(), o.getBackground(),
                    o.getWorkContent(), o.getAchievements());
        }
        return false;
    }

    private static boolean allBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return false;
            }
        }
        return true;
    }

    private static boolean allBlank(List<String> values) {
        return values == null || values.stream().allMatch(v -> v == null || v.isBlank());
    }

    private void validatePdfText(String cleanedText, int pageCount) {
        if (ResumeTextCleaner.looksScanned(pageCount, cleanedText.length())) {
            throw new ResumeParseException(
                    "未从 PDF 中提取到可读文本，可能为扫描版或图片型 PDF，请改用文本版 PDF 或文字版简历");
        }
        if (ResumeTextCleaner.isGarbledBeyondRecovery(cleanedText)) {
            throw new ResumeParseException(
                    "PDF 内嵌字体编码异常，提取文本为乱码，无法解析。请尝试用其他工具重新导出 PDF");
        }
        if (cleanedText.isBlank()) {
            throw new ResumeParseException("PDF 文件内容为空，无法解析");
        }
    }

    // ==================== AI 调用（含截断重试） ====================

    /** 单次 AI 调用结果：正文 + finish_reason */
    private record AiChatResult(String content, String finishReason) {}

    private String requestAiJson(String systemPrompt, String userPrompt) {
        AiChatResult first = invokeAiChat(systemPrompt, userPrompt, parseMaxTokens);
        if ("length".equals(first.finishReason())) {
            log.warn("AI response truncated (finish_reason=length, max_tokens={}), retrying with doubled budget {}",
                    parseMaxTokens, parseMaxTokens * 2);
            AiChatResult second = invokeAiChat(systemPrompt, userPrompt, parseMaxTokens * 2);
            return second.content();
        }
        return first.content();
    }

    private AiChatResult invokeAiChat(String systemPrompt, String userPrompt, int maxTokens) {
        String url = buildChatCompletionUrl();

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", analysisModel);
        payload.put("messages", new Object[]{
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userPrompt)
        });
        payload.put("temperature", parseTemperature);
        payload.put("max_tokens", maxTokens);
        payload.put("response_format", Map.of("type", "json_object"));

        log.info("[Resume Parse][AI] request: url={}, model={}, maxTokens={}", url, analysisModel, maxTokens);

        try {
            String response = webClient.post()
                    .uri(url)
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block(Duration.ofSeconds(timeout));

            if (response == null) {
                throw new ResumeParseException("AI 服务响应为空");
            }
            return parseChatResponse(response);
        } catch (ResumeParseException e) {
            throw e;
        } catch (Exception e) {
            log.error("AI chat invocation failed: {}", e.getMessage());
            throw new ResumeParseException("AI 服务调用失败: " + e.getMessage(), e);
        }
    }

    private AiChatResult parseChatResponse(String response) {
        try {
            var choice = objectMapper.readTree(response).path("choices").path(0);
            return new AiChatResult(
                    choice.path("message").path("content").asText(""),
                    choice.path("finish_reason").asText(""));
        } catch (Exception e) {
            log.error("Failed to extract content from AI response: {}", e.getMessage());
            throw new ResumeParseException("AI 响应格式解析失败", e);
        }
    }

    // ==================== JSON 解析（含截断修复） ====================

    private ParsedResumeDTO parseResumeJson(String aiResponse) {
        String cleanedJson = cleanJsonPayload(aiResponse);
        try {
            return objectMapper.readValue(cleanedJson, ParsedResumeDTO.class);
        } catch (JsonProcessingException e) {
            String repaired = TruncatedJsonRepair.repair(cleanedJson);
            if (repaired == null) {
                throw new ResumeParseException("AI 返回的 JSON 无法解析: " + e.getOriginalMessage(), e);
            }
            log.warn("AI JSON appears truncated, attempting repaired parse");
            try {
                ParsedResumeDTO result = objectMapper.readValue(repaired, ParsedResumeDTO.class);
                log.info("Truncated JSON repaired and parsed successfully");
                return result;
            } catch (JsonProcessingException e2) {
                throw new ResumeParseException("AI 返回的 JSON 无法解析（修复后仍失败）: " + e2.getOriginalMessage(), e2);
            }
        }
    }

    private String cleanJsonPayload(String content) {
        var cleaned = content == null ? "" : content.trim();

        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        }
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        cleaned = cleaned.trim();

        int jsonStart = cleaned.indexOf('{');
        int jsonEnd = cleaned.lastIndexOf('}');
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
            cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
        }

        return cleaned.trim();
    }

    // ==================== prompt 配置 ====================

    private PromptConfig loadPromptConfig() {
        try {
            Path path = Path.of(promptConfigFile);
            if (!Files.exists(path)) {
                log.warn("Prompt config file not found: {}, using defaults", promptConfigFile);
                return getDefaultPromptConfig();
            }

            Yaml yaml = new Yaml();
            Map<String, Object> data = yaml.load(Files.readString(path));
            String systemPrompt = (String) data.get("systemPrompt");
            String parsePrompt = (String) data.get("parsePrompt");

            if (systemPrompt == null || parsePrompt == null) {
                log.warn("Missing prompt fields in config, using defaults");
                return getDefaultPromptConfig();
            }

            return new PromptConfig(systemPrompt, parsePrompt);
        } catch (Exception e) {
            log.warn("Failed to load prompt config: {}, using defaults", e.getMessage());
            return getDefaultPromptConfig();
        }
    }

    private PromptConfig getDefaultPromptConfig() {
        String systemPrompt = "你是一位专业的简历解析助手，擅长从非结构化的简历文本中提取结构化信息。";
        String parsePrompt = """
                请从以下简历文本中提取结构化信息，直接输出 JSON 格式（不要使用 Markdown 标记）：

                 {
                   "basicInfo": {
                     "name": "姓名",
                     "email": "邮箱",
                     "phone": "手机号",
                     "github": "GitHub链接",
                     "website": "个人网站",
                     "location": "所在地",
                     "jobIntention": "求职意向",
                     "workYears": "工作年限（只有原文明确出现时才填写）",
                     "summary": "个人总结/自我评价"
                   },
                   "educations": [{"school": "学校", "degree": "学历", "major": "专业", "department": "院系（原文有则填）", "startDate": "YYYY-MM", "endDate": "YYYY-MM"}],
                   "experiences": [{"company": "公司", "position": "职位", "employmentType": "internship 或 full-time（原文未明示则不填）", "startDate": "YYYY-MM", "endDate": "YYYY-MM（在读中/在职中填\\"至今\\"）", "description": "完整描述", "achievements": ["职责1", "职责2"]}],
                   "projects": [{"projectName": "项目名", "role": "角色", "startDate": "YYYY-MM", "endDate": "YYYY-MM", "techStack": ["技术栈1", "技术栈2"], "description": "完整描述", "achievements": ["成果1", "成果2"]}],
                   "awards": [{"awardName": "奖项/证书名", "awardTime": "YYYY-MM"}],
                   "papers": [{"journalType": "期刊/会议类型", "journalName": "期刊/会议名", "publishTime": "YYYY-MM", "content": "论文简述"}],
                   "researches": [{"projectName": "课题名", "projectCycle": "周期如 2021-09 至 2023-06", "background": "课题背景", "workContent": "承担工作", "achievements": "成果"}],
                   "skills": ["技能描述（绝对不要拆分成单个词汇！按原文的行/块完整保留一整段描述，如：'编程语言：深入理解并熟练使用 Java，熟悉 Golang'）"]
                 }

                 没有的板块填 [] 或 null，不要编造。以 "## " 开头的行是按字号识别出的标题行。
                 简历文本：
                 {{resumeText}}
                 """;
        return new PromptConfig(systemPrompt, parsePrompt);
    }

    // ==================== 文本抽取 ====================

    private String extractTextFromWord(InputStream wordInputStream) throws IOException {
        byte[] bytes = wordInputStream.readAllBytes();

        FileMagic fm = FileMagic.valueOf(bytes);

        if (fm == FileMagic.OOXML) {
            try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
                StringBuilder text = new StringBuilder();

                for (XWPFParagraph paragraph : doc.getParagraphs()) {
                    for (XWPFRun run : paragraph.getRuns()) {
                        String runText = run.text();
                        if (!runText.isBlank()) {
                            text.append(runText).append(" ");
                        }
                    }
                    text.append("\n");
                }

                for (XWPFTable table : doc.getTables()) {
                    for (XWPFTableRow row : table.getRows()) {
                        for (XWPFTableCell cell : row.getTableCells()) {
                            for (XWPFParagraph paragraph : cell.getParagraphs()) {
                                for (XWPFRun run : paragraph.getRuns()) {
                                    String runText = run.text();
                                    if (!runText.isBlank()) {
                                        text.append(runText).append(" ");
                                    }
                                }
                                text.append("\n");
                            }
                            text.append("\t");
                        }
                        text.append("\n");
                    }
                    text.append("\n");
                }

                return text.toString();
            }
        } else if (fm == FileMagic.OLE2) {
            try (HWPFDocument doc = new HWPFDocument(new ByteArrayInputStream(bytes));
                 WordExtractor extractor = new WordExtractor(doc)) {
                return extractor.getText();
            }
        }

        throw new IOException("Unsupported Word format or invalid file");
    }

    private String buildChatCompletionUrl() {
        if (baseUrl.endsWith("/chat/completions")) {
            return baseUrl;
        }
        return baseUrl + "/chat/completions";
    }

    private record PromptConfig(String systemPrompt, String parsePrompt) {}

    public static class ResumeParseException extends RuntimeException {
        public ResumeParseException(String message) {
            super(message);
        }

        public ResumeParseException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
