
package com.smartattend.Services;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.Map;

@Service
public class FaceVerificationService {

    private final RestClient restClient;

    public FaceVerificationService() {
        this.restClient = RestClient.builder()
                .baseUrl("http://127.0.0.1:8000")
                .build();
    }

    public Map<?, ?> verifyFaces(
            byte[] registeredPhoto,
            String registeredFilename,
            byte[] livePhoto,
            String liveFilename) {

        MultipartBodyBuilder builder = new MultipartBodyBuilder();

        builder.part(
                "registered_photo",
                new ByteArrayResource(registeredPhoto) {
                    @Override
                    public String getFilename() {
                        return registeredFilename;
                    }
                }
        ).contentType(getMediaType(registeredFilename));

        builder.part(
                "live_photo",
                new ByteArrayResource(livePhoto) {
                    @Override
                    public String getFilename() {
                        return liveFilename;
                    }
                }
        ).contentType(getMediaType(liveFilename));

        MultiValueMap<String, HttpEntity<?>> parts = builder.build();

        try {
            Map<?, ?> result = restClient.post()
                    .uri("/verify-face")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(parts)
                    .retrieve()
                    .onStatus(
                            status -> status.isError(),
                            (request, response) -> {
                                String errorBody = new String(
                                        response.getBody().readAllBytes(),
                                        StandardCharsets.UTF_8
                                );

                                throw new IllegalStateException(
                                        "Python API returned HTTP "
                                        + response.getStatusCode()
                                        + ": " + errorBody
                                );
                            }
                    )
                    .body(Map.class);

            if (result == null) {
                throw new IllegalStateException(
                        "Python API returned an empty response."
                );
            }

            System.out.println("Face API response: " + result);
            return result;

        } catch (Exception ex) {
            System.err.println("Face verification service error:");
            ex.printStackTrace();
            throw new IllegalStateException(
                    "Could not complete Python face verification: "
                    + ex.getMessage(), ex
            );
        }
    }

    private MediaType getMediaType(String filename) {
        if (filename == null) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }

        String name = filename.toLowerCase();

        if (name.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }

        if (name.endsWith(".webp")) {
            return MediaType.parseMediaType("image/webp");
        }

        if (name.endsWith(".jpg") || name.endsWith(".jpeg")) {
            return MediaType.IMAGE_JPEG;
        }

        return MediaType.APPLICATION_OCTET_STREAM;
    }
}
