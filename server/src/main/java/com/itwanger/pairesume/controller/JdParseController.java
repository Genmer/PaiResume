package com.itwanger.pairesume.controller;

import com.itwanger.pairesume.common.Result;
import com.itwanger.pairesume.dto.JdParseResult;
import com.itwanger.pairesume.service.JdParseService;
import com.itwanger.pairesume.service.impl.JdParseServiceImpl.JdParseException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@Tag(name = "JD 解析接口")
@RestController
@RequestMapping("/resumes")
@RequiredArgsConstructor
public class JdParseController {

    private final JdParseService jdParseService;

    @Operation(
            summary = "解析 JD 文本",
            description = "将 JD（职位描述）文本发送给 AI，提取结构化信息：岗位名称、公司名称、硬性技能要求、加分技能、职责描述"
    )
    @PostMapping("/{id}/jd-parse")
    public Result<JdParseResult> parseJd(
            @Parameter(description = "简历 ID", required = true)
            @PathVariable Long id,
            @Parameter(description = "JD 文本", required = true)
            @RequestBody Map<String, String> body
    ) {
        String jdText = body != null ? body.get("jdText") : null;
        if (jdText == null || jdText.isBlank()) {
            return Result.error(400, "请提供 JD 文本内容");
        }

        log.info("[JD Parse][Controller] received request, resumeId: {}, text length: {}", id, jdText.length());

        try {
            JdParseResult result = jdParseService.parseJd(jdText);
            return Result.success(result);
        } catch (JdParseException e) {
            log.warn("[JD Parse][Controller] parse failed: {}", e.getMessage());
            return Result.error(400, e.getMessage());
        } catch (Exception e) {
            log.error("[JD Parse][Controller] unexpected error", e);
            return Result.error(500, "JD 解析失败: " + e.getMessage());
        }
    }
}
