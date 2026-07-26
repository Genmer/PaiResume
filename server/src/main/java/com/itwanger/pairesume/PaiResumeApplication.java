package com.itwanger.pairesume;

import com.itwanger.pairesume.config.DotenvConfig;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@MapperScan("com.itwanger.pairesume.mapper")
public class PaiResumeApplication {

    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(PaiResumeApplication.class);
        app.addInitializers(new DotenvConfig());
        app.run(args);
    }
}
