
package com.smartattend.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attendance")
@CrossOrigin(origins = "http://localhost:8080")
public class AttendanceController {

    private final JdbcTemplate jdbcTemplate;

    public AttendanceController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // GET /api/attendance/student?email=jaishu@gmail.com
    @GetMapping("/student")
    public ResponseEntity<?> getStudentAttendance(
            @RequestParam String email) {

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Student email is required."));
        }

        try {
            String sql = """
                SELECT
                    a.attendance_id AS attendanceId,
                    a.session_id AS sessionId,
                    a.student_id AS studentId,
                    a.status AS status,
                    a.recognition_score AS recognitionScore,
                    a.marked_at AS markedAt
                FROM attendence a
                JOIN student s
                    ON s.student_id = a.student_id
                WHERE LOWER(TRIM(s.email)) = LOWER(TRIM(?))
                ORDER BY a.marked_at DESC
                """;

            List<Map<String, Object>> records =
                    jdbcTemplate.queryForList(sql, email.trim());

            long present = records.stream()
                    .filter(row -> "PRESENT".equalsIgnoreCase(
                            String.valueOf(row.get("status"))))
                    .count();

            long absent = records.stream()
                    .filter(row -> "ABSENT".equalsIgnoreCase(
                            String.valueOf(row.get("status"))))
                    .count();

            Map<String, Object> response = new HashMap<>();
            response.put("email", email.trim());
            response.put("totalRecords", records.size());
            response.put("present", present);
            response.put("absent", absent);
            response.put("attendance", records);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("message", "Unable to fetch attendance history.");
            return ResponseEntity.internalServerError().body(error);
        }
    }
}
