package com.itwanger.pairesume.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("resume_template")
public class ResumeTemplate {
    @TableId
    private String id;

    private String name;

    private String description;

    private String layoutType;

    private String thumbnailUrl;

    private Boolean isPremium;

    private Integer sortOrder;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
