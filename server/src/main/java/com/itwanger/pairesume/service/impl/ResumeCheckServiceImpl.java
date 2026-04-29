package com.itwanger.pairesume.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.itwanger.pairesume.dto.ResumeCheckResult;
import com.itwanger.pairesume.service.ResumeCheckService;
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
public class ResumeCheckServiceImpl implements ResumeCheckService {

    @Value("${ai.api-key}")
    private String apiKey;

    @Value("${ai.base-url}")
    private String baseUrl;

    @Value("${ai.analysis-model:${ai.model}}")
    private String analysisModel;

    @Value("${ai.timeout:300}")
    private int timeout;

    @Value("${app.prompts.error-check.config-file:config/error-check-prompts.yml}")
    private String promptConfigFile;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public ResumeCheckServiceImpl(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.webClient = WebClient.builder().build();
    }

    @Override
    public ResumeCheckResult checkResume(String resumeContent) {
        if (resumeContent == null || resumeContent.isBlank()) {
            return emptyResult();
        }

        log.info("[Resume Check] received content, length: {}", resumeContent.length());

        PromptConfig promptConfig = loadPromptConfig();
        String userPrompt = promptConfig.parsePrompt.replace("{{resumeContent}}", resumeContent);

        String aiResponse = invokeAiChat(promptConfig.systemPrompt, userPrompt);
        log.debug("[Resume Check] AI response: {} chars", aiResponse.length());

        String cleanedJson = cleanJsonPayload(aiResponse);
        log.debug("[Resume Check] cleaned JSON: {}", cleanedJson.substring(0, Math.min(200, cleanedJson.length())));

        try {
            Map<String, Object> raw = objectMapper.readValue(cleanedJson, new TypeReference<>() {});
            Integer score = raw.get("score") instanceof Number n ? n.intValue() : 0;

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> rawIssues = (List<Map<String, Object>>) raw.get("issues");
            List<ResumeCheckResult.Issue> issues = rawIssues == null ? List.of() : rawIssues.stream()
                    .map(this::mapIssue)
                    .toList();

            log.info("[Resume Check] complete. Score: {}, Issues: {}", score, issues.size());
            return ResumeCheckResult.builder()
                    .score(score)
                    .issues(issues)
                    .detailed(true)
                    .build();
        } catch (Exception e) {
            log.error("[Resume Check] failed to parse AI response", e);
            throw new ResumeCheckException("简历检测失败: AI 返回结果无法解析", e);
        }
    }

    private ResumeCheckResult.Issue mapIssue(Map<String, Object> raw) {
        return ResumeCheckResult.Issue.builder()
                .category(toString(raw.get("category")))
                .severity(toString(raw.get("severity")))
                .field(toString(raw.get("field")))
                .message(toString(raw.get("message")))
                .suggestion(toString(raw.get("suggestion")))
                .build();
    }

    private String toString(Object value) {
        return value == null ? "" : value.toString();
    }

    private PromptConfig loadPromptConfig() {
        try {
            Path path = Path.of(promptConfigFile);
            if (!Files.exists(path)) {
                log.warn("[Resume Check] prompt config not found: {}, using defaults", promptConfigFile);
                return getDefaultPromptConfig();
            }

            Yaml yaml = new Yaml();
            Map<String, Object> data = yaml.load(Files.readString(path));
            String systemPrompt = (String) data.get("systemPrompt");

            if (systemPrompt == null) {
                log.warn("[Resume Check] missing prompt fields, using defaults");
                return getDefaultPromptConfig();
            }

            return new PromptConfig(systemPrompt, systemPrompt);
        } catch (Exception e) {
            log.warn("[Resume Check] failed to load prompt config: {}, using defaults", e.getMessage());
            return getDefaultPromptConfig();
        }
    }

    private PromptConfig getDefaultPromptConfig() {
        String prompt = """
                你是一位专业的简历审核专家，服务对象是中文技术岗位求职者。你的任务是全面审核简历，找出所有存在的问题，并给出整体评分。

                审核维度：

                1. 完整性（completeness）
                - 检查必填字段是否缺失，例如：姓名、联系方式（手机/邮箱）、教育背景（学校、专业、学历、时间）、实习/工作经历、项目经历等。
                - 教育背景缺少 GPA 或排名不一定是问题，但如果已填写学历却没写专业，则属于缺失。
                - 实习/工作经历缺少公司名称、岗位、起止时间、核心职责描述，属于缺失。

                2. 一致性（consistency）
                - 检查时间线是否有冲突或重叠，例如实习时间与教育时间重叠、同一时间段出现两条实习经历。
                - 检查格式是否统一，例如日期格式混用（2024.09 和 2024年9月 同时出现）、中英文标点混用、大小写不一致。
                - 检查技术栈名称在不同模块中写法是否一致，例如一处写 SpringBoot 另一处写 Spring Boot。

                3. 内容质量（content_quality）
                - 检查描述是否存在无意义的占位文本，例如"待补充""XXX""TBD""Lorem ipsum"。
                - 检查描述是否过于简短，例如项目经历只写了一句话、实习经历没有具体工作内容。
                - 检查描述是否空洞无物，例如"负责日常开发工作""参与项目开发"这类没有具体技术或成果的表述。
                - 检查是否存在明显夸张或常识性错误，例如实习生声称主导公司核心架构设计。

                评分规则：
                - 结合以上三个维度给出 0-100 的总体评分。
                - 完整性和内容质量权重最高，一致性次之。
                - 评分应客观，不要因为缺乏获奖、证书、自我评价等非核心内容而明显拉低分数。

                输出要求（严格遵守）：
                - 只返回 JSON。
                - JSON 结构必须是：
                {
                  "score": <0-100 整数>,
                  "issues": [
                    {
                      "category": "completeness|consistency|content_quality",
                      "severity": "high|medium|low",
                      "field": "受影响的简历模块或字段名称，例如 basic_info.phone、education.0.major、project.1.description",
                      "message": "具体的问题描述",
                      "suggestion": "具体的修改建议"
                    }
                  ]
                }
                - issues 数组可以为空（表示没有发现问题）。
                - 每类问题最多报告 3 条，严重问题优先。
                - 所有文本必须使用简体中文。

                待审核的简历内容：
                {{resumeContent}}
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

        log.info("[Resume Check][AI] request: url={}, model={}", url, analysisModel);

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
                throw new ResumeCheckException("AI 服务响应为空");
            }

            return extractAssistantContent(response);
        } catch (ResumeCheckException e) {
            throw e;
        } catch (Exception e) {
            log.error("[Resume Check] AI chat invocation failed", e);
            throw new ResumeCheckException("AI 服务调用失败: " + e.getMessage(), e);
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
            log.error("[Resume Check] failed to extract content from AI response", e);
            throw new ResumeCheckException("AI 响应格式解析失败", e);
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

    private ResumeCheckResult emptyResult() {
        return ResumeCheckResult.builder()
                .score(0)
                .issues(List.of())
                .detailed(false)
                .build();
    }

    private record PromptConfig(String systemPrompt, String parsePrompt) {
    }

    public static class ResumeCheckException extends RuntimeException {
        public ResumeCheckException(String message) {
            super(message);
        }

        public ResumeCheckException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
