package com.itwanger.pairesume.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.itwanger.pairesume.common.BusinessException;
import com.itwanger.pairesume.common.ResultCode;
import com.itwanger.pairesume.dto.ParsedResumeDTO;
import com.itwanger.pairesume.dto.ResumeSourceFileDTO;
import com.itwanger.pairesume.entity.Resume;
import com.itwanger.pairesume.entity.ResumeSourceFile;
import com.itwanger.pairesume.mapper.ResumeMapper;
import com.itwanger.pairesume.mapper.ResumeSourceFileMapper;
import com.itwanger.pairesume.service.ResumeParserService;
import com.itwanger.pairesume.service.ResumeSourceFileService;
import com.itwanger.pairesume.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class ResumeSourceFileServiceImpl implements ResumeSourceFileService {

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024;

    private final ResumeSourceFileMapper resumeSourceFileMapper;
    private final ResumeMapper resumeMapper;
    private final ResumeParserService resumeParserService;

    @Override
    public ResumeSourceFileDTO save(Long userId, Long resumeId, MultipartFile file) {
        Resume resume = requireOwnedResume(userId, resumeId);
        if (file == null || file.isEmpty()) {
            throw new BusinessException(400, "请上传简历原始文件");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException(400, "文件大小不能超过 10MB");
        }
        String fileName = file.getOriginalFilename() == null ? "resume" : file.getOriginalFilename();
        String fileType = resolveFileType(fileName);

        byte[] data;
        try {
            data = file.getBytes();
        } catch (IOException e) {
            throw new BusinessException(500, "读取上传文件失败");
        }

        ResumeSourceFile archive = findByResumeId(resumeId);
        LocalDateTime now = LocalDateTime.now();
        if (archive == null) {
            archive = new ResumeSourceFile();
            archive.setResumeId(resumeId);
            archive.setUserId(userId);
            archive.setFileName(fileName);
            archive.setFileType(fileType);
            archive.setFileData(data);
            archive.setLastParsedAt(now);
            resumeSourceFileMapper.insert(archive);
            log.info("[Resume Source File] archived: resumeId={}, file={}, size={} bytes", resumeId, fileName, data.length);
        } else {
            archive.setFileName(fileName);
            archive.setFileType(fileType);
            archive.setFileData(data);
            archive.setLastParsedAt(now);
            resumeSourceFileMapper.updateById(archive);
            log.info("[Resume Source File] re-archived: resumeId={}, file={}, size={} bytes", resumeId, fileName, data.length);
        }
        return toDto(archive, resume);
    }

    @Override
    public ResumeSourceFileDTO getMeta(Long userId, Long resumeId) {
        Resume resume = requireOwnedResume(userId, resumeId);
        return toDto(findByResumeId(resumeId), resume);
    }

    @Override
    public ParsedResumeDTO parseArchived(Long userId, Long resumeId) {
        requireOwnedResume(userId, resumeId);
        ResumeSourceFile archive = findByResumeId(resumeId);
        if (archive == null || archive.getFileData() == null) {
            throw new BusinessException(404, "该简历没有原始文件存档，无法重新解析");
        }

        log.info("[Resume Source File] re-parse start: resumeId={}, file={}, type={}",
                resumeId, archive.getFileName(), archive.getFileType());
        ByteArrayInputStream input = new ByteArrayInputStream(archive.getFileData());
        if ("word".equals(archive.getFileType())) {
            return resumeParserService.parseWord(input, archive.getFileName());
        }
        return resumeParserService.parsePdf(input, archive.getFileName());
    }

    @Override
    public ResumeSourceFile loadArchive(Long userId, Long resumeId) {
        requireOwnedResume(userId, resumeId);
        ResumeSourceFile archive = findByResumeId(resumeId);
        if (archive == null || archive.getFileData() == null) {
            throw new BusinessException(404, "该简历没有原始文件存档");
        }
        return archive;
    }

    @Override
    public ResumeSourceFileDTO markParsed(Long userId, Long resumeId) {
        Resume resume = requireOwnedResume(userId, resumeId);
        ResumeSourceFile archive = findByResumeId(resumeId);
        if (archive == null) {
            throw new BusinessException(404, "该简历没有原始文件存档");
        }
        archive.setLastParsedAt(LocalDateTime.now());
        resumeSourceFileMapper.updateById(archive);
        return toDto(archive, resume);
    }

    private String resolveFileType(String fileName) {
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".pdf")) {
            return "pdf";
        }
        if (lower.endsWith(".doc") || lower.endsWith(".docx")) {
            return "word";
        }
        throw new BusinessException(400, "仅支持 PDF / Word 格式文件");
    }

    private Resume requireOwnedResume(Long userId, Long resumeId) {
        Resume resume = resumeMapper.selectById(resumeId);
        if (resume == null || !resume.getUserId().equals(userId) || resume.getStatus() == 0) {
            throw new BusinessException(ResultCode.RESUME_NOT_FOUND);
        }
        return resume;
    }

    private ResumeSourceFile findByResumeId(Long resumeId) {
        return resumeSourceFileMapper.selectOne(
                new LambdaQueryWrapper<ResumeSourceFile>()
                        .eq(ResumeSourceFile::getResumeId, resumeId)
                        .last("LIMIT 1")
        );
    }

    private ResumeSourceFileDTO toDto(ResumeSourceFile archive, Resume resume) {
        ResumeSourceFileDTO dto = new ResumeSourceFileDTO();
        if (archive == null) {
            dto.setExists(false);
            return dto;
        }
        dto.setExists(true);
        dto.setFileName(archive.getFileName());
        dto.setFileType(archive.getFileType());
        dto.setUploadedAt(DateTimeUtils.format(archive.getCreatedAt()));
        dto.setLastParsedAt(DateTimeUtils.format(archive.getLastParsedAt()));
        // 模块写入完成后前端会调用 markParsed，因此正常情况下 lastParsedAt >= resume.updatedAt；
        // 一旦用户手动改过模块（或重命名），resume.updatedAt 就会晚于 lastParsedAt
        dto.setModifiedAfterParse(
                archive.getLastParsedAt() != null
                        && resume.getUpdatedAt() != null
                        && resume.getUpdatedAt().isAfter(archive.getLastParsedAt())
        );
        return dto;
    }
}
