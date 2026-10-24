
package com.smartattend.config;

import java.nio.file.Paths;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class PhotoResourceConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String photoDirectory = Paths
                .get("uploads/student-photos")
                .toAbsolutePath()
                .normalize()
                .toUri()
                .toString();

        registry.addResourceHandler("/student-photos/**")
                .addResourceLocations(photoDirectory);
    }
}
