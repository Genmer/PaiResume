package com.itwanger.pairesume.service;

import com.itwanger.pairesume.dto.CoverLetterResult;

public interface CoverLetterService {

    /**
     * 基于简历内容生成求职信或自我介绍
     *
     * @param type          生成类型: cover_letter / self_intro
     * @param tone          语气风格: formal / friendly
     * @param jdText        目标岗位 JD（可选，提供后生成内容会针对岗位定制）
     * @param resumeContent 简历模块内容文本
     */
    CoverLetterResult generate(String type, String tone, String jdText, String resumeContent);
}
