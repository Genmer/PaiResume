package com.itwanger.pairesume.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("activation_code")
public class ActivationCode {
    @TableId(type = IdType.AUTO)
    private Long id;

    private String code;

    private String tier;

    private Integer durationDays;

    private String batchId;

    @TableField("status")
    private String codeStatus;

    private Long usedByUserId;

    private LocalDateTime usedAt;

    private Long createdBy;

    private LocalDateTime expiresAt;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
