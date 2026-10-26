package com.smartattend.controller;

import com.smartattend.entity.Student;
import com.smartattend.entity.Attendence;
import com.smartattend.entity.SessionRecord;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
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
            // 1. Validate uploaded live photo
            if (livePhoto == null || livePhoto.isEmpty()) {
                return ResponseEntity.badRequest().body(
                        Map.of(
                                "verified", false,
                                "attendanceSaved", false,
                                "message", "Please upload a live photo."
                        )
                );
            }

            if (livePhoto.getSize() > 5 * 1024 * 1024) {
                return ResponseEntity.badRequest().body(
                        Map.of(
                                "verified", false,
                                "attendanceSaved", false,
                                "message", "Live photo must be under 5 MB."
                        )
                );
            }

            String contentType = livePhoto.getContentType();

            if (contentType == null ||
                    !(contentType.equals("image/jpeg")
                            || contentType.equals("image/png")
                            || contentType.equals("image/webp"))) {

                return ResponseEntity.badRequest().body(
                        Map.of(
                                "verified", false,
                                "attendanceSaved", false,
                                "message",
                                "Only JPG, PNG or WEBP photos are allowed."
                        )
                );
            }

            // 2. Find student
            Student student = studentRepository.findById(studentId)
                    .orElse(null);

            if (student == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                        Map.of(
                                "verified", false,
                                "attendanceSaved", false,
                                "message", "Student not found."
                        )
                );
            }

            if (student.getPhotoPath() == null
                    || student.getPhotoPath().isBlank()) {

                return ResponseEntity.badRequest().body(
                        Map.of(
                                "verified", false,
                                "attendanceSaved", false,
                                "message",
                                "Student has no registered photo."
                        )
                );
            }

            // 3. Locate registered photo safely
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
                        Map.of(
                                "verified", false,
                                "attendanceSaved", false,
                                "message",
                                "Registered student photo not found."
                        )
                );
            }

            // 4. Verify live photo against registered photo
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

                response.put("verified", false);
                response.put("attendanceSaved", false);
                response.put("message", "Face verification failed.");

                return ResponseEntity
                        .status(HttpStatus.UNPROCESSABLE_ENTITY)
                        .body(response);
            }

            // 5. Find or create today's daily session
            LocalDate today = LocalDate.now(
                    ZoneId.of("Asia/Kolkata")
            );
            
if (today.getDayOfWeek() == java.time.DayOfWeek.SUNDAY) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
            Map.of(
                    "verified", false,
                    "attendanceSaved", false,
                    "message", "Attendance is available Monday to Saturday only."
            )
    );
}


            String studentClass = student.getStudentClass();

            if (studentClass == null || studentClass.isBlank()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(
                        Map.of(
                                "verified", true,
                                "attendanceSaved", false,
                                "message", "Student has no assigned class."
                        )
                );
            }

            Optional<Integer> sessionIdOptional =
                    sessionRepository.findSessionIdByClassAndDate(
                            studentClass,
                            today
                    );

            Integer sessionId;

            if (sessionIdOptional.isPresent()) {

                // Reuse today's session
                sessionId = sessionIdOptional.get();

            } else {

                // Find class ID from classes table
                String classSql = """
                        SELECT class_id
                        FROM classes
                        WHERE LOWER(TRIM(class_name)) =
                              LOWER(TRIM(?))
                        LIMIT 1
                        """;

                List<Integer> classIds = jdbcTemplate.query(
                        classSql,
                        (rs, rowNum) -> rs.getInt("class_id"),
                        studentClass
                );

                if (classIds.isEmpty()) {
                    return ResponseEntity.status(HttpStatus.CONFLICT).body(
                            Map.of(
                                    "verified", true,
                                    "attendanceSaved", false,
                                    "message",
                                    "Class not found: " + studentClass
                            )
                    );
                }

                Integer classId = classIds.get(0);

                // Create a session for today
                SessionRecord newSession = new SessionRecord();
                newSession.setClassId(classId);
                newSession.setSessionDate(today);
                newSession.setSessionType("DAILY");

                SessionRecord savedSession =
                        sessionRepository.saveAndFlush(newSession);

                sessionId = savedSession.getSessionId();
            }

            
            
            // 6. Use the registered students table ID directly.
            Long attendanceStudentId = student.getId();

            if (attendanceStudentId == null) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(
                        Map.of(
                                "verified", true,
                                "attendanceSaved", false,
                                "message", "Registered student ID is missing."
                        )
                );
            }


            // 7. Prevent duplicate attendance
            boolean alreadyMarked =
                    attendenceRepository.existsBySessionIdAndStudentId(
                            sessionId,
                            attendanceStudentId
                    );

            if (alreadyMarked) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(
                        Map.of(
                                "verified", true,
                                "attendanceSaved", false,
                                "sessionId", sessionId,
                                "message",
                                "Attendance already marked for this session."
                        )
                );
            }

            // 8. Save attendance after successful face verification
            Attendence attendance = new Attendence();
            attendance.setSessionId(sessionId);
            attendance.setStudentId(attendanceStudentId);
            attendance.setStatus(
                    Attendence.AttendanceStatus.PRESENT
            );
            attendance.setMarkedAt(LocalDateTime.now(
                    ZoneId.of("Asia/Kolkata")
            ));

            Attendence savedAttendance =
                    attendenceRepository.saveAndFlush(attendance);

            // 9. Return success response
            Map<String, Object> response = new HashMap<>();

            for (Map.Entry<?, ?> entry : result.entrySet()) {
                if (entry.getKey() instanceof String key) {
                    response.put(key, entry.getValue());
                }
            }

            response.put("verified", true);
            response.put("attendanceSaved", true);
            response.put("attendanceId",
                    savedAttendance.getAttendanceId());
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
                            "Database operation failed. Check the server logs and database constraints."
                    )
            );

        } catch (Exception ex) {
            ex.printStackTrace();

            Map<String, Object> response = new HashMap<>();
            response.put("attendanceSaved", false);
            response.put(
                    "message",
                    "Face verification or attendance saving failed."
            );
            response.put(
                    "error",
                    ex.getMessage() == null
                            ? "Unknown error"
                            : ex.getMessage()
            );

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(response);
        }
    }
}