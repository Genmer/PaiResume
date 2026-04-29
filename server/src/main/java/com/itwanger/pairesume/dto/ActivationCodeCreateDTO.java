package com.itwanger.pairesume.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ActivationCodeCreateDTO {
    @NotBlank(message = "tier不能为空")
    private String tier;

    @NotNull(message = "durationDays不能为空")
    @Min(value = 0, message = "durationDays不能为负数")
    private Integer durationDays;

    @NotNull(message = "quantity不能为空")
    @Min(value = 1, message = "quantity至少为1")
    private Integer quantity;

    private String batchId;
}