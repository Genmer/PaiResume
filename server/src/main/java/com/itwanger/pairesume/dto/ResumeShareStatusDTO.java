package com.itwanger.pairesume.dto;

import lombok.Data;

/**
 * 简历分享状态（属主视角）
 */
@Data
public class ResumeShareStatusDTO {
    private Boolean enabled;
    private String shareToken;
    private Integer viewCount;
}
