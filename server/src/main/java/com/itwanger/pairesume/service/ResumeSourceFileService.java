package com.itwanger.pairesume.service;

import com.itwanger.pairesume.dto.ParsedResumeDTO;
import com.itwanger.pairesume.dto.ResumeSourceFileDTO;
import com.itwanger.pairesume.entity.ResumeSourceFile;
import org.springframework.web.multipart.MultipartFile;

/**
 * 简历导入原始文件存档服务接口
 */
public interface ResumeSourceFileService {

    /**
     * 保存（或覆盖）简历的原始文件存档，同时刷新最近解析时间
     */
    ResumeSourceFileDTO save(Long userId, Long resumeId, MultipartFile file);

    /**
     * 查询存档元信息（含"解析后是否有手动修改"标记）
     */
    ResumeSourceFileDTO getMeta(Long userId, Long resumeId);

    /**
     * 用存档的原始文件重新执行 AI 解析，返回解析结果（不修改简历模块）
     */
    ParsedResumeDTO parseArchived(Long userId, Long resumeId);

    /**
     * 加载存档实体（含文件二进制内容，用于下载/预览原件）
     */
    ResumeSourceFile loadArchive(Long userId, Long resumeId);

    /**
     * 标记重新解析完成（前端写完模块后调用，刷新最近解析时间）
     */
    ResumeSourceFileDTO markParsed(Long userId, Long resumeId);
}
