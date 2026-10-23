package com.smartattend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;
import java.nio.file.Paths;

@Configuration
public class StudentPhotoConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String path = Paths.get("uploads/student-photos")
                .toAbsolutePath().normalize().toUri().toString();

        registry.addResourceHandler("/student-photos/**")
                .addResourceLocations(path);
    }
}