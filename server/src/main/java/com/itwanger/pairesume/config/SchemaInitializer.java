package com.itwanger.pairesume.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;

/**
 * 启动时自动执行 schema.sql 建表（IF NOT EXISTS，可安全重复执行）。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SchemaInitializer implements ApplicationRunner {

    private final DataSource dataSource;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            ScriptUtils.executeSqlScript(connection,
                    new org.springframework.core.io.ClassPathResource("schema.sql"));
            migrateAiOptimizeRecordStatusColumn();
            log.info("Schema initialized successfully");
        }
    }

    private void migrateAiOptimizeRecordStatusColumn() {
        try {
            Integer legacyStatusCount = jdbcTemplate.queryForObject("""
                    SELECT COUNT(*)
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'ai_optimize_record'
                      AND COLUMN_NAME = 'status'
                    """, Integer.class);
            Integer recordStatusCount = jdbcTemplate.queryForObject("""
                    SELECT COUNT(*)
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'ai_optimize_record'
                      AND COLUMN_NAME = 'record_status'
                    """, Integer.class);

            if (legacyStatusCount != null && legacyStatusCount > 0
                    && (recordStatusCount == null || recordStatusCount == 0)) {
                jdbcTemplate.execute("""
                        ALTER TABLE `ai_optimize_record`
                        CHANGE COLUMN `status` `record_status` VARCHAR(16) NOT NULL COMMENT '状态: completed/error'
                        """);
                log.info("Migrated ai_optimize_record.status to record_status");
            }
        } catch (Exception e) {
            log.warn("Failed to migrate ai_optimize_record status column", e);
        }
    }
}
