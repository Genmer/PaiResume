package com.itwanger.pairesume.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.itwanger.pairesume.dto.AtsCheckResult;
import com.itwanger.pairesume.service.AtsCheckService;
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
public class AtsCheckServiceImpl implements AtsCheckService {

    @Value("${ai.api-key}")
    private String apiKey;

    @Value("${ai.base-url}")
    private String baseUrl;

    @Value("${ai.analysis-model:${ai.model}}")
    private String analysisModel;

    @Value("${ai.timeout:300}")
    private int timeout;

    @Value("${ai.prompts.ats-check.config-file:config/ats-check-prompts.yml}")
    private String promptConfigFile;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public AtsCheckServiceImpl(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.webClient = WebClient.builder().build();
    }

    @Override
    public AtsCheckResult checkAts(String resumeContent) {
        if (resumeContent == null || resumeContent.isBlank()) {
            return emptyResult();
        }

        log.info("[ATS Check] received content, length: {}", resumeContent.length());

        PromptConfig promptConfig = loadPromptConfig();
        String userPrompt = promptConfig.analysisPrompt.replace("{{resumeContent}}", resumeContent);

        String aiResponse = invokeAiChat(promptConfig.systemPrompt, userPrompt);
        log.debug("[ATS Check] AI response: {} chars", aiResponse.length());

        String cleanedJson = cleanJsonPayload(aiResponse);
        log.debug("[ATS Check] cleaned JSON: {}", cleanedJson.substring(0, Math.min(200, cleanedJson.length())));

        try {
            Map<String, Object> raw = objectMapper.readValue(cleanedJson, new TypeReference<>() {});
            Integer overallScore = raw.get("overall_score") instanceof Number n ? n.intValue() : 0;

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> rawCategories = (List<Map<String, Object>>) raw.get("categories");
            List<AtsCheckResult.Category> categories = rawCategories == null ? List.of() : rawCategories.stream()
                    .map(this::mapCategory)
                    .toList();

            log.info("[ATS Check] complete. Overall Score: {}, Categories: {}", overallScore, categories.size());
            return AtsCheckResult.builder()
                    .overallScore(overallScore)
                    .categories(categories)
                    .build();
        } catch (Exception e) {
            log.error("[ATS Check] failed to parse AI response", e);
            throw new AtsCheckException("ATS检测失败: AI 返回结果无法解析", e);
        }
    }

    private AtsCheckResult.Category mapCategory(Map<String, Object> raw) {
        String name = raw.get("name") instanceof String s ? s : "";
        Integer score = raw.get("score") instanceof Number n ? n.intValue() : 0;

        @SuppressWarnings("unchecked")
        List<String> issues = (List<String>) raw.get("issues");
        if (issues == null) {
            issues = List.of();
        }

        return AtsCheckResult.Category.builder()
                .name(name)
                .score(score)
                .issues(issues)
                .build();
    }

    private PromptConfig loadPromptConfig() {
        try {
            Path path = Path.of(promptConfigFile);
            if (!Files.exists(path)) {
                log.warn("[ATS Check] prompt config not found: {}, using defaults", promptConfigFile);
                return getDefaultPromptConfig();
            }

            Yaml yaml = new Yaml();
            Map<String, Object> data = yaml.load(Files.readString(path));
            String systemPrompt = (String) data.get("systemPrompt");
            String analysisPrompt = (String) data.get("analysisPrompt");

            if (systemPrompt == null || analysisPrompt == null) {
                log.warn("[ATS Check] missing prompt fields, using defaults");
                return getDefaultPromptConfig();
            }

            return new PromptConfig(systemPrompt, analysisPrompt);
        } catch (Exception e) {
            log.warn("[ATS Check] failed to load prompt config: {}, using defaults", e.getMessage());
            return getDefaultPromptConfig();
        }
    }

    private PromptConfig getDefaultPromptConfig() {
        String system = "你是一位资深的招聘系统（ATS）兼容性分析专家，精通国内外主流招聘平台的简历解析规则。你的任务是对简历进行ATS兼容性全面审查，并给出可执行的改进建议。";
        String analysis = """
                请对以下简历内容进行ATS兼容性审查，返回JSON格式结果，包含overall_score和categories数组。
                
                审核维度：排版与格式、关键词覆盖、章节结构、联系方式、文件兼容性。
                
                {{resumeContent}}
                """;
        return new PromptConfig(system, analysis);
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

        log.info("[ATS Check][AI] request: url={}, model={}", url, analysisModel);

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
                throw new AtsCheckException("AI 服务响应为空");
            }

            return extractAssistantContent(response);
        } catch (AtsCheckException e) {
            throw e;
        } catch (Exception e) {
            log.error("[ATS Check] AI chat invocation failed", e);
            throw new AtsCheckException("AI 服务调用失败: " + e.getMessage(), e);
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
            log.error("[ATS Check] failed to extract content from AI response", e);
            throw new AtsCheckException("AI 响应格式解析失败", e);
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

    private AtsCheckResult emptyResult() {
        return AtsCheckResult.builder()
                .overallScore(0)
                .categories(List.of())
                .build();
    }

    private record PromptConfig(String systemPrompt, String analysisPrompt) {
    }

    public static class AtsCheckException extends RuntimeException {
        public AtsCheckException(String message) {
            super(message);
        }

        public AtsCheckException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
