package com.itwanger.pairesume.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ResumeCreateDTO {
    private String title;
    private String templateId;
}
