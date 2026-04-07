-- 用户表
CREATE TABLE IF NOT EXISTS `user` (
    `id`         BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
    `email`      VARCHAR(128) NOT NULL COMMENT '邮箱（登录账号）',
    `password`   VARCHAR(255) NOT NULL COMMENT 'BCrypt 加密密码',
    `nickname`   VARCHAR(64)  DEFAULT '' COMMENT '昵称',
    `avatar`     VARCHAR(512) DEFAULT '' COMMENT '头像 URL',
    `role`       TINYINT      NOT NULL DEFAULT 0 COMMENT '角色: 0=普通用户, 1=管理员',
    `status`     TINYINT      NOT NULL DEFAULT 1 COMMENT '状态: 0=禁用, 1=正常',
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 简历表
CREATE TABLE IF NOT EXISTS `resume` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
    `user_id`     BIGINT       NOT NULL COMMENT '所属用户 ID',
    `title`       VARCHAR(128) NOT NULL DEFAULT '未命名简历' COMMENT '简历标题',
    `template_id` VARCHAR(64)  DEFAULT 'default' COMMENT '模板标识',
    `status`      TINYINT      NOT NULL DEFAULT 1 COMMENT '状态: 0=已删除, 1=正常',
    `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='简历表';

-- 简历模块表
CREATE TABLE IF NOT EXISTS `resume_module` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
    `resume_id`   BIGINT       NOT NULL COMMENT '简历 ID',
    `module_type` VARCHAR(32)  NOT NULL COMMENT '模块类型: basic_info/education/internship/project/skill/paper/research/award/job_intention',
    `content`     JSON         NOT NULL COMMENT '模块内容 JSON',
    `sort_order`  INT          NOT NULL DEFAULT 0 COMMENT '排序序号',
    `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_resume_type` (`resume_id`, `module_type`),
    KEY `idx_resume_type_sort` (`resume_id`, `module_type`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='简历模块表';

-- 字段级 AI 优化记录表
CREATE TABLE IF NOT EXISTS `ai_optimize_record` (
    `id`                 BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
    `user_id`            BIGINT       NOT NULL COMMENT '用户 ID',
    `resume_id`          BIGINT       NOT NULL COMMENT '简历 ID',
    `module_id`          BIGINT       NOT NULL COMMENT '模块 ID',
    `module_type`        VARCHAR(32)  NOT NULL COMMENT '模块类型',
    `field_type`         VARCHAR(32)  NOT NULL COMMENT '字段类型',
    `field_index`        INT          NULL COMMENT '字段索引，非列表字段为空',
    `record_status`      VARCHAR(16)  NOT NULL COMMENT '状态: completed/error',
    `original_text`      TEXT         NULL COMMENT '优化前文本',
    `reasoning_markdown` LONGTEXT     NULL COMMENT 'AI 生成过程 Markdown',
    `streamed_content`   LONGTEXT     NULL COMMENT '流式结果内容',
    `optimized_text`     TEXT         NULL COMMENT '最终优化结果',
    `candidates`         JSON         NULL COMMENT '候选结果 JSON 数组',
    `prompt`             TEXT         NULL COMMENT '本次请求提示词',
    `system_prompt`      TEXT         NULL COMMENT '系统提示词',
    `error_message`      VARCHAR(512) NULL COMMENT '失败原因',
    `created_at`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_user_created_at` (`user_id`, `created_at`),
    KEY `idx_resume_module_field_created` (`resume_id`, `module_id`, `field_type`, `field_index`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字段级 AI 优化记录表';
