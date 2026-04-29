package com.itwanger.pairesume.controller;

import com.itwanger.pairesume.common.BusinessException;
import com.itwanger.pairesume.common.Result;
import com.itwanger.pairesume.common.ResultCode;
import com.itwanger.pairesume.dto.*;
import com.itwanger.pairesume.service.MockInterviewRateLimiter;
import com.itwanger.pairesume.service.MockInterviewService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.itwanger.pairesume.util.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Tag(name = "模拟面试接口")
@Slf4j
@RestController
@RequestMapping("/interview")
@RequiredArgsConstructor
public class MockInterviewController {

    private final MockInterviewService interviewService;
    private final MockInterviewRateLimiter rateLimiter;
    private final ObjectMapper objectMapper;

    @Operation(summary = "获取模拟面试配额")
    @GetMapping("/quota")
    public Result<Map<String, Object>> getQuota() {
        Long userId = SecurityUtils.getCurrentUserId();
        int remaining = rateLimiter.getRemainingInterviews(userId);
        return Result.success(Map.of("remaining", remaining));
    }

    @Operation(summary = "开始模拟面试")
    @PostMapping("/start")
    public Result<InterviewSessionDTO> startInterview(@RequestBody StartInterviewRequestDTO request) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        if (request.getResumeId() == null) {
            throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "请选择简历");
        }
        if (request.getMode() == null || request.getMode().isBlank()) {
            throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "请选择面试模式");
        }
        return Result.success(interviewService.startInterview(userId, request));
    }

    @Operation(summary = "面试对话（SSE 流式）")
    @PostMapping(value = "/{sessionId}/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public void chat(
            @PathVariable Long sessionId,
            @RequestBody Map<String, String> body,
            HttpServletResponse response
    ) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        String content = body.get("content");
        if (content == null || content.isBlank()) {
            throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "消息内容不能为空");
        }

        response.setCharacterEncoding("UTF-8");
        response.setContentType(MediaType.TEXT_EVENT_STREAM_VALUE);
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("X-Accel-Buffering", "no");

        try {
            sendSseEvent(response, "connected", Map.of("sessionId", sessionId));
            boolean autoEnded = interviewService.chat(sessionId, userId, content, event -> {
                String type = String.valueOf(event.getOrDefault("type", "message"));
                sendSseEvent(response, type, event);
            });
            sendSseEvent(response, "done", Map.of("status", "completed", "autoEnded", autoEnded));
        } catch (BusinessException e) {
            log.warn("Interview chat failed: sessionId={}, code={}, message={}", sessionId, e.getCode(), e.getMessage());
            sendSseEvent(response, "error", Map.of("code", e.getCode(), "message", e.getMessage()));
        } catch (Exception e) {
            log.error("Interview chat crashed: sessionId={}", sessionId, e);
            sendSseEvent(response, "error", Map.of("code", ResultCode.INTERNAL_ERROR.getCode(), "message", "面试对话失败，请重试"));
        }
    }

    @Operation(summary = "结束面试并获取评分")
    @PostMapping("/{sessionId}/end")
    public Result<EvaluationResultDTO> endInterview(@PathVariable Long sessionId) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return Result.success(interviewService.endInterview(sessionId, userId));
    }

    @Operation(summary = "获取面试历史列表")
    @GetMapping("/history")
    public Result<List<InterviewHistoryItemDTO>> getHistory() {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return Result.success(interviewService.getHistory(userId));
    }

    @Operation(summary = "获取面试详情")
    @GetMapping("/{sessionId}")
    public Result<InterviewSessionDTO> getDetail(@PathVariable Long sessionId) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return Result.success(interviewService.getDetail(sessionId, userId));
    }

    private void sendSseEvent(HttpServletResponse response, String eventName, Map<String, Object> payload) {
        try {
            response.getWriter().write("event:" + eventName + "\n");
            response.getWriter().write("data:" + objectMapper.writeValueAsString(payload) + "\n\n");
            response.getWriter().flush();
        } catch (IOException ignored) {
        }
    }
}
