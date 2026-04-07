package com.itwanger.pairesume.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.itwanger.pairesume.common.BusinessException;
import com.itwanger.pairesume.common.Result;
import com.itwanger.pairesume.common.ResultCode;
import com.itwanger.pairesume.dto.ResumeAnalysisResultDTO;
import com.itwanger.pairesume.dto.ResumeAnalysisRequestDTO;
import com.itwanger.pairesume.entity.ResumeAnalysisRecord;
import com.itwanger.pairesume.entity.Resume;
import com.itwanger.pairesume.entity.ResumeModule;
import com.itwanger.pairesume.mapper.ResumeMapper;
import com.itwanger.pairesume.mapper.ResumeModuleMapper;
import com.itwanger.pairesume.service.ResumeAnalysisRecordService;
import com.itwanger.pairesume.service.AiService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "简历分析接口")
@RestController
@RequestMapping("/resumes/{resumeId}")
public class ResumeAnalysisController {

    private final AiService aiService;
    private final ResumeAnalysisRecordService resumeAnalysisRecordService;
    private final ResumeMapper resumeMapper;
    private final ResumeModuleMapper moduleMapper;

    public ResumeAnalysisController(
            AiService aiService,
            ResumeAnalysisRecordService resumeAnalysisRecordService,
            ResumeMapper resumeMapper,
            ResumeModuleMapper moduleMapper
    ) {
        this.aiService = aiService;
        this.resumeAnalysisRecordService = resumeAnalysisRecordService;
        this.resumeMapper = resumeMapper;
        this.moduleMapper = moduleMapper;
    }

    @Operation(summary = "AI 分析整份简历")
    @PostMapping("/analysis")
    public Result<ResumeAnalysisResultDTO> analyzeResume(@PathVariable Long resumeId, @RequestBody(required = false) ResumeAnalysisRequestDTO request) {
        var userId = getCurrentUserId();
        var resume = validateOwnership(resumeId, userId);

        List<ResumeModule> modules = moduleMapper.selectList(
                new LambdaQueryWrapper<ResumeModule>()
                        .eq(ResumeModule::getResumeId, resumeId)
                        .orderByAsc(ResumeModule::getSortOrder)
                        .orderByAsc(ResumeModule::getId)
        );

        if (modules.isEmpty()) {
            throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "请先完善简历内容后再进行分析");
        }

        var prompt = request == null ? null : request.getPrompt();
        try {
            var result = aiService.analyzeResume(resume.getTitle(), modules, prompt);
            resumeAnalysisRecordService.save(buildCompletedRecord(userId, resumeId, prompt, result));
            return Result.success(result);
        } catch (BusinessException e) {
            resumeAnalysisRecordService.save(buildErrorRecord(userId, resumeId, prompt, e.getMessage()));
            throw e;
        } catch (Exception e) {
            resumeAnalysisRecordService.save(buildErrorRecord(userId, resumeId, prompt, e.getMessage()));
            throw e;
        }
    }

    @Operation(summary = "获取最近一次成功的简历分析记录")
    @GetMapping("/analysis/latest")
    public Result<ResumeAnalysisResultDTO> getLatestAnalysis(@PathVariable Long resumeId) {
        var userId = getCurrentUserId();
        validateOwnership(resumeId, userId);
        return Result.success(resumeAnalysisRecordService.getLatestCompletedRecord(userId, resumeId));
    }

    private ResumeAnalysisRecord buildCompletedRecord(
            Long userId,
            Long resumeId,
            String prompt,
            ResumeAnalysisResultDTO result
    ) {
        var record = buildBaseRecord(userId, resumeId, prompt);
        record.setRecordStatus("completed");
        record.setScore(result.getScore());
        record.setIssues(result.getIssues());
        record.setSuggestions(result.getSuggestions());
        return record;
    }

    private ResumeAnalysisRecord buildErrorRecord(Long userId, Long resumeId, String prompt, String errorMessage) {
        var record = buildBaseRecord(userId, resumeId, prompt);
        record.setRecordStatus("error");
        record.setErrorMessage(errorMessage);
        return record;
    }

    private ResumeAnalysisRecord buildBaseRecord(Long userId, Long resumeId, String prompt) {
        var record = new ResumeAnalysisRecord();
        record.setUserId(userId);
        record.setResumeId(resumeId);
        record.setPrompt(prompt);
        return record;
    }

    private Resume validateOwnership(Long resumeId, Long userId) {
        var resume = resumeMapper.selectById(resumeId);
        if (resume == null || !resume.getUserId().equals(userId) || resume.getStatus() == 0) {
            throw new BusinessException(ResultCode.RESUME_NOT_FOUND);
        }
        return resume;
    }

    private Long getCurrentUserId() {
        return (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
