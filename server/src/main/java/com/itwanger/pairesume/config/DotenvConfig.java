package com.itwanger.pairesume.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.io.File;
import java.util.HashMap;
import java.util.Map;

/**
 * 启动时加载 server/.env 文件到 Spring Environment，
 * 这样 application.yml 中的 ${VAR:default} 占位符就能读到值。
 */
public class DotenvConfig implements ApplicationContextInitializer<ConfigurableApplicationContext> {

    @Override
    public void initialize(ConfigurableApplicationContext context) {
        // 只在 server/.env 文件存在时加载
        File envFile = new File(".env");
        if (!envFile.exists()) {
            return;
        }

        Dotenv dotenv = Dotenv.configure()
                .directory(".")
                .ignoreIfMissing()
                .load();

        ConfigurableEnvironment env = context.getEnvironment();
        Map<String, Object> dotenvMap = new HashMap<>();

        dotenv.entries().forEach(entry -> {
            String key = entry.getKey();
            // 如果系统环境变量已经有值（如 CI 环境），不覆盖
            if (env.getSystemEnvironment().get(key) == null) {
                dotenvMap.put(key, entry.getValue());
            }
        });

        if (!dotenvMap.isEmpty()) {
            env.getPropertySources()
                    .addFirst(new MapPropertySource("dotenvProperties", dotenvMap));
        }
    }
}
