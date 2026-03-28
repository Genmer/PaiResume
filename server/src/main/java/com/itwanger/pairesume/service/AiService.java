package com.itwanger.pairesume.service;

import java.util.Map;

public interface AiService {
    /**
     * 对简历模块内容进行 AI 优化，返回优化前后的对比
     * 不直接保存到数据库，需用户确认后再调用更新接口
     */
    Map<String, Object> optimizeModule(String moduleType, Map<String, Object> content);
}
