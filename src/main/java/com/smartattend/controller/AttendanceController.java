
package com.smartattend.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
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
            return ResponseEntity.badRequest().body(
                Map.of("message", "Student email is required.")
            );
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
                JOIN student s ON s.student_id = a.student_id
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
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(
                Map.of("message", "Unable to fetch attendance history.")
            );
        }
    }

    // GET /api/attendance/today
    @GetMapping("/today")
    public ResponseEntity<?> getTodayAttendance() {
        try {
            String sql = """
                SELECT
                    s.id AS studentId,
                    s.name AS name,
                    s.student_class AS studentClass,
                    s.email AS email,
                    COALESCE(
                        (
                            SELECT a.status
                            FROM attendence a
                            JOIN sessions se
                                ON se.session_id = a.session_id
                            WHERE a.student_id = st.student_id
                              AND se.session_date = CURDATE()
                            ORDER BY a.marked_at DESC,
                                     a.attendance_id DESC
                            LIMIT 1
                        ),
                        'Not marked'
                    ) AS status
                FROM students s
                LEFT JOIN student st
                    ON LOWER(TRIM(st.email)) = LOWER(TRIM(s.email))
                ORDER BY s.id
                """;

            List<Map<String, Object>> records =
                    jdbcTemplate.queryForList(sql);

            return ResponseEntity.ok(records);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(
                Map.of("message", "Unable to fetch today's attendance.")
            );
        }
    }

    // POST /api/attendance/mark
    // Request: {"studentId": 4}
    @PostMapping("/mark")
    @Transactional
    public ResponseEntity<?> markPresent(
            @RequestBody Map<String, Object> request) {

        try {
            Object rawId = request.get("studentId");

            if (rawId == null) {
                return ResponseEntity.badRequest().body(
                    Map.of("message", "Student ID is required.")
                );
            }

            long studentId;

            try {
                studentId = Long.parseLong(rawId.toString());
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().body(
                    Map.of("message", "Invalid student ID.")
                );
            }

            // Find registered student.
            List<Map<String, Object>> registered =
                    jdbcTemplate.queryForList(
                        "SELECT id, email FROM students WHERE id = ?",
                        studentId
                    );

            if (registered.isEmpty()) {
                return ResponseEntity.status(404).body(
                    Map.of("message", "Registered student not found.")
                );
            }

            String email = String.valueOf(
                    registered.get(0).get("email")).trim();

            // Map to legacy student table.
            List<Map<String, Object>> legacyStudents =
                    jdbcTemplate.queryForList(
                        """
                        SELECT student_id, class_id
                        FROM student
                        WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
                        """,
                        email
                    );

            if (legacyStudents.isEmpty()) {
                return ResponseEntity.status(409).body(
                    Map.of(
                        "message",
                        "Student is not mapped to the attendance table. " +
                        "Their email must exist in both student tables."
                    )
                );
            }

            Map<String, Object> legacy = legacyStudents.get(0);

            long legacyStudentId = ((Number) legacy.get("student_id"))
                    .longValue();

            Object classValue = legacy.get("class_id");

            if (classValue == null) {
                return ResponseEntity.status(409).body(
                    Map.of("message", "Student has no class assigned.")
                );
            }

            int classId = ((Number) classValue).intValue();

            // Find today's session for the student's class.
            List<Map<String, Object>> sessions =
                    jdbcTemplate.queryForList(
                        """
                        SELECT session_id
                        FROM sessions
                        WHERE class_id = ?
                          AND session_date = CURDATE()
                          AND session_type = 'DAILY'
                        ORDER BY session_id DESC
                        LIMIT 1
                        """,
                        classId
                    );

            int sessionId;

            if (sessions.isEmpty()) {
                jdbcTemplate.update(
                    """
                    INSERT INTO sessions
                        (class_id, session_date, start_time, session_type)
                    VALUES (?, CURDATE(), CURTIME(), 'DAILY')
                    """,
                    classId
                );

                Integer newId = jdbcTemplate.queryForObject(
                    "SELECT LAST_INSERT_ID()",
                    Integer.class
                );

                if (newId == null) {
                    throw new IllegalStateException(
                        "Could not create today's session."
                    );
                }

                sessionId = newId;

            } else {
                sessionId = ((Number) sessions.get(0)
                        .get("session_id")).intValue();
            }

            // Avoid duplicate attendance.
            Integer existing = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM attendence
                WHERE session_id = ? AND student_id = ?
                """,
                Integer.class,
                sessionId,
                legacyStudentId
            );

            if (existing != null && existing > 0) {
                return ResponseEntity.status(409).body(
                    Map.of(
                        "message",
                        "Attendance is already marked for today."
                    )
                );
            }

            // Save attendance in MySQL/MariaDB.
            jdbcTemplate.update(
                """
                INSERT INTO attendence
                    (session_id, student_id, status, marked_at)
                VALUES (?, ?, 'PRESENT', CURRENT_TIMESTAMP)
                """,
                sessionId,
                legacyStudentId
            );

            return ResponseEntity.ok(
                Map.of(
                    "message", "Attendance saved successfully.",
                    "studentId", studentId,
                    "attendanceStudentId", legacyStudentId,
                    "sessionId", sessionId,
                    "status", "PRESENT"
                )
            );

        } catch (Exception e) {
            e.printStackTrace();

            return ResponseEntity.internalServerError().body(
                Map.of(
                    "message", "Could not save attendance.",
                    "error", e.getMessage() == null
                        ? "Unknown error"
                        : e.getMessage()
                )
            );
        }
    }
}