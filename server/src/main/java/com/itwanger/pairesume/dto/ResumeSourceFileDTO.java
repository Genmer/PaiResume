package com.itwanger.pairesume.dto;

import lombok.Data;

/**
 * 简历导入原始文件存档元信息 DTO
 */
@Data
public class ResumeSourceFileDTO {

    /** 是否存在原始文件存档 */
    private boolean exists;

    /** 原始文件名 */
    private String fileName;

    /** 文件类型: pdf/word */
    private String fileType;

    /** 存档上传时间 */
    private String uploadedAt;

    /** 最近一次解析完成时间 */
    private String lastParsedAt;

    /** 解析后简历是否有过手动修改（重新解析会丢失这些修改） */
    private boolean modifiedAfterParse;
}
