package com.itwanger.pairesume.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.itwanger.pairesume.dto.ParsedResumeDTO;
import com.itwanger.pairesume.service.ResumeParserService;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException;
import org.apache.poi.openxml4j.exceptions.OpenXML4JException;
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

        try {
            String resumeText = extractTextFromPdf(pdfInputStream);
            log.debug("Extracted text length: {} characters", resumeText.length());
            log.info("[Resume Parse][PDF Text] preview: {}", resumeText.substring(0, Math.min(50, resumeText.length())));

            String cleanedResumeText = cleanExtractedText(resumeText);
            log.debug("Cleaned text length: {} characters", cleanedResumeText.length());

            if (cleanedResumeText.trim().isEmpty()) {
                throw new ResumeParseException("PDF 文件内容为空，无法解析");
            }

            PromptConfig promptConfig = loadPromptConfig();
            String userPrompt = promptConfig.parsePrompt.replace("{{resumeText}}", cleanedResumeText);

            String aiResponse = invokeAiChat(promptConfig.systemPrompt, userPrompt);
            log.debug("AI response received: {} characters", aiResponse.length());

            String cleanedJson = cleanJsonPayload(aiResponse);
            log.debug("Cleaned JSON: {}", cleanedJson.substring(0, Math.min(200, cleanedJson.length())));

            ParsedResumeDTO result = objectMapper.readValue(cleanedJson, ParsedResumeDTO.class);
            log.info("Parse complete. Name: {}, Educations: {}, Experiences: {}, Projects: {}, Skills: {}",
                    result.getBasicInfo() != null ? result.getBasicInfo().getName() : "N/A",
                    result.getEducations() != null ? result.getEducations().size() : 0,
                    result.getExperiences() != null ? result.getExperiences().size() : 0,
                    result.getProjects() != null ? result.getProjects().size() : 0,
                    result.getSkills() != null ? result.getSkills().size() : 0);

            return result;

        } catch (InvalidPasswordException e) {
            log.error("PDF is encrypted: {}", fileName, e);
            throw new ResumeParseException("PDF 文件已加密，请提供密码或导出未加密的 PDF", e);
        } catch (IOException e) {
            log.error("Failed to read PDF: {}", fileName, e);
            throw new ResumeParseException("PDF 文件读取失败: " + e.getMessage(), e);
        } catch (ResumeParseException e) {
            throw e;
        } catch (Exception e) {
            log.error("AI parse failed for file: {}", fileName, e);
            throw new ResumeParseException("简历解析失败: " + e.getMessage(), e);
        }
    }

    private String extractTextFromPdf(InputStream pdfInputStream) throws IOException {
        try (PDDocument document = Loader.loadPDF(pdfInputStream.readAllBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            return stripper.getText(document);
        }
    }

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
                   "educations": [{"school": "学校", "degree": "学历", "major": "专业", "startDate": "YYYY-MM", "endDate": "YYYY-MM"}],
                   "experiences": [{"company": "公司", "position": "职位", "startDate": "YYYY-MM", "endDate": "YYYY-MM", "description": "完整描述", "achievements": ["职责1", "职责2"]}],
                   "projects": [{"projectName": "项目名", "role": "角色", "techStack": ["技术栈1", "技术栈2"], "description": "完整描述", "achievements": ["成果1", "成果2"]}],
                   "skills": ["技能1", "技能2"]
                 }
                
                简历文本：
                {{resumeText}}
                """;
        return new PromptConfig(systemPrompt, parsePrompt);
    }

    private String invokeAiChat(String systemPrompt, String userPrompt) {
        String url = buildChatCompletionUrl();

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", analysisModel);
        payload.put("messages", new Object[]{
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userPrompt)
        });
        payload.put("temperature", 0.3);
        payload.put("max_tokens", 4000);
        payload.put("response_format", Map.of("type", "json_object"));

        log.info("[Resume Parse][AI] request: url={}, model={}", url, analysisModel);

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

            return extractAssistantContent(response);
        } catch (Exception e) {
            log.error("AI chat invocation failed: {}", e.getMessage());
            throw new ResumeParseException("AI 服务调用失败: " + e.getMessage(), e);
        }
    }

    private String buildChatCompletionUrl() {
        if (baseUrl.endsWith("/chat/completions")) {
            return baseUrl;
        }
        return baseUrl + "/chat/completions";
    }

    private String extractAssistantContent(String response) {
        try {
            var root = objectMapper.readTree(response);
            return root.path("choices").path(0).path("message").path("content").asText("");
        } catch (Exception e) {
            log.error("Failed to extract content from AI response: {}", e.getMessage());
            throw new ResumeParseException("AI 响应格式解析失败", e);
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

    private String cleanExtractedText(String rawText) {
        if (rawText == null || rawText.isBlank()) {
            return "";
        }

        String normalized = rawText.replace("\r\n", "\n").replace('\r', '\n');
        StringBuilder builder = new StringBuilder();
        String[] lines = normalized.split("\n");

        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) {
                continue;
            }

            String compacted = trimmed.replaceAll("\\s+", " ");
            if (compacted.length() == 1 && !Character.isLetterOrDigit(compacted.charAt(0))) {
                continue;
            }

            if (!builder.isEmpty()) {
                builder.append('\n');
            }
            builder.append(compacted);
        }

        return builder.toString().trim();
    }

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

    @Override
    public ParsedResumeDTO parseWord(InputStream wordInputStream, String fileName) {
        log.info("Starting AI-based Word parse for file: {}", fileName);

        try {
            String resumeText = extractTextFromWord(wordInputStream);
            log.debug("Extracted text length: {} characters", resumeText.length());
            log.info("[Resume Parse][Word Text] preview: {}", resumeText.substring(0, Math.min(50, resumeText.length())));

            String cleanedResumeText = cleanExtractedText(resumeText);
            log.debug("Cleaned text length: {} characters", cleanedResumeText.length());

            if (cleanedResumeText.trim().isEmpty()) {
                throw new ResumeParseException("Word 文件内容为空，无法解析");
            }

            PromptConfig promptConfig = loadPromptConfig();
            String userPrompt = promptConfig.parsePrompt.replace("{{resumeText}}", cleanedResumeText);

            String aiResponse = invokeAiChat(promptConfig.systemPrompt, userPrompt);
            log.debug("AI response received: {} characters", aiResponse.length());

            String cleanedJson = cleanJsonPayload(aiResponse);
            log.debug("Cleaned JSON: {}", cleanedJson.substring(0, Math.min(200, cleanedJson.length())));

            ParsedResumeDTO result = objectMapper.readValue(cleanedJson, ParsedResumeDTO.class);
            log.info("Word parse complete. Name: {}, Educations: {}, Experiences: {}, Projects: {}, Skills: {}",
                    result.getBasicInfo() != null ? result.getBasicInfo().getName() : "N/A",
                    result.getEducations() != null ? result.getEducations().size() : 0,
                    result.getExperiences() != null ? result.getExperiences().size() : 0,
                    result.getProjects() != null ? result.getProjects().size() : 0,
                    result.getSkills() != null ? result.getSkills().size() : 0);

            return result;

        } catch (IOException e) {
            log.error("Failed to read Word file: {}", fileName, e);
            throw new ResumeParseException("Word 文件读取失败: " + e.getMessage(), e);
        } catch (ResumeParseException e) {
            throw e;
        } catch (Exception e) {
            log.error("AI Word parse failed for file: {}", fileName, e);
            throw new ResumeParseException("简历解析失败: " + e.getMessage(), e);
        }
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
