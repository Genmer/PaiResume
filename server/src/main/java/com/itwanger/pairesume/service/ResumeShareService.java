package com.itwanger.pairesume.service;

import com.itwanger.pairesume.dto.ResumeShareStatusDTO;
import com.itwanger.pairesume.dto.SharedResumeDTO;

public interface ResumeShareService {

    /** 查询分享状态（属主） */
    ResumeShareStatusDTO getStatus(Long userId, Long resumeId);

    /** 开启分享，首次开启生成 token，重新开启复用原 token（属主） */
    ResumeShareStatusDTO enable(Long userId, Long resumeId);

    /** 关闭分享（属主） */
    ResumeShareStatusDTO disable(Long userId, Long resumeId);

    /** 按 token 查询公开简历（访客，无需登录） */
    SharedResumeDTO getSharedResume(String token);
}
