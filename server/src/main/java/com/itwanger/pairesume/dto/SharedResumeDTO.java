package com.itwanger.pairesume.dto;

import com.itwanger.pairesume.entity.ResumeModule;
import lombok.Data;

import java.util.List;

/**
 * 公开分享简历详情（访客视角）
 */
@Data
public class SharedResumeDTO {
    private String title;
    private List<ResumeModule> modules;
    private String updatedAt;
}
