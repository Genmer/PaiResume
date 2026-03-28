package com.itwanger.pairesume.service.impl;

import com.itwanger.pairesume.common.BusinessException;
import com.itwanger.pairesume.common.ResultCode;
import com.itwanger.pairesume.service.AiService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Slf4j
@Service
public class AiServiceImpl implements AiService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    @Value("${deepseek.api-key}")
    private String apiKey;

    @Value("${deepseek.base-url}")
    private String baseUrl;

    @Value("${deepseek.model}")
    private String model;

    @Value("${deepseek.timeout}")
    private int timeout;

    private static final String SYSTEM_PROMPT = """
            你是一位顶级的技术招聘官和简历优化专家，尤其擅长指导计算机领域的应届生和实习生。你的任务是优化下方提供的简历模块 JSON 内容，使其在求职（开发、测试、运维等岗位）时更具竞争力。

            **核心优化原则:**
            *   **使用STAR法则**: 确保描述清晰地反映出项目/实习的背景（Situation）、你的任务（Task）、你采取的具体行动（Action）以及最终达成的可量化成果（Result）。
            *   **强化技术动词**: 使用如"实现"、"开发"、"重构"、"部署"、"自动化"、"优化"等具体的、有力的技术动词，避免使用"负责"、"参与"等模糊词汇。
            *   **量化成果**: 尽可能将工作成果量化，例如："将接口响应时间从500ms优化至100ms"、"通过自动化脚本将部署时间缩短了10分钟"、"将测试覆盖率从70%提升至90%"。
            *   **突出技术栈**: 在描述中自然地融入项目或经历中使用的关键技术、工具或框架。

            **重要规则:**
            1.  你必须保持与输入完全相同的 JSON 结构。不要添加、删除或重命名任何键。输出结果必须是能被直接解析的、格式正确的 JSON。
            2.  你的回答必须且仅包含优化后的纯净 JSON 内容。不要包含任何额外的文字、解释、问候，也不要使用 ```json ... ``` 这种 Markdown 格式。

            待优化的 JSON 内容如下:
            ---
            %s
            ---
            """;

    public AiServiceImpl(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.webClient = WebClient.builder().build();
    }

    @Override
    public Map<String, Object> optimizeModule(String moduleType, Map<String, Object> content) {
        validateContentLength(content);

        var contentJson = toJsonString(content);
        var prompt = String.format(SYSTEM_PROMPT, contentJson);

        try {
            var response = webClient.post()
                    .uri(baseUrl + "/chat/completions")
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .bodyValue(buildRequestBody(prompt))
                    .retrieve()
                    .bodyToMono(String.class)
                    .block(java.time.Duration.ofSeconds(timeout));

            if (response == null) {
                throw new BusinessException(ResultCode.AI_SERVICE_BUSY);
            }

            var optimizedContent = parseAiResponse(response);
            return Map.of("original", content, "optimized", optimizedContent);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("AI optimization failed", e);
            throw new BusinessException(ResultCode.AI_SERVICE_BUSY);
        }
    }

    private void validateContentLength(Map<String, Object> content) {
        var json = toJsonString(content);
        if (json.length() > 5000) {
            throw new BusinessException(ResultCode.AI_INPUT_TOO_LONG);
        }
    }

    private String toJsonString(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            throw new RuntimeException("JSON serialization failed", e);
        }
    }

    private Map<String, Object> buildRequestBody(String prompt) {
        return Map.of(
                "model", model,
                "messages", new Object[]{
                        Map.of("role", "system", "content", prompt),
                        Map.of("role", "user", "content", "请优化这份简历内容")
                },
                "temperature", 0.7,
                "max_tokens", 4000
        );
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseAiResponse(String response) {
        try {
            var root = objectMapper.readTree(response);
            var content = root.path("choices").path(0).path("message").path("content").asText();

            // 清理可能的 markdown 代码块包裹
            content = content.trim();
            if (content.startsWith("```json")) {
                content = content.substring(7);
            }
            if (content.startsWith("```")) {
                content = content.substring(3);
            }
            if (content.endsWith("```")) {
                content = content.substring(0, content.length() - 3);
            }
            content = content.trim();

            return objectMapper.readValue(content, Map.class);
        } catch (Exception e) {
            log.error("Failed to parse AI response: {}", e.getMessage());
            throw new BusinessException(ResultCode.AI_SERVICE_BUSY);
        }
    }
}
