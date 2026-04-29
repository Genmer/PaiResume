package com.itwanger.pairesume.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.itwanger.pairesume.common.BusinessException;
import com.itwanger.pairesume.common.ResultCode;
import com.itwanger.pairesume.dto.*;
import com.itwanger.pairesume.entity.MockInterviewMessage;
import com.itwanger.pairesume.entity.MockInterviewSession;
import com.itwanger.pairesume.entity.ResumeModule;
import com.itwanger.pairesume.mapper.MockInterviewMessageMapper;
import com.itwanger.pairesume.mapper.MockInterviewSessionMapper;
import com.itwanger.pairesume.mapper.ResumeMapper;
import com.itwanger.pairesume.mapper.ResumeModuleMapper;
import com.itwanger.pairesume.mapper.UserMapper;
import com.itwanger.pairesume.service.MockInterviewRateLimiter;
import com.itwanger.pairesume.service.MockInterviewService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.yaml.snakeyaml.Yaml;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Consumer;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MockInterviewServiceImpl implements MockInterviewService {

    private final MockInterviewSessionMapper sessionMapper;
    private final MockInterviewMessageMapper messageMapper;
    private final ResumeMapper resumeMapper;
    private final ResumeModuleMapper moduleMapper;
    private final UserMapper userMapper;
    private final MockInterviewRateLimiter rateLimiter;
    private final ObjectMapper objectMapper;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Value("${ai.api-key}")
    private String apiKey;

    @Value("${ai.base-url}")
    private String baseUrl;

    @Value("${ai.model}")
    private String model;

    @Value("${ai.interview-model:${ai.model}}")
    private String interviewModel;

    @Value("${ai.timeout:120}")
    private int timeout;

    private static final Set<Integer> VALID_ROUNDS = Set.of(1, 3, 8);
    private static final int DEFAULT_ROUNDS = 8;
    private static final String DEFAULT_PROMPT_CONFIG_PATH = "config/mock-interview-prompts.yml";

    @Override
    public InterviewSessionDTO startInterview(Long userId, StartInterviewRequestDTO request) {
        int remaining = rateLimiter.getRemainingInterviews(userId);
        if (remaining <= 0) {
            throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "本月模拟面试次数已用完，请升级会员或下月再试");
        }

        var activeSession = sessionMapper.selectOne(
                new LambdaQueryWrapper<MockInterviewSession>()
                        .eq(MockInterviewSession::getUserId, userId)
                        .eq(MockInterviewSession::getInterviewStatus, "IN_PROGRESS")
                        .last("LIMIT 1")
        );
        if (activeSession != null) {
            throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "你有一场正在进行的面试，请先完成或结束");
        }

        var resume = resumeMapper.selectById(request.getResumeId());
        if (resume == null || !resume.getUserId().equals(userId)) {
            throw new BusinessException(ResultCode.RESUME_NOT_FOUND);
        }

        var modules = moduleMapper.selectList(
                new LambdaQueryWrapper<ResumeModule>()
                        .eq(ResumeModule::getResumeId, request.getResumeId())
                        .orderByAsc(ResumeModule::getSortOrder)
        );

        String resumeSnapshot;
        try {
            resumeSnapshot = objectMapper.writeValueAsString(modules.stream()
                    .map(m -> Map.of(
                            "moduleType", m.getModuleType(),
                            "content", m.getContent()
                    ))
                    .toList());
        } catch (Exception e) {
            throw new BusinessException(ResultCode.INTERNAL_ERROR.getCode(), "简历快照序列化失败");
        }

        var session = new MockInterviewSession();
        session.setUserId(userId);
        session.setResumeId(request.getResumeId());
        session.setResumeSnapshot(resumeSnapshot);
        session.setInterviewMode(request.getMode());
        session.setTargetPosition(request.getTargetPosition());
        session.setTargetYears(request.getTargetYears());
        session.setMaxRounds(VALID_ROUNDS.contains(request.getMaxRounds()) ? request.getMaxRounds() : DEFAULT_ROUNDS);
        session.setInterviewStatus("IN_PROGRESS");
        sessionMapper.insert(session);

        rateLimiter.incrementInterviewCount(userId);

        String systemPrompt = buildSystemPrompt(request.getMode(), resumeSnapshot, request.getTargetPosition(), request.getTargetYears());

        var systemMsg = new MockInterviewMessage();
        systemMsg.setSessionId(session.getId());
        systemMsg.setRole("SYSTEM");
        systemMsg.setContent(systemPrompt);
        messageMapper.insert(systemMsg);

        return toSessionDTO(session, resume.getTitle());
    }

    @Override
    public boolean chat(Long sessionId, Long userId, String userMessage, Consumer<Map<String, Object>> eventConsumer) {
        var session = sessionMapper.selectById(sessionId);
        if (session == null || !session.getUserId().equals(userId)) {
            throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "面试会话不存在");
        }
        if (!"IN_PROGRESS".equals(session.getInterviewStatus())) {
            throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "面试已结束");
        }

        boolean isStartTrigger = "__START__".equals(userMessage);

        if (!isStartTrigger) {
            var userMsg = new MockInterviewMessage();
            userMsg.setSessionId(sessionId);
            userMsg.setRole("USER");
            userMsg.setContent(userMessage);
            messageMapper.insert(userMsg);
        }

        var allMessages = messageMapper.selectList(
                new LambdaQueryWrapper<MockInterviewMessage>()
                        .eq(MockInterviewMessage::getSessionId, sessionId)
                        .orderByAsc(MockInterviewMessage::getCreatedAt)
        );

        List<Map<String, String>> chatMessages = new ArrayList<>();
        for (var msg : allMessages) {
            if ("SYSTEM".equals(msg.getRole())) {
                chatMessages.add(Map.of("role", "system", "content", msg.getContent()));
            } else if ("USER".equals(msg.getRole())) {
                chatMessages.add(Map.of("role", "user", "content", msg.getContent()));
            } else if ("ASSISTANT".equals(msg.getRole())) {
                chatMessages.add(Map.of("role", "assistant", "content", msg.getContent()));
            }
        }

        if (isStartTrigger) {
            int rounds = session.getMaxRounds() != null ? session.getMaxRounds() : DEFAULT_ROUNDS;
            String startPrompt = rounds <= 3
                    ? "请直接提出第一个面试问题，不要做自我介绍。"
                    : "请开始面试，先做简单自我介绍，然后提出第一个问题。";
            chatMessages.add(Map.of("role", "user", "content", startPrompt));
        }

        // On the last round, tell AI not to ask follow-up questions
        if (!isStartTrigger) {
            long currentUserMsgCount = allMessages.stream()
                    .filter(m -> "USER".equals(m.getRole()))
                    .count();
            int effectiveMaxRounds = session.getMaxRounds() != null ? session.getMaxRounds() : DEFAULT_ROUNDS;
            if (currentUserMsgCount >= effectiveMaxRounds) {
                chatMessages.add(Map.of("role", "user", "content",
                        "这是本次面试的最后一轮。请对候选人的回答做简要总结和点评，不要追问新的问题。告知候选人面试已结束，感谢参与。"));
            }
        }

        String aiResponse;
        try {
            aiResponse = streamMultiTurnChat(chatMessages, eventConsumer);
        } catch (Exception e) {
            log.error("Interview chat AI call failed: sessionId={}", sessionId, e);
            throw new BusinessException(ResultCode.AI_SERVICE_BUSY.getCode(), "AI 面试官回复失败，请重试");
        }

        var assistantMsg = new MockInterviewMessage();
        assistantMsg.setSessionId(sessionId);
        assistantMsg.setRole("ASSISTANT");
        assistantMsg.setContent(aiResponse);
        messageMapper.insert(assistantMsg);

        // allMessages queried AFTER user message insert, so it already includes current message
        long userMsgCount = allMessages.stream()
                .filter(m -> "USER".equals(m.getRole()))
                .count();

        int effectiveMaxRounds = session.getMaxRounds() != null ? session.getMaxRounds() : DEFAULT_ROUNDS;
        if (userMsgCount >= effectiveMaxRounds) {
                return true;
        }
        return false;
    }

    @Override
    public EvaluationResultDTO endInterview(Long sessionId, Long userId) {
        var session = sessionMapper.selectById(sessionId);
        if (session == null || !session.getUserId().equals(userId)) {
            throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "面试会话不存在");
        }

        if ("COMPLETED".equals(session.getInterviewStatus())) {
            var result = new EvaluationResultDTO();
            if (session.getTotalScore() != null) result.setTotalScore(session.getTotalScore().doubleValue());
            if (session.getScoreTechnical() != null) result.setScoreTechnical(session.getScoreTechnical().doubleValue());
            if (session.getScoreExpression() != null) result.setScoreExpression(session.getScoreExpression().doubleValue());
            if (session.getScoreProject() != null) result.setScoreProject(session.getScoreProject().doubleValue());
            result.setSummary(session.getEvaluationSummary());
            return result;
        }

        var allMessages = messageMapper.selectList(
                new LambdaQueryWrapper<MockInterviewMessage>()
                        .eq(MockInterviewMessage::getSessionId, sessionId)
                        .orderByAsc(MockInterviewMessage::getCreatedAt)
        );

        String conversationHistory = allMessages.stream()
                .filter(m -> "USER".equals(m.getRole()) || "ASSISTANT".equals(m.getRole()))
                .map(m -> ("USER".equals(m.getRole()) ? "候选人" : "面试官") + "：" + m.getContent())
                .collect(Collectors.joining("\n\n"));

        var promptConfig = loadPromptConfig();
        String evaluationPrompt = renderTemplate(promptConfig.getOrDefault("evaluationPrompt", ""),
                Map.of("conversationHistory", conversationHistory));

        var chatMessages = List.of(
                Map.of("role", "system", "content", "你是一位专业的技术面试评估专家，请严格按照要求输出 JSON 格式的评估结果。"),
                Map.of("role", "user", "content", evaluationPrompt)
        );

        String evaluationResponse;
        try {
            evaluationResponse = callChatCompletion(chatMessages);
        } catch (Exception e) {
            log.error("Interview evaluation AI call failed: sessionId={}", sessionId, e);
            throw new BusinessException(ResultCode.AI_SERVICE_BUSY.getCode(), "评分报告生成失败，请重试");
        }

        EvaluationResultDTO result;
        try {
            result = parseEvaluationResult(evaluationResponse);
        } catch (Exception e) {
            log.error("Failed to parse evaluation result: {}", evaluationResponse, e);
            throw new BusinessException(ResultCode.AI_RESPONSE_INVALID.getCode(), "评分报告解析失败");
        }

        session.setTotalScore(BigDecimal.valueOf(result.getTotalScore()));
        session.setScoreTechnical(BigDecimal.valueOf(result.getScoreTechnical()));
        session.setScoreExpression(BigDecimal.valueOf(result.getScoreExpression()));
        session.setScoreProject(BigDecimal.valueOf(result.getScoreProject()));
        session.setEvaluationSummary(result.getSummary());
        session.setInterviewStatus("COMPLETED");
        session.setCompletedAt(LocalDateTime.now());
        sessionMapper.updateById(session);

        return result;
    }

    @Override
    public List<InterviewHistoryItemDTO> getHistory(Long userId) {
        var sessions = sessionMapper.selectList(
                new LambdaQueryWrapper<MockInterviewSession>()
                        .eq(MockInterviewSession::getUserId, userId)
                        .orderByDesc(MockInterviewSession::getCreatedAt)
        );

        return sessions.stream().map(session -> {
            var dto = new InterviewHistoryItemDTO();
            dto.setId(session.getId());
            var resume = resumeMapper.selectById(session.getResumeId());
            dto.setResumeTitle(resume != null ? resume.getTitle() : "已删除的简历");
            dto.setInterviewMode(session.getInterviewMode());
            dto.setTotalScore(session.getTotalScore());
            dto.setCreatedAt(session.getCreatedAt());
            dto.setCompletedAt(session.getCompletedAt());
            return dto;
        }).toList();
    }

    @Override
    public InterviewSessionDTO getDetail(Long sessionId, Long userId) {
        var session = sessionMapper.selectById(sessionId);
        if (session == null || !session.getUserId().equals(userId)) {
            throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "面试会话不存在");
        }
        var resume = resumeMapper.selectById(session.getResumeId());
        return toSessionDTO(session, resume != null ? resume.getTitle() : "已删除的简历");
    }

    private InterviewSessionDTO toSessionDTO(MockInterviewSession session, String resumeTitle) {
        var dto = new InterviewSessionDTO();
        dto.setId(session.getId());
        dto.setResumeId(session.getResumeId());
        dto.setResumeTitle(resumeTitle);
        dto.setInterviewMode(session.getInterviewMode());
        dto.setTargetPosition(session.getTargetPosition());
        dto.setTargetYears(session.getTargetYears());
        dto.setStatus(session.getInterviewStatus());
        dto.setTotalScore(session.getTotalScore());
        dto.setScoreTechnical(session.getScoreTechnical());
        dto.setScoreExpression(session.getScoreExpression());
        dto.setScoreProject(session.getScoreProject());
        dto.setEvaluationSummary(session.getEvaluationSummary());
        dto.setMaxRounds(session.getMaxRounds());
        dto.setCreatedAt(session.getCreatedAt());
        dto.setCompletedAt(session.getCompletedAt());

        var messages = messageMapper.selectList(
                new LambdaQueryWrapper<MockInterviewMessage>()
                        .eq(MockInterviewMessage::getSessionId, session.getId())
                        .orderByAsc(MockInterviewMessage::getCreatedAt)
        );

        dto.setMessages(messages.stream().map(msg -> {
            var msgDto = new InterviewMessageDTO();
            msgDto.setRole(msg.getRole());
            msgDto.setContent(msg.getContent());
            return msgDto;
        }).toList());

        return dto;
    }

    private String buildSystemPrompt(String mode, String resumeSnapshot, String targetPosition, String targetYears) {
        var promptConfig = loadPromptConfig();
        String systemPrompt = promptConfig.getOrDefault("systemPrompt", "");
        String resumeSummary = extractResumeSummary(resumeSnapshot);

        String modePrompt;
        if ("DEEP_DIVE_PROJECT".equals(mode)) {
            String projectList = extractProjectList(resumeSnapshot);
            modePrompt = renderTemplate(promptConfig.getOrDefault("deepDiveProjectPrompt", ""),
                    Map.of("resumeSummary", resumeSummary, "projectList", projectList));
        } else {
            modePrompt = renderTemplate(promptConfig.getOrDefault("targetPositionPrompt", ""),
                    Map.of(
                            "resumeSummary", resumeSummary,
                            "targetPosition", targetPosition != null ? targetPosition : "",
                            "targetYears", targetYears != null ? targetYears : ""
                    ));
        }

        return systemPrompt + "\n\n" + modePrompt;
    }

    @SuppressWarnings("unchecked")
    private String extractResumeSummary(String resumeSnapshot) {
        try {
            List<Map<String, Object>> modules = (List<Map<String, Object>>) objectMapper.readValue(resumeSnapshot, java.util.List.class);
            var sb = new StringBuilder();
            for (var m : modules) {
                var type = String.valueOf(m.get("moduleType"));
                var content = (Map<String, Object>) m.get("content");
                if (content != null) {
                    switch (type) {
                        case "basic_info" -> {
                            sb.append("姓名：").append(getString(content, "name")).append("\n");
                            if (content.get("jobIntention") != null) sb.append("求职意向：").append(content.get("jobIntention")).append("\n");
                        }
                        case "education" -> sb.append("教育：").append(getString(content, "school")).append(" ")
                                .append(getString(content, "major")).append(" ")
                                .append(getString(content, "degree")).append("\n");
                        case "internship" -> sb.append("实习：").append(getString(content, "company")).append(" - ")
                                .append(getString(content, "position")).append("\n");
                        case "project" -> sb.append("项目：").append(getString(content, "name")).append(" - ")
                                .append(getString(content, "description")).append("\n");
                        default -> {}
                    }
                }
            }
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    @SuppressWarnings("unchecked")
    private String extractProjectList(String resumeSnapshot) {
        try {
            List<Map<String, Object>> modules = (List<Map<String, Object>>) objectMapper.readValue(resumeSnapshot, java.util.List.class);
            var sb = new StringBuilder();
            for (var m : modules) {
                if ("project".equals(m.get("moduleType"))) {
                    var c = (Map<String, Object>) m.get("content");
                    if (c != null) {
                        sb.append("- ").append(getString(c, "name")).append("：")
                                .append(getString(c, "description")).append("\n");
                    }
                }
            }
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    private String getString(Map<String, Object> map, String key) {
        var v = map.get(key);
        return v == null ? "" : String.valueOf(v);
    }

    private Map<String, String> loadPromptConfig() {
        var candidates = List.of(
                Path.of(DEFAULT_PROMPT_CONFIG_PATH),
                Path.of("../" + DEFAULT_PROMPT_CONFIG_PATH)
        );
        for (var candidate : candidates) {
            try {
                var normalized = candidate.toAbsolutePath().normalize();
                if (Files.exists(normalized) && Files.isRegularFile(normalized)) {
                    var yamlText = Files.readString(normalized, StandardCharsets.UTF_8);
                    if (!yamlText.isBlank()) {
                        var yaml = new Yaml();
                        var parsed = yaml.load(yamlText);
                        if (parsed instanceof Map<?, ?> rawMap) {
                            var result = new LinkedHashMap<String, String>();
                            for (var entry : rawMap.entrySet()) {
                                result.put(String.valueOf(entry.getKey()),
                                        entry.getValue() == null ? "" : String.valueOf(entry.getValue()));
                            }
                            return result;
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to load interview prompt config from {}", candidate, e);
            }
        }
        return Map.of();
    }

    private String renderTemplate(String template, Map<String, String> variables) {
        if (template == null) return "";
        var rendered = template;
        for (var entry : variables.entrySet()) {
            rendered = rendered.replace("{{" + entry.getKey() + "}}",
                    Objects.toString(entry.getValue(), ""));
        }
        return rendered;
    }

    private String streamMultiTurnChat(List<Map<String, String>> messages, Consumer<Map<String, Object>> eventConsumer) throws Exception {
        var requestBody = new LinkedHashMap<String, Object>();
        requestBody.put("model", interviewModel);
        requestBody.put("messages", messages.toArray(new Map[0]));
        requestBody.put("temperature", 0.7);
        requestBody.put("max_tokens", 4096);
        requestBody.put("stream", true);

        var requestJson = objectMapper.writeValueAsString(requestBody);
        var url = baseUrl.endsWith("/chat/completions") ? baseUrl : baseUrl + "/chat/completions";

        var request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(Math.max(timeout, 180)))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .header("Accept", "text/event-stream")
                .POST(HttpRequest.BodyPublishers.ofString(requestJson, StandardCharsets.UTF_8))
                .build();

        var response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
        if (response.statusCode() >= 400) {
            var body = new String(response.body().readAllBytes(), StandardCharsets.UTF_8);
            throw new BusinessException(ResultCode.AI_SERVICE_BUSY.getCode(),
                    "AI 服务异常（" + response.statusCode() + "）");
        }

        var contentBuilder = new StringBuilder();
        var dataBuilder = new StringBuilder();
        int chunkCount = 0;

        try (var reader = new BufferedReader(new InputStreamReader(response.body(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) {
                    var data = dataBuilder.toString().trim();
                    if (!data.isEmpty()) {
                        chunkCount++;
                        if (chunkCount <= 3) {
                            log.info("[Interview SSE] chunk #{}: {}", chunkCount, data.substring(0, Math.min(data.length(), 200)));
                        }
                        processSseData(data, contentBuilder, eventConsumer);
                    }
                    dataBuilder.setLength(0);
                    continue;
                }
                if (line.startsWith("data:")) {
                    if (dataBuilder.length() > 0) dataBuilder.append('\n');
                    dataBuilder.append(line.substring(5).trim());
                }
            }
            var remaining = dataBuilder.toString().trim();
            if (!remaining.isEmpty()) {
                processSseData(remaining, contentBuilder, eventConsumer);
            }
        }

        return contentBuilder.toString();
    }

    @SuppressWarnings("unchecked")
    private void processSseData(String data, StringBuilder contentBuilder, Consumer<Map<String, Object>> eventConsumer) {
        if ("[DONE]".equals(data)) {
            log.info("[Interview SSE] received [DONE], total content length: {}", contentBuilder.length());
            return;
        }
        try {
            var node = objectMapper.readTree(data);
            var choices = node.get("choices");
            if (choices != null && choices.isArray() && !choices.isEmpty()) {
                var delta = choices.get(0).get("delta");
                if (delta != null) {
                    if (delta.has("reasoning_content")) {
                        var reasoning = delta.get("reasoning_content").asText();
                        if (!reasoning.isEmpty()) {
                            contentBuilder.append(reasoning);
                            if (eventConsumer != null) {
                                eventConsumer.accept(Map.of(
                                        "type", "content_delta",
                                        "content", reasoning
                                ));
                            }
                        }
                    }
                    if (delta.has("content")) {
                        var content = delta.get("content").asText();
                        log.info("[Interview SSE] content field: '{}', length={}", content, content.length());
                        if (!content.isEmpty()) {
                            contentBuilder.append(content);
                            if (eventConsumer != null) {
                                eventConsumer.accept(Map.of(
                                        "type", "content_delta",
                                        "content", content
                                ));
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse SSE data: {}", data, e);
        }
    }

    private String callChatCompletion(List<Map<String, String>> messages) throws Exception {
        var requestBody = new LinkedHashMap<String, Object>();
        requestBody.put("model", interviewModel);
        requestBody.put("messages", messages.toArray(new Map[0]));
        requestBody.put("temperature", 0.3);
        requestBody.put("max_tokens", 4096);
        requestBody.put("response_format", Map.of("type", "json_object"));

        var requestJson = objectMapper.writeValueAsString(requestBody);
        var url = baseUrl.endsWith("/chat/completions") ? baseUrl : baseUrl + "/chat/completions";

        var request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(Math.max(timeout, 120)))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestJson, StandardCharsets.UTF_8))
                .build();

        var response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            throw new BusinessException(ResultCode.AI_SERVICE_BUSY.getCode(),
                    "AI 服务异常（" + response.statusCode() + "）");
        }

        var root = objectMapper.readTree(response.body());
        var choices = root.get("choices");
        if (choices != null && choices.isArray() && !choices.isEmpty()) {
            var message = choices.get(0).get("message");
            if (message != null && message.has("content")) {
                return message.get("content").asText();
            }
        }
        throw new BusinessException(ResultCode.AI_RESPONSE_INVALID.getCode(), "AI 响应格式异常");
    }

    private EvaluationResultDTO parseEvaluationResult(String response) throws Exception {
        var cleanResponse = response.trim();
        if (cleanResponse.startsWith("```json")) {
            cleanResponse = cleanResponse.substring(7);
        }
        if (cleanResponse.startsWith("```")) {
            cleanResponse = cleanResponse.substring(3);
        }
        if (cleanResponse.endsWith("```")) {
            cleanResponse = cleanResponse.substring(0, cleanResponse.length() - 3);
        }
        cleanResponse = cleanResponse.trim();

        try {
            return objectMapper.readValue(cleanResponse, EvaluationResultDTO.class);
        } catch (Exception e) {
            var root = objectMapper.readTree(cleanResponse);
            var result = new EvaluationResultDTO();
            if (root.has("totalScore")) result.setTotalScore(root.get("totalScore").asDouble());
            if (root.has("scoreTechnical")) result.setScoreTechnical(root.get("scoreTechnical").asDouble());
            if (root.has("scoreExpression")) result.setScoreExpression(root.get("scoreExpression").asDouble());
            if (root.has("scoreProject")) result.setScoreProject(root.get("scoreProject").asDouble());
            if (root.has("summary")) result.setSummary(root.get("summary").asText());
            if (root.has("suggestions")) {
                var suggestions = new ArrayList<String>();
                for (var item : root.get("suggestions")) {
                    suggestions.add(item.asText());
                }
                result.setSuggestions(suggestions);
            }
            return result;
        }
    }
}
