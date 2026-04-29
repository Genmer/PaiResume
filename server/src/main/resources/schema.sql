-- 用户表
CREATE TABLE IF NOT EXISTS `user` (
    `id`         BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
    `email`      VARCHAR(128) NOT NULL COMMENT '邮箱（登录账号）',
    `password`   VARCHAR(255) NOT NULL COMMENT 'BCrypt 加密密码',
    `nickname`   VARCHAR(64)  DEFAULT '' COMMENT '昵称',
    `avatar`     VARCHAR(512) DEFAULT '' COMMENT '头像 URL',
    `role`       TINYINT      NOT NULL DEFAULT 0 COMMENT '角色: 0=普通用户, 1=管理员',
    `status`     TINYINT      NOT NULL DEFAULT 1 COMMENT '状态: 0=禁用, 1=正常',
    `membership_status` VARCHAR(16) NOT NULL DEFAULT 'FREE' COMMENT '会员状态: FREE/LITE/PRO/MAX',
    `membership_granted_at` DATETIME NULL COMMENT '会员开通时间',
    `membership_source` VARCHAR(32) NULL COMMENT '会员来源: ADMIN_GRANTED/PAYMENT',
    `membership_expires_at` DATETIME NULL COMMENT '会员到期时间，永久会员为空',
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 用户认证身份表
CREATE TABLE IF NOT EXISTS `user_auth_identity` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
    `user_id`         BIGINT       NOT NULL COMMENT '用户 ID',
    `provider`        VARCHAR(32)  NOT NULL COMMENT '登录方式: EMAIL_PASSWORD/WECHAT_SERVICE',
    `principal`       VARCHAR(191) NOT NULL COMMENT '登录主体，例如邮箱或 openid',
    `credential_hash` VARCHAR(255) NULL COMMENT '密码哈希或凭证摘要',
    `verified_at`     DATETIME     NULL COMMENT '认证完成时间',
    `status`          TINYINT      NOT NULL DEFAULT 1 COMMENT '状态: 0=禁用, 1=正常',
    `last_login_at`   DATETIME     NULL COMMENT '最近登录时间',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_provider_principal` (`provider`, `principal`),
    KEY `idx_user_provider` (`user_id`, `provider`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户认证身份表';

-- 简历表
CREATE TABLE IF NOT EXISTS `resume` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
    `user_id`     BIGINT       NOT NULL COMMENT '所属用户 ID',
    `title`       VARCHAR(128) NOT NULL DEFAULT '未命名简历' COMMENT '简历标题',
    `template_id` VARCHAR(64)  DEFAULT 'classic' COMMENT '模板标识',
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
    `module_type` VARCHAR(32)  NOT NULL COMMENT '模块类型: basic_info/education/internship/work_experience/project/skill/paper/research/award/job_intention',
    `content`     JSON         NOT NULL COMMENT '模块内容 JSON',
    `sort_order`  INT          NOT NULL DEFAULT 0 COMMENT '排序序号',
    `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_resume_type` (`resume_id`, `module_type`),
    KEY `idx_resume_type_sort` (`resume_id`, `module_type`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='简历模块表';

-- 平台配置表
CREATE TABLE IF NOT EXISTS `platform_config` (
    `id` BIGINT NOT NULL DEFAULT 1 COMMENT '固定单行主键',
    `membership_price_cents` INT NOT NULL DEFAULT 6600 COMMENT '会员原价，单位分',
    `questionnaire_coupon_amount_cents` INT NOT NULL DEFAULT 1000 COMMENT '问卷优惠码默认面额，单位分',
    `updated_by` BIGINT NULL COMMENT '最后更新人',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='平台配置表';

INSERT INTO `platform_config` (`id`, `membership_price_cents`, `questionnaire_coupon_amount_cents`)
VALUES (1, 6600, 1000)
ON DUPLICATE KEY UPDATE `id` = `id`;

-- 问卷反馈表
CREATE TABLE IF NOT EXISTS `feedback_submission` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    `contact_email` VARCHAR(128) NOT NULL COMMENT '联系邮箱',
    `display_name` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '展示名称',
    `school_or_company` VARCHAR(128) NOT NULL DEFAULT '' COMMENT '学校或公司',
    `target_role` VARCHAR(128) NOT NULL DEFAULT '' COMMENT '目标岗位',
    `rating` TINYINT NOT NULL COMMENT '评分 1-5',
    `testimonial_text` TEXT NOT NULL COMMENT '评价内容',
    `desired_features` LONGTEXT NULL COMMENT '新需求建议',
    `bug_feedback` LONGTEXT NULL COMMENT '问题反馈',
    `consent_to_publish` TINYINT NOT NULL DEFAULT 0 COMMENT '是否同意公开评价',
    `review_status` VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT '审核状态: PENDING/APPROVED/REJECTED',
    `publish_status` VARCHAR(16) NOT NULL DEFAULT 'UNPUBLISHED' COMMENT '发布状态: UNPUBLISHED/PUBLISHED',
    `coupon_status` VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT '优惠码状态: PENDING/ISSUED/INVALID/REJECTED',
    `review_note` VARCHAR(512) NULL COMMENT '审核备注',
    `reviewed_by` BIGINT NULL COMMENT '审核人',
    `reviewed_at` DATETIME NULL COMMENT '审核时间',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_feedback_review_status` (`review_status`, `created_at`),
    KEY `idx_feedback_publish_status` (`publish_status`, `created_at`),
    KEY `idx_feedback_contact_email` (`contact_email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='公开问卷反馈表';

-- 优惠码表
CREATE TABLE IF NOT EXISTS `coupon_code` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    `code` VARCHAR(64) NOT NULL COMMENT '优惠码',
    `source_type` VARCHAR(32) NOT NULL COMMENT '来源类型，例如 QUESTIONNAIRE',
    `source_id` BIGINT NULL COMMENT '来源记录 ID',
    `recipient_email` VARCHAR(128) NOT NULL COMMENT '接收邮箱',
    `amount_cents` INT NOT NULL COMMENT '优惠金额，单位分',
    `status` VARCHAR(16) NOT NULL DEFAULT 'ISSUED' COMMENT '状态: ISSUED/USED/INVALID',
    `used_by_user_id` BIGINT NULL COMMENT '使用人',
    `used_at` DATETIME NULL COMMENT '使用时间',
    `email_sent_at` DATETIME NULL COMMENT '邮件发送时间',
    `expires_at` DATETIME NULL COMMENT '过期时间',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_coupon_code` (`code`),
    UNIQUE KEY `uk_coupon_source` (`source_type`, `source_id`),
    KEY `idx_coupon_status` (`status`, `created_at`),
    KEY `idx_coupon_email` (`recipient_email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='优惠码表';

-- 官方样例表
CREATE TABLE IF NOT EXISTS `resume_showcase` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    `resume_id` BIGINT NOT NULL COMMENT '关联简历 ID',
    `slug` VARCHAR(128) NOT NULL COMMENT '公开访问标识',
    `score_label` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '分数标签，例如 92 分',
    `summary` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '首页摘要',
    `tags` JSON NULL COMMENT '标签数组',
    `display_order` INT NOT NULL DEFAULT 0 COMMENT '展示顺序',
    `publish_status` VARCHAR(16) NOT NULL DEFAULT 'DRAFT' COMMENT '状态: DRAFT/PUBLISHED',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_resume_showcase_slug` (`slug`),
    UNIQUE KEY `uk_resume_showcase_resume` (`resume_id`),
    KEY `idx_resume_showcase_publish_order` (`publish_status`, `display_order`, `updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='官方简历样例表';

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

-- 整份简历 AI 分析记录表
CREATE TABLE IF NOT EXISTS `resume_analysis_record` (
    `id`            BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
    `user_id`       BIGINT       NOT NULL COMMENT '用户 ID',
    `resume_id`     BIGINT       NOT NULL COMMENT '简历 ID',
    `record_status` VARCHAR(16)  NOT NULL COMMENT '状态: completed/error',
    `score`         INT          NULL COMMENT '简历评分',
    `issues`        JSON         NULL COMMENT '问题列表',
    `suggestions`   JSON         NULL COMMENT '建议列表',
    `prompt`        TEXT         NULL COMMENT '本次请求提示词',
    `error_message` VARCHAR(512) NULL COMMENT '失败原因',
    `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_user_created_at` (`user_id`, `created_at`),
    KEY `idx_resume_status_created` (`resume_id`, `record_status`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='整份简历 AI 分析记录表';

-- 简历模板表
CREATE TABLE IF NOT EXISTS `resume_template` (
    `id`            VARCHAR(32)  NOT NULL COMMENT '模板唯一标识',
    `name`          VARCHAR(64)  NOT NULL COMMENT '模板名称',
    `description`   TEXT         NULL COMMENT '模板描述',
    `layout_type`   VARCHAR(32)  NOT NULL COMMENT '布局类型: classic/sidebar/modern',
    `thumbnail_url` VARCHAR(256) NULL COMMENT '缩略图 URL',
    `is_premium`    TINYINT      NOT NULL DEFAULT 0 COMMENT '是否付费模板: 0=免费, 1=付费',
    `sort_order`    INT          NOT NULL DEFAULT 0 COMMENT '排序序号',
    `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    KEY `idx_template_sort` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='简历模板表';

INSERT IGNORE INTO `resume_template` (`id`, `name`, `description`, `layout_type`, `is_premium`, `sort_order`) VALUES
('classic', '经典单栏', '传统单栏布局，适合所有行业', 'classic', 0, 1),
('sidebar', '侧边栏双栏', '现代双栏布局，左侧边栏放基本信息和技能', 'sidebar', 1, 2),
('modern', '现代头图', '时尚头图布局，顶部大标题区域', 'modern', 1, 3);

-- 激活码表
CREATE TABLE IF NOT EXISTS `activation_code` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
    `code`            VARCHAR(64)  NOT NULL COMMENT '兑换码',
    `tier`            VARCHAR(16)  NOT NULL COMMENT '会员等级: LITE/PRO/MAX',
    `duration_days`   INT          NOT NULL COMMENT '有效天数: 30/90/365/0(永久)',
    `batch_id`        VARCHAR(64)  NULL COMMENT '批次ID',
    `status`          VARCHAR(16)  NOT NULL DEFAULT 'UNUSED' COMMENT '状态: UNUSED/USED/DISABLED',
    `used_by_user_id` BIGINT       NULL COMMENT '使用人用户ID',
    `used_at`         DATETIME     NULL COMMENT '使用时间',
    `created_by`      BIGINT       NULL COMMENT '创建者admin用户ID',
    `expires_at`      DATETIME     NULL COMMENT '码过期时间',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_activation_code` (`code`),
    KEY `idx_activation_code_status` (`status`),
    KEY `idx_activation_code_batch_id` (`batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='激活码表';

-- 活动配置表（单行配置）
CREATE TABLE IF NOT EXISTS `activity_config` (
    `id`                     BIGINT       NOT NULL DEFAULT 1 COMMENT '固定单行主键',
    `activity_tier`          VARCHAR(16)  NULL COMMENT '活动会员等级: LITE/PRO/MAX或NULL',
    `activity_duration_days` INT          NOT NULL DEFAULT 30 COMMENT '活动有效天数',
    `activity_enabled`       TINYINT      NOT NULL DEFAULT 0 COMMENT '活动是否启用: 0=禁用, 1=启用',
    `activity_start_at`      DATETIME     NULL COMMENT '活动开始时间',
    `activity_end_at`        DATETIME     NULL COMMENT '活动结束时间',
    `activity_label`         VARCHAR(128) NULL COMMENT '活动标签',
    `updated_by`             BIGINT       NULL COMMENT '最后更新人',
    `created_at`             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at`             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活动配置表';

INSERT INTO `activity_config` (`id`, `activity_tier`, `activity_duration_days`, `activity_enabled`)
VALUES (1, NULL, 30, 0)
ON DUPLICATE KEY UPDATE `id` = `id`;

-- Data migration: ACTIVE → LITE (one-time, safe to re-run)
-- Uncomment and run manually when ready to migrate legacy ACTIVE statuses to LITE tier:
-- UPDATE `user` SET `membership_status` = 'LITE' WHERE `membership_status` = 'ACTIVE';

-- 模拟面试会话表
CREATE TABLE IF NOT EXISTS `mock_interview_session` (
    `id`                  BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
    `user_id`             BIGINT       NOT NULL COMMENT '用户 ID',
    `resume_id`           BIGINT       NOT NULL COMMENT '简历 ID',
    `resume_snapshot`     TEXT         NULL COMMENT '简历快照 JSON',
    `interview_mode`      VARCHAR(30)  NOT NULL COMMENT '面试模式: TARGET_POSITION/DEEP_DIVE_PROJECT',
    `target_position`     VARCHAR(100) NULL COMMENT '目标岗位（TARGET_POSITION 模式）',
    `target_years`        VARCHAR(20)  NULL COMMENT '目标年限（TARGET_POSITION 模式）',
    `status`              VARCHAR(20)  NOT NULL DEFAULT 'IN_PROGRESS' COMMENT '状态: IN_PROGRESS/COMPLETED/ABANDONED',
    `total_score`         DECIMAL(3,1) NULL COMMENT '综合评分 1-10',
    `score_technical`     DECIMAL(3,1) NULL COMMENT '技术深度评分',
    `score_expression`    DECIMAL(3,1) NULL COMMENT '表达清晰度评分',
    `score_project`       DECIMAL(3,1) NULL COMMENT '项目理解评分',
    `evaluation_summary`  TEXT         NULL COMMENT 'AI 评价摘要',
    `max_rounds`          INT          NOT NULL DEFAULT 8 COMMENT '最大面试轮数: 1/3/8',
    `created_at`          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `completed_at`        DATETIME     NULL COMMENT '完成时间',
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_status` (`user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模拟面试会话表';

-- 模拟面试消息表
CREATE TABLE IF NOT EXISTS `mock_interview_message` (
    `id`         BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
    `session_id` BIGINT       NOT NULL COMMENT '会话 ID',
    `role`       VARCHAR(20)  NOT NULL COMMENT '角色: USER/ASSISTANT/SYSTEM',
    `content`    TEXT         NOT NULL COMMENT '消息内容',
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    KEY `idx_session_id` (`session_id`),
    CONSTRAINT `fk_message_session` FOREIGN KEY (`session_id`) REFERENCES `mock_interview_session`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模拟面试消息表';

