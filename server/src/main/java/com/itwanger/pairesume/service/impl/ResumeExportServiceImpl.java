package com.itwanger.pairesume.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.itwanger.pairesume.common.BusinessException;
import com.itwanger.pairesume.common.ResultCode;
import com.itwanger.pairesume.dto.ResumeExportRequestDTO;
import com.itwanger.pairesume.entity.User;
import com.itwanger.pairesume.mapper.UserMapper;
import com.itwanger.pairesume.service.ResumeExportService;
import com.itwanger.pairesume.service.ResumeModuleService;
import com.itwanger.pairesume.service.ResumeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class ResumeExportServiceImpl implements ResumeExportService {
    private final ResumeService resumeService;
    private final ResumeModuleService resumeModuleService;
    private final UserMapper userMapper;
    private final ObjectMapper objectMapper;

    @Value("${app.project-root:}")
    private String configuredProjectRoot;

    @Override
    public ExportedResumeFile exportPdf(Long resumeId, Long userId, ResumeExportRequestDTO request) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ResultCode.USER_NOT_FOUND);
        }
        if (!"ACTIVE".equals(user.getMembershipStatus())) {
            throw new BusinessException(ResultCode.MEMBERSHIP_REQUIRED);
        }

        var modules = resumeModuleService.listByResumeId(resumeId, userId);
        log.info("[PDF Export] resumeId={}, modules={}, moduleTypes={}", resumeId, modules.size(),
                modules.stream().map(m -> m.getModuleType() + "(" + (m.getContent() != null && !m.getContent().isEmpty() ? m.getContent().keySet() : "empty") + ")").toList());

        Path tempFile = null;
        try {
            Path projectRoot = resolveProjectRoot();
            Path scriptPath = projectRoot.resolve("scripts/export-resume-pdf.ts");
            Path tsxPath = projectRoot.resolve("node_modules/.bin/tsx");

            if (!Files.exists(scriptPath) || !Files.exists(tsxPath)) {
                throw new BusinessException(ResultCode.EXPORT_FAILED.getCode(), "导出脚本未准备好");
            }

            tempFile = Files.createTempFile("pai-resume-export-", ".pdf");
            ProcessBuilder processBuilder = new ProcessBuilder(
                    tsxPath.toString(),
                    scriptPath.toString(),
                    "--output",
                    tempFile.toString()
            );
            processBuilder.directory(projectRoot.toFile());
            processBuilder.redirectErrorStream(true);

            Process process = processBuilder.start();
            try (OutputStream outputStream = process.getOutputStream()) {
                outputStream.write(buildPayload(modules, request).getBytes(StandardCharsets.UTF_8));
            }

            boolean finished = process.waitFor(2, TimeUnit.MINUTES);
            String processOutput = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            if (!finished) {
                process.destroyForcibly();
                throw new BusinessException(ResultCode.EXPORT_FAILED.getCode(), "导出超时");
            }
            if (process.exitValue() != 0) {
                log.error("Resume export worker failed: {}", processOutput);
                throw new BusinessException(ResultCode.EXPORT_FAILED);
            }

            byte[] content = Files.readAllBytes(tempFile);
            return new ExportedResumeFile(content, buildExportFileName(modules));
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to export resume {}", resumeId, e);
            throw new BusinessException(ResultCode.EXPORT_FAILED);
        } finally {
            if (tempFile != null) {
                try {
                    Files.deleteIfExists(tempFile);
                } catch (IOException e) {
                    log.warn("Failed to delete temp export file {}", tempFile, e);
                }
            }
        }
    }

    private String buildPayload(Object modules, ResumeExportRequestDTO request) throws IOException {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("modules", modules);

        Map<String, Object> options = new LinkedHashMap<>();
        options.put("pageMode", blankToNull(request == null ? null : request.getPageMode()));
        options.put("templateId", blankToNull(request == null ? null : request.getTemplateId()));
        options.put("density", blankToNull(request == null ? null : request.getDensity()));
        options.put("accentPreset", blankToNull(request == null ? null : request.getAccentPreset()));
        options.put("headingStyle", blankToNull(request == null ? null : request.getHeadingStyle()));
        payload.put("options", options);

        return objectMapper.writeValueAsString(payload);
    }

    private Path resolveProjectRoot() {
        if (configuredProjectRoot != null && !configuredProjectRoot.isBlank()) {
            return Paths.get(configuredProjectRoot).toAbsolutePath().normalize();
        }

        Path current = Paths.get(System.getProperty("user.dir")).toAbsolutePath().normalize();
        if (current.getFileName() != null && "server".equals(current.getFileName().toString())) {
            return current.getParent();
        }
        return current;
    }

    private String sanitizeFileName(String title) {
        if (title == null || title.isBlank()) {
            return "简历导出";
        }
        String sanitized = title.trim()
                .replaceAll("[\\\\/:*?\"<>|]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^[-\\s]+|[-\\s]+$", "");
        return sanitized.isBlank() ? "简历导出" : sanitized;
    }

    private String buildExportFileName(List<com.itwanger.pairesume.entity.ResumeModule> modules) {
        List<String> parts = new ArrayList<>();
        String name = "";
        String jobIntention = "";
        String workYears = "";

        for (com.itwanger.pairesume.entity.ResumeModule module : modules) {
            if (module.getContent() == null) {
                continue;
            }

            if ("basic_info".equals(module.getModuleType())) {
                name = firstNonBlank(name, stringValue(module.getContent().get("name")));
                jobIntention = firstNonBlank(jobIntention, stringValue(module.getContent().get("jobIntention")));
                workYears = firstNonBlank(workYears, stringValue(module.getContent().get("workYears")));
            } else if ("job_intention".equals(module.getModuleType())) {
                jobIntention = firstNonBlank(jobIntention, stringValue(module.getContent().get("targetPosition")));
            }
        }

        if (!name.isBlank()) {
            parts.add(name);
        }
        if (!jobIntention.isBlank()) {
            parts.add(jobIntention);
        }
        if (!workYears.isBlank()) {
            parts.add(workYears);
        }

        if (name.isBlank()) {
            return sanitizeFileName("简历导出") + ".pdf";
        }

        return sanitizeFileName(String.join("-", parts)) + ".pdf";
    }

    private String firstNonBlank(String current, String candidate) {
        return current.isBlank() && !candidate.isBlank() ? candidate : current;
    }

    private String stringValue(Object value) {
        return value instanceof String string ? string.trim() : "";
    }

    private String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
