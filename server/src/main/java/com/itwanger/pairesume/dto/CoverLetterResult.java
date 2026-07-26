package com.itwanger.pairesume.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * AI 求职信/自我介绍生成结果
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CoverLetterResult {

    /** 生成类型: cover_letter / self_intro */
    private String type;

    /** 生成的正文内容 */
    private String content;
}
