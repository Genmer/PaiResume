package com.itwanger.pairesume.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.itwanger.pairesume.dto.JdMatchResult;
import com.itwanger.pairesume.service.JdMatchService;
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
public class JdMatchServiceImpl implements JdMatchService {

    @Value("${ai.api-key}")
    private String apiKey;

    @Value("${ai.base-url}")
    private String baseUrl;

    @Value("${ai.analysis-model:${ai.model}}")
    private String analysisModel;

    @Value("${ai.timeout:300}")
    private int timeout;

    @Value("${app.prompts.jd-match.config-file:config/jd-match-prompts.yml}")
    private String promptConfigFile;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public JdMatchServiceImpl(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.webClient = WebClient.builder().build();
    }

    @Override
    public JdMatchResult matchResume(String jdText, String resumeContent) {
        if (jdText == null || jdText.isBlank() || resumeContent == null || resumeContent.isBlank()) {
            return emptyResult();
        }

        log.info("[JD Match] received request, jd length: {}, resume length: {}", jdText.length(), resumeContent.length());

        String systemPrompt = loadSystemPrompt();
        String userPrompt = buildUserPrompt(jdText, resumeContent);

        String aiResponse = invokeAiChat(systemPrompt, userPrompt);
        log.debug("[JD Match] AI response: {} chars", aiResponse.length());

        String cleanedJson = cleanJsonPayload(aiResponse);

        try {
            JdMatchResult result = objectMapper.readValue(cleanedJson, JdMatchResult.class);
            normalize(result);
            log.info("[JD Match] complete. Score: {}, Matched: {}, Missing: {}, Suggestions: {}",
                    result.getMatchScore(),
                    result.getMatchedSkills().size(),
                    result.getMissingSkills().size(),
                    result.getSuggestions().size());
            return result;
        } catch (Exception e) {
            log.error("[JD Match] failed to parse AI response", e);
            throw new JdMatchException("JD 匹配分析失败: AI 返回结果无法解析", e);
        }
    }

    private void normalize(JdMatchResult result) {
        if (result.getMatchScore() == null) {
            result.setMatchScore(0);
        }
        result.setMatchScore(Math.max(0, Math.min(100, result.getMatchScore())));
        if (result.getSummary() == null) {
            result.setSummary("");
        }
        if (result.getMatchedSkills() == null) {
            result.setMatchedSkills(List.of());
        }
        if (result.getMissingSkills() == null) {
            result.setMissingSkills(List.of());
        }
        if (result.getSuggestions() == null) {
            result.setSuggestions(List.of());
        }
        result.setDetailed(true);
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
            log.warn("[JD Match] prompt config not found or incomplete: {}, using defaults", promptConfigFile);
        } catch (Exception e) {
            log.warn("[JD Match] failed to load prompt config: {}, using defaults", e.getMessage());
        }
        return DEFAULT_SYSTEM_PROMPT;
    }

    private String buildUserPrompt(String jdText, String resumeContent) {
        return """
                ## 目标岗位 JD
                %s

                ## 候选人简历
                %s
                """.formatted(jdText, resumeContent);
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

        log.info("[JD Match][AI] request: url={}, model={}", url, analysisModel);

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
                throw new JdMatchException("AI 服务响应为空");
            }

            return extractAssistantContent(response);
        } catch (JdMatchException e) {
            throw e;
        } catch (Exception e) {
            log.error("[JD Match] AI chat invocation failed", e);
            throw new JdMatchException("AI 服务调用失败: " + e.getMessage(), e);
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
            log.error("[JD Match] failed to extract content from AI response", e);
            throw new JdMatchException("AI 响应格式解析失败", e);
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

    private JdMatchResult emptyResult() {
        return JdMatchResult.builder()
                .matchScore(0)
                .summary("")
                .matchedSkills(List.of())
                .missingSkills(List.of())
                .suggestions(List.of())
                .detailed(false)
                .build();
    }

    private static final String DEFAULT_SYSTEM_PROMPT = """
            你是一位资深的技术招聘顾问，擅长评估候选人简历与目标岗位 JD 的匹配程度。

            用户会提供一份岗位 JD 和一份候选人简历，你需要：
            1. 综合技能覆盖、经历相关性、岗位职责匹配度给出 0-100 的匹配分。
            2. 用一两句话概括匹配情况（summary）。
            3. 列出简历中已体现的、JD 要求的技能（matchedSkills）。
            4. 列出 JD 要求但简历中缺失或体现不足的技能（missingSkills）。
            5. 针对差距给出具体可执行的修改建议（suggestions），每条建议注明针对的简历模块。

            评估要求：
            - 基于简历真实内容判断，同义技术要合并识别（如 Vue.js 与 Vue、K8s 与 Kubernetes）。
            - 匹配分说明：85-100 高度匹配可直接投递；70-84 匹配较好但有差距；50-69 有明显差距需针对性补充；50 以下匹配度低。
            - suggestions 最多 5 条，优先覆盖 missingSkills 中最关键的差距，建议必须具体可执行，避免空话。
            - module 取值范围：basic_info/education/internship/work_experience/project/skill/paper/research/award/job_intention。

            你必须严格只输出 JSON，不要输出任何解释或 Markdown 代码块，结构如下：
            {
              "matchScore": 0,
              "summary": "匹配情况概括",
              "matchedSkills": ["技能1"],
              "missingSkills": ["技能2"],
              "suggestions": [
                {"module": "skill", "advice": "具体建议"}
              ]
            }
            """;

    public static class JdMatchException extends RuntimeException {
        public JdMatchException(String message) {
            super(message);
        }

        public JdMatchException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
