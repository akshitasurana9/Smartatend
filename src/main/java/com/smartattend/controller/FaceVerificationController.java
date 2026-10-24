
package com.smartattend.controller;

import com.smartattend.entity.Student;
import com.smartattend.entity.Attendence;
import com.smartattend.repository.StudentRepository;
import com.smartattend.repository.AttendenceRepository;
import com.smartattend.repository.SessionRepository;
import com.smartattend.Services.FaceVerificationService;

import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/face")
public class FaceVerificationController {

    private final StudentRepository studentRepository;
    private final FaceVerificationService faceService;
    private final AttendenceRepository attendenceRepository;
    private final SessionRepository sessionRepository;
    private final JdbcTemplate jdbcTemplate;

    public FaceVerificationController(
            StudentRepository studentRepository,
            FaceVerificationService faceService,
            AttendenceRepository attendenceRepository,
            SessionRepository sessionRepository,
            JdbcTemplate jdbcTemplate) {

        this.studentRepository = studentRepository;
        this.faceService = faceService;
        this.attendenceRepository = attendenceRepository;
        this.sessionRepository = sessionRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostMapping(
        value = "/verify/{studentId}",
        consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<?> verifyFace(
            @PathVariable Long studentId,
            @RequestParam("livePhoto") MultipartFile livePhoto) {

        try {
            if (livePhoto == null || livePhoto.isEmpty()) {
                return ResponseEntity.badRequest().body(
                    Map.of("verified", false,
                           "message", "Please upload a live photo.")
                );
            }

            if (livePhoto.getSize() > 5 * 1024 * 1024) {
                return ResponseEntity.badRequest().body(
                    Map.of("verified", false,
                           "message", "Live photo must be under 5 MB.")
                );
            }

            String contentType = livePhoto.getContentType();

            if (contentType == null ||
                !(contentType.equals("image/jpeg")
                || contentType.equals("image/png")
                || contentType.equals("image/webp"))) {

                return ResponseEntity.badRequest().body(
                    Map.of("verified", false,
                           "message", "Only JPG, PNG or WEBP photos are allowed.")
                );
            }

            // 1. Find registered student from students table
            Student student = studentRepository.findById(studentId)
                    .orElse(null);

            if (student == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                    Map.of("verified", false,
                           "message", "Student not found.")
                );
            }

            if (student.getPhotoPath() == null
                    || student.getPhotoPath().isBlank()) {
                return ResponseEntity.badRequest().body(
                    Map.of("verified", false,
                           "message", "Student has no registered photo.")
                );
            }

            // 2. Locate registered photo
            String storedPath = student.getPhotoPath()
                    .replaceFirst("^/student-photos/", "");

            Path photoDirectory = Paths
                    .get("uploads/student-photos")
                    .toAbsolutePath()
                    .normalize();

            Path registeredPath = photoDirectory
                    .resolve(storedPath)
                    .normalize();

            if (!registeredPath.startsWith(photoDirectory)
                    || !Files.isRegularFile(registeredPath)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                    Map.of("verified", false,
                           "message", "Registered student photo not found.")
                );
            }
                 // DEBUG: Check registered and live photo
        System.out.println("========== FACE VERIFICATION DEBUG ==========");
       System.out.println("Student ID: " + studentId);
       System.out.println("Student email: " + student.getEmail());
     System.out.println("Database photo path: " + student.getPhotoPath());
    System.out.println("Resolved photo path: " + registeredPath);
    System.out.println("Registered photo exists: "
        + Files.isRegularFile(registeredPath));
    System.out.println("Registered photo bytes: "
        + Files.size(registeredPath));
    System.out.println("Live photo bytes: " + livePhoto.getSize());
   System.out.println("=============================================");

            // 3. Verify live photo against registered photo
            String registeredFilename =
                    registeredPath.getFileName().toString();

            String liveFilename = livePhoto.getOriginalFilename();

            if (liveFilename == null || liveFilename.isBlank()) {
                liveFilename = "live.jpg";
            }

            Map<?, ?> result = faceService.verifyFaces(
                    Files.readAllBytes(registeredPath),
                    registeredFilename,
                    livePhoto.getBytes(),
                    liveFilename
            );

           Object verifiedValue = result.get("verified");

boolean isVerified =
        Boolean.TRUE.equals(verifiedValue)
        || "true".equalsIgnoreCase(
                String.valueOf(verifiedValue)
        );

if (!isVerified) {
                Map<String, Object> response = new HashMap<>();

for (Map.Entry<?, ?> entry : result.entrySet()) {
    if (entry.getKey() instanceof String key) {
        response.put(key, entry.getValue());
    }
}
                response.put("attendanceSaved", false);
                response.put("message", "Face verification failed.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(response);
            }

            // 4. Find today's session for this student's class
            Optional<Integer> sessionIdOptional =
                    sessionRepository.findTodaySessionId(
                            student.getStudentClass()
                    );

            if (sessionIdOptional.isEmpty()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(
                    Map.of(
                        "verified", true,
                        "attendanceSaved", false,
                        "message",
                        "Face verified, but no session exists today for this class."
                    )
                );
            }

            Integer sessionId = sessionIdOptional.get();

            // 5. Map students-table email to the student table's FK ID
            String sql = """
                SELECT st.student_id
                FROM student st
                JOIN classes c ON c.class_id = st.class_id
                WHERE LOWER(TRIM(st.email)) = LOWER(TRIM(?))
                  AND LOWER(TRIM(c.class_name)) = LOWER(TRIM(?))
                """;

            java.util.List<Integer> matchingIds =
                    jdbcTemplate.query(
                        sql,
                        (rs, rowNum) -> rs.getInt("student_id"),
                        student.getEmail(),
                        student.getStudentClass()
                    );

            if (matchingIds.isEmpty()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(
                    Map.of(
                        "verified", true,
                        "attendanceSaved", false,
                        "message",
                        "Face verified, but the student is not mapped in the attendance table."
                    )
                );
            }

            if (matchingIds.size() > 1) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(
                    Map.of(
                        "verified", true,
                        "attendanceSaved", false,
                        "message",
                        "Multiple student records match this email and class. Please correct the database."
                    )
                );
            }

            Long attendanceStudentId = matchingIds.get(0).longValue();

            // 6. Prevent duplicate attendance for this session
            if (attendenceRepository.existsBySessionIdAndStudentId(
                    sessionId, attendanceStudentId)) {

                return ResponseEntity.status(HttpStatus.CONFLICT).body(
                    Map.of(
                        "verified", true,
                        "attendanceSaved", false,
                        "message", "Attendance already marked for this session."
                    )
                );
            }

            // 7. Save attendance only after successful verification
            Attendence attendance = new Attendence();
            attendance.setSessionId(sessionId);
            attendance.setStudentId(attendanceStudentId);
            attendance.setStatus(Attendence.AttendanceStatus.PRESENT);
            attendance.setMarkedAt(LocalDateTime.now());

            Attendence savedAttendance =
                    attendenceRepository.saveAndFlush(attendance);

            // 8. Return success only after the database save succeeds
            Map<String, Object> response = new HashMap<>();
            for (Map.Entry<?, ?> entry : result.entrySet()) {
    if (entry.getKey() instanceof String key) {
        response.put(key, entry.getValue());
    }
}
            response.put("attendanceSaved", true);
            response.put("attendanceId", savedAttendance.getAttendanceId());
            response.put("sessionId", sessionId);
            response.put("message",
                    "Face verified and attendance saved successfully.");

            return ResponseEntity.ok(response);

        } catch (DataAccessException ex) {
            ex.printStackTrace();

            return ResponseEntity.status(HttpStatus.CONFLICT).body(
                Map.of(
                    "verified", true,
                    "attendanceSaved", false,
                    "message",
                    "Attendance could not be saved. Check the database constraints."
                )
            );

        } catch (Exception ex) {
            ex.printStackTrace();

            Map<String, Object> response = new HashMap<>();
            response.put("attendanceSaved", false);
            response.put("message", "Face verification or attendance saving failed.");
            response.put("error",
                    ex.getMessage() == null ? "Unknown error" : ex.getMessage());

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(response);
        }
    }
}
