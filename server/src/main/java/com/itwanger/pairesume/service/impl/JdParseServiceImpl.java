package com.itwanger.pairesume.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.itwanger.pairesume.dto.JdParseResult;
import com.itwanger.pairesume.service.JdParseService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.yaml.snakeyaml.Yaml;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class JdParseServiceImpl implements JdParseService {

    @Value("${ai.api-key}")
    private String apiKey;

    @Value("${ai.base-url}")
    private String baseUrl;

    @Value("${ai.analysis-model:${ai.model}}")
    private String analysisModel;

    @Value("${ai.timeout:300}")
    private int timeout;

    @Value("${app.prompts.jd-parse.config-file:config/jd-parse-prompts.yml}")
    private String promptConfigFile;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public JdParseServiceImpl(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.webClient = WebClient.builder().build();
    }

    @Override
    public JdParseResult parseJd(String jdText) {
        if (jdText == null || jdText.isBlank()) {
            return emptyResult();
        }

        log.info("[JD Parse] received text, length: {}", jdText.length());

        PromptConfig promptConfig = loadPromptConfig();
        String userPrompt = promptConfig.parsePrompt.replace("{{jd_content}}", jdText);

        String aiResponse = invokeAiChat(promptConfig.systemPrompt, userPrompt);
        log.debug("[JD Parse] AI response: {} chars", aiResponse.length());

        String cleanedJson = cleanJsonPayload(aiResponse);
        log.debug("[JD Parse] cleaned JSON: {}", cleanedJson.substring(0, Math.min(200, cleanedJson.length())));

        try {
            JdParseResult result = objectMapper.readValue(cleanedJson, JdParseResult.class);
            log.info("[JD Parse] complete. JobTitle: {}, Company: {}, RequiredSkills: {}, PreferredSkills: {}, Responsibilities: {}",
                    result.getJobTitle(),
                    result.getCompany(),
                    result.getRequiredSkills() != null ? result.getRequiredSkills().size() : 0,
                    result.getPreferredSkills() != null ? result.getPreferredSkills().size() : 0,
                    result.getResponsibilities() != null ? result.getResponsibilities().size() : 0);
            return result;
        } catch (Exception e) {
            log.error("[JD Parse] failed to parse AI response", e);
            throw new JdParseException("JD 解析失败: AI 返回结果无法解析", e);
        }
    }

    private PromptConfig loadPromptConfig() {
        try {
            Path path = Path.of(promptConfigFile);
            if (!Files.exists(path)) {
                log.warn("[JD Parse] prompt config not found: {}, using defaults", promptConfigFile);
                return getDefaultPromptConfig();
            }

            Yaml yaml = new Yaml();
            Map<String, Object> data = yaml.load(Files.readString(path));
            String systemPrompt = (String) data.get("systemPrompt");

            if (systemPrompt == null) {
                log.warn("[JD Parse] missing prompt fields, using defaults");
                return getDefaultPromptConfig();
            }

            return new PromptConfig(systemPrompt, systemPrompt);
        } catch (Exception e) {
            log.warn("[JD Parse] failed to load prompt config: {}, using defaults", e.getMessage());
            return getDefaultPromptConfig();
        }
    }

    private PromptConfig getDefaultPromptConfig() {
        String prompt = """
                你是一位资深的技术岗位 JD（职位描述）解析专家，擅长从招聘信息中准确提取结构化字段。

                你的解析原则：
                1. 准确提取，不遗漏关键信息，也不凭空编造。
                2. 区分「硬性要求」和「加分项」：硬性要求归为 required_skills，加分项/优先考虑归为 preferred_skills。
                3. 职责描述保持原文语义，可适度精简，但不改变原意。
                4. 所有字段值为中文，但技术名词保留原始英文（如 Java、Spring Boot、Kubernetes）。
                5. 如果某个字段在原 JD 中未提及，对应字段值设为空字符串或空数组。

                请从以下 JD 文本中提取结构化信息：

                JD 原文：
                {{jd_content}}

                输出要求（严格遵守）：
                - 只返回 JSON。
                - JSON 结构必须是：
                  {
                    "job_title": "岗位名称",
                    "company": "公司名称",
                    "required_skills": ["技能1", "技能2"],
                    "preferred_skills": ["技能1", "技能2"],
                    "responsibilities": ["职责描述1", "职责描述2"]
                  }
                - 所有字段必须存在，无对应信息时 job_title 和 company 为空字符串，skills 和 responsibilities 为空数组。
                """;
        return new PromptConfig(prompt, prompt);
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

        log.info("[JD Parse][AI] request: url={}, model={}", url, analysisModel);

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
                throw new JdParseException("AI 服务响应为空");
            }

            return extractAssistantContent(response);
        } catch (JdParseException e) {
            throw e;
        } catch (Exception e) {
            log.error("[JD Parse] AI chat invocation failed", e);
            throw new JdParseException("AI 服务调用失败: " + e.getMessage(), e);
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
            log.error("[JD Parse] failed to extract content from AI response", e);
            throw new JdParseException("AI 响应格式解析失败", e);
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

    private JdParseResult emptyResult() {
        return JdParseResult.builder()
                .jobTitle("")
                .company("")
                .requiredSkills(List.of())
                .preferredSkills(List.of())
                .responsibilities(List.of())
                .build();
    }

    private record PromptConfig(String systemPrompt, String parsePrompt) {
    }

    public static class JdParseException extends RuntimeException {
        public JdParseException(String message) {
            super(message);
        }

        public JdParseException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
