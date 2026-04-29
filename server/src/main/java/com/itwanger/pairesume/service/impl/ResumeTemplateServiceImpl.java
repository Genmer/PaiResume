package com.itwanger.pairesume.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.itwanger.pairesume.entity.ResumeTemplate;
import com.itwanger.pairesume.mapper.ResumeTemplateMapper;
import com.itwanger.pairesume.service.ResumeTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ResumeTemplateServiceImpl implements ResumeTemplateService {
    private final ResumeTemplateMapper resumeTemplateMapper;

    @Override
    public List<ResumeTemplate> listAll() {
        return resumeTemplateMapper.selectList(
                new LambdaQueryWrapper<ResumeTemplate>()
                        .orderByAsc(ResumeTemplate::getSortOrder)
        );
    }
}
