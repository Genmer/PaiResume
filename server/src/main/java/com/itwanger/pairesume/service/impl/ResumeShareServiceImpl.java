package com.itwanger.pairesume.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.itwanger.pairesume.common.BusinessException;
import com.itwanger.pairesume.common.ResultCode;
import com.itwanger.pairesume.dto.ResumeShareStatusDTO;
import com.itwanger.pairesume.dto.SharedResumeDTO;
import com.itwanger.pairesume.entity.Resume;
import com.itwanger.pairesume.entity.ResumeModule;
import com.itwanger.pairesume.entity.ResumeShare;
import com.itwanger.pairesume.mapper.ResumeMapper;
import com.itwanger.pairesume.mapper.ResumeModuleMapper;
import com.itwanger.pairesume.mapper.ResumeShareMapper;
import com.itwanger.pairesume.service.ResumeShareService;
import com.itwanger.pairesume.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ResumeShareServiceImpl implements ResumeShareService {

    private static final String STATUS_ENABLED = "ENABLED";
    private static final String STATUS_DISABLED = "DISABLED";

    private final ResumeShareMapper resumeShareMapper;
    private final ResumeMapper resumeMapper;
    private final ResumeModuleMapper resumeModuleMapper;

    @Override
    public ResumeShareStatusDTO getStatus(Long userId, Long resumeId) {
        requireOwnedResume(userId, resumeId);
        return toStatusDto(findByResumeId(resumeId));
    }

    @Override
    public ResumeShareStatusDTO enable(Long userId, Long resumeId) {
        requireOwnedResume(userId, resumeId);
        ResumeShare share = findByResumeId(resumeId);
        if (share == null) {
            share = new ResumeShare();
            share.setResumeId(resumeId);
            share.setUserId(userId);
            share.setShareToken(generateToken());
            share.setShareStatus(STATUS_ENABLED);
            share.setViewCount(0);
            resumeShareMapper.insert(share);
            log.info("[Resume Share] created: resumeId={}, userId={}", resumeId, userId);
        } else if (!STATUS_ENABLED.equals(share.getShareStatus())) {
            // 重新开启复用原 token，历史链接继续有效
            share.setShareStatus(STATUS_ENABLED);
            resumeShareMapper.updateById(share);
            log.info("[Resume Share] re-enabled: resumeId={}, userId={}", resumeId, userId);
        }
        return toStatusDto(share);
    }

    @Override
    public ResumeShareStatusDTO disable(Long userId, Long resumeId) {
        requireOwnedResume(userId, resumeId);
        ResumeShare share = findByResumeId(resumeId);
        if (share != null && !STATUS_DISABLED.equals(share.getShareStatus())) {
            share.setShareStatus(STATUS_DISABLED);
            resumeShareMapper.updateById(share);
            log.info("[Resume Share] disabled: resumeId={}, userId={}", resumeId, userId);
        }
        return toStatusDto(share);
    }

    @Override
    public SharedResumeDTO getSharedResume(String token) {
        if (token == null || token.isBlank()) {
            throw new BusinessException(ResultCode.SHARE_NOT_FOUND);
        }
        ResumeShare share = resumeShareMapper.selectOne(
                new LambdaQueryWrapper<ResumeShare>()
                        .eq(ResumeShare::getShareToken, token)
                        .eq(ResumeShare::getShareStatus, STATUS_ENABLED)
                        .last("LIMIT 1")
        );
        if (share == null) {
            throw new BusinessException(ResultCode.SHARE_NOT_FOUND);
        }

        Resume resume = resumeMapper.selectById(share.getResumeId());
        if (resume == null || resume.getStatus() == 0) {
            throw new BusinessException(ResultCode.SHARE_NOT_FOUND);
        }

        List<ResumeModule> modules = resumeModuleMapper.selectList(
                new LambdaQueryWrapper<ResumeModule>()
                        .eq(ResumeModule::getResumeId, share.getResumeId())
                        .orderByAsc(ResumeModule::getSortOrder)
                        .orderByAsc(ResumeModule::getId)
        );

        share.setViewCount((share.getViewCount() == null ? 0 : share.getViewCount()) + 1);
        resumeShareMapper.updateById(share);

        SharedResumeDTO dto = new SharedResumeDTO();
        dto.setTitle(resume.getTitle());
        dto.setModules(modules);
        dto.setUpdatedAt(DateTimeUtils.format(resume.getUpdatedAt()));
        return dto;
    }

    private void requireOwnedResume(Long userId, Long resumeId) {
        Resume resume = resumeMapper.selectById(resumeId);
        if (resume == null || !resume.getUserId().equals(userId) || resume.getStatus() == 0) {
            throw new BusinessException(ResultCode.RESUME_NOT_FOUND);
        }
    }

    private ResumeShare findByResumeId(Long resumeId) {
        return resumeShareMapper.selectOne(
                new LambdaQueryWrapper<ResumeShare>()
                        .eq(ResumeShare::getResumeId, resumeId)
                        .last("LIMIT 1")
        );
    }

    private String generateToken() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    private ResumeShareStatusDTO toStatusDto(ResumeShare share) {
        ResumeShareStatusDTO dto = new ResumeShareStatusDTO();
        if (share == null) {
            dto.setEnabled(false);
            dto.setViewCount(0);
            return dto;
        }
        dto.setEnabled(STATUS_ENABLED.equals(share.getShareStatus()));
        dto.setShareToken(share.getShareToken());
        dto.setViewCount(share.getViewCount() == null ? 0 : share.getViewCount());
        return dto;
    }
}
