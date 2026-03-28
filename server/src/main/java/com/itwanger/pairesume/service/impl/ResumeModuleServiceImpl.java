package com.itwanger.pairesume.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.itwanger.pairesume.common.BusinessException;
import com.itwanger.pairesume.common.ResultCode;
import com.itwanger.pairesume.dto.ModuleCreateDTO;
import com.itwanger.pairesume.dto.ModuleUpdateDTO;
import com.itwanger.pairesume.entity.Resume;
import com.itwanger.pairesume.entity.ResumeModule;
import com.itwanger.pairesume.mapper.ResumeMapper;
import com.itwanger.pairesume.mapper.ResumeModuleMapper;
import com.itwanger.pairesume.service.ResumeModuleService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ResumeModuleServiceImpl implements ResumeModuleService {

    private final ResumeModuleMapper moduleMapper;
    private final ResumeMapper resumeMapper;

    public ResumeModuleServiceImpl(ResumeModuleMapper moduleMapper, ResumeMapper resumeMapper) {
        this.moduleMapper = moduleMapper;
        this.resumeMapper = resumeMapper;
    }

    @Override
    public List<ResumeModule> listByResumeId(Long resumeId, Long userId) {
        verifyResumeOwnership(resumeId, userId);
        return moduleMapper.selectList(
            new LambdaQueryWrapper<ResumeModule>()
                .eq(ResumeModule::getResumeId, resumeId)
                .orderByAsc(ResumeModule::getSortOrder)
        );
    }

    @Override
    public ResumeModule create(Long resumeId, Long userId, ModuleCreateDTO dto) {
        verifyResumeOwnership(resumeId, userId);

        var module = new ResumeModule();
        module.setResumeId(resumeId);
        module.setModuleType(dto.getModuleType());
        module.setContent(dto.getContent());
        module.setSortOrder(dto.getSortOrder() != null ? dto.getSortOrder() : 0);
        moduleMapper.insert(module);
        return module;
    }

    @Override
    public ResumeModule update(Long resumeId, Long userId, Long moduleId, ModuleUpdateDTO dto) {
        verifyResumeOwnership(resumeId, userId);

        var module = moduleMapper.selectById(moduleId);
        if (module == null || !module.getResumeId().equals(resumeId)) {
            throw new BusinessException(ResultCode.MODULE_NOT_FOUND);
        }

        module.setContent(dto.getContent());
        moduleMapper.updateById(module);
        return module;
    }

    @Override
    public void delete(Long resumeId, Long userId, Long moduleId) {
        verifyResumeOwnership(resumeId, userId);

        var module = moduleMapper.selectById(moduleId);
        if (module == null || !module.getResumeId().equals(resumeId)) {
            throw new BusinessException(ResultCode.MODULE_NOT_FOUND);
        }
        moduleMapper.deleteById(moduleId);
    }

    private void verifyResumeOwnership(Long resumeId, Long userId) {
        var resume = resumeMapper.selectById(resumeId);
        if (resume == null || !resume.getUserId().equals(userId) || resume.getStatus() == 0) {
            throw new BusinessException(ResultCode.RESUME_NOT_FOUND);
        }
    }
}
