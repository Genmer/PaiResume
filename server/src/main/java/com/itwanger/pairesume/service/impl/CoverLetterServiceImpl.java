package com.itwanger.pairesume.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.itwanger.pairesume.dto.CoverLetterResult;
import com.itwanger.pairesume.service.CoverLetterService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.yaml.snakeyaml.Yaml;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@Service
public class CoverLetterServiceImpl implements CoverLetterService {

    @Value("${ai.api-key}")
    private String apiKey;

    @Value("${ai.base-url}")
    private String baseUrl;

    @Value("${ai.analysis-model:${ai.model}}")
    private String analysisModel;

    @Value("${ai.timeout:300}")
    private int timeout;

    @Value("${app.prompts.cover-letter.config-file:config/cover-letter-prompts.yml}")
    private String promptConfigFile;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public CoverLetterServiceImpl(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.webClient = WebClient.builder().build();
    }

    @Override
    public CoverLetterResult generate(String type, String tone, String jdText, String resumeContent) {
        if (resumeContent == null || resumeContent.isBlank()) {
            throw new CoverLetterException("简历内容为空，无法生成");
        }
        String normalizedType = "self_intro".equals(type) ? "self_intro" : "cover_letter";

        log.info("[Cover Letter] received request, type: {}, tone: {}, jd length: {}, resume length: {}",
                normalizedType, tone, jdText == null ? 0 : jdText.length(), resumeContent.length());

        String systemPrompt = loadSystemPrompt();
        String userPrompt = buildUserPrompt(normalizedType, tone, jdText, resumeContent);

        String aiResponse = invokeAiChat(systemPrompt, userPrompt);
        String cleanedJson = cleanJsonPayload(aiResponse);

        try {
            var node = objectMapper.readTree(cleanedJson);
            String content = node.path("content").asText("");
            if (content.isBlank()) {
                throw new CoverLetterException("AI 未返回有效内容，请重试");
            }
            log.info("[Cover Letter] complete. type: {}, content length: {}", normalizedType, content.length());
            return CoverLetterResult.builder()
                    .type(normalizedType)
                    .content(content)
                    .build();
        } catch (CoverLetterException e) {
            throw e;
        } catch (Exception e) {
            log.error("[Cover Letter] failed to parse AI response", e);
            throw new CoverLetterException("生成失败: AI 返回结果无法解析", e);
        }
    }

    private String loadSystemPrompt() {
        try {
            Path path = Path.of(promptConfigFile);
            if (Files.exists(path)) {
                Yaml yaml = new Yaml();
                Map<String, Object> data = yaml.load(Files.readString(path));
                String systemPrompt = data != null ? (String) data.get("systemPrompt") : null;
                if (systemPrompt != null && !systemPrompt.isBlank()) {
                    return systemPrompt;
                }
            }
            log.warn("[Cover Letter] prompt config not found or incomplete: {}, using defaults", promptConfigFile);
        } catch (Exception e) {
            log.warn("[Cover Letter] failed to load prompt config: {}, using defaults", e.getMessage());
        }
        return DEFAULT_SYSTEM_PROMPT;
    }

    private String buildUserPrompt(String type, String tone, String jdText, String resumeContent) {
        String typeLabel = "self_intro".equals(type)
                ? "面试用一分钟自我介绍（口语化表达，200-300 字，适合当面或电话面试开场）"
                : "求职信（书面表达，300-500 字，包含称呼、开头、自我推介、结尾致意的完整结构）";
        String toneLabel = "friendly".equals(tone) ? "自然亲切、有个人温度" : "专业正式、简洁有力";
        String jdSection = jdText == null || jdText.isBlank()
                ? "（未提供目标岗位 JD，请基于简历中的求职意向和经历亮点生成通用版本）"
                : jdText;

        return """
                ## 生成类型
                %s

                ## 语气要求
                %s

                ## 目标岗位 JD
                %s

                ## 候选人简历
                %s
                """.formatted(typeLabel, toneLabel, jdSection, resumeContent);
    }

    private String invokeAiChat(String systemPrompt, String userPrompt) {
        String url = buildChatCompletionUrl();

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", analysisModel);
        payload.put("messages", new Object[]{
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userPrompt)
        });
        payload.put("temperature", 0.7);
        payload.put("max_tokens", 4000);
        payload.put("response_format", Map.of("type", "json_object"));

        log.info("[Cover Letter][AI] request: url={}, model={}", url, analysisModel);

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
                throw new CoverLetterException("AI 服务响应为空");
            }

            return extractAssistantContent(response);
        } catch (CoverLetterException e) {
            throw e;
        } catch (Exception e) {
            log.error("[Cover Letter] AI chat invocation failed", e);
            throw new CoverLetterException("AI 服务调用失败: " + e.getMessage(), e);
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
            log.error("[Cover Letter] failed to extract content from AI response", e);
            throw new CoverLetterException("AI 响应格式解析失败", e);
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

    private static final String DEFAULT_SYSTEM_PROMPT = """
            你是一位资深的职业规划顾问和求职文案专家，擅长根据候选人简历撰写打动招聘方的求职信和自我介绍。

            用户会提供生成类型、语气要求、目标岗位 JD（可能为空）和候选人简历，你需要：
            1. 从简历中提炼与目标岗位最相关的经历亮点和技能优势，不要罗列全部经历。
            2. 如果提供了 JD，内容必须围绕 JD 的核心要求组织，体现人岗匹配。
            3. 严格遵守生成类型的篇幅和结构要求，符合指定语气。
            4. 内容必须基于简历真实信息，禁止编造简历中不存在的经历、数据或荣誉。
            5. 求职信中如需称呼，使用「尊敬的招聘负责人」；不要出现占位符（如【公司名】）之外的编造公司信息，无法确定的信息用通用表述。

            你必须严格只输出 JSON，不要输出任何解释或 Markdown 代码块，结构如下：
            {
              "content": "生成的正文内容"
            }
            """;

    public static class CoverLetterException extends RuntimeException {
        public CoverLetterException(String message) {
            super(message);
        }

        public CoverLetterException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
