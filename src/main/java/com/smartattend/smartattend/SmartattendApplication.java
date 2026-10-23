package com.smartattend.smartattend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = "com.smartattend")
@EntityScan(basePackages = "com.smartattend.entity")
@EnableJpaRepositories(basePackages = "com.smartattend.repository")
public class SmartattendApplication {
    public static void main(String[] args) {
        SpringApplication.run(SmartattendApplication.class, args);
    }
}
