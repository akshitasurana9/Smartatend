
package com.smartattend.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attendance")
@CrossOrigin(origins = "http://localhost:8080")
public class AttendanceController {

    private static final ZoneId INDIA_ZONE =
            ZoneId.of("Asia/Kolkata");

    private final JdbcTemplate jdbcTemplate;

    public AttendanceController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // GET /api/attendance/student?email=pooja@gmail.com
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
                    JOIN students s ON s.id = a.student_id
                    WHERE LOWER(TRIM(s.email)) = LOWER(TRIM(?))
                    ORDER BY a.marked_at DESC, a.attendance_id DESC
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
                    Map.of("message",
                            "Unable to fetch student attendance.")
            );
        }
    }

    // GET /api/attendance/today
    @GetMapping("/today")
    public ResponseEntity<?> getTodayAttendance() {

        try {
            LocalDate today = LocalDate.now(INDIA_ZONE);

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
                                WHERE a.student_id = s.id
                                  AND se.session_date = ?
                                  AND se.session_type = 'DAILY'
                                ORDER BY a.marked_at DESC,
                                         a.attendance_id DESC
                                LIMIT 1
                            ),
                            'Not marked'
                        ) AS status
                    FROM students s
                    ORDER BY s.id
                    """;

            return ResponseEntity.ok(
                    jdbcTemplate.queryForList(
                            sql,
                            java.sql.Date.valueOf(today)
                    )
            );

        } catch (Exception e) {
            e.printStackTrace();

            return ResponseEntity.internalServerError().body(
                    Map.of("message",
                            "Unable to fetch today's attendance.")
            );
        }
    }

    // GET /api/attendance/history is handled by
    // AttendanceHistoryController.java.

    // POST /api/attendance/mark
    // Request body: {"studentId": 7}
    @PostMapping("/mark")
    @Transactional
    public ResponseEntity<?> markPresent(
            @RequestBody Map<String, Object> request) {

        try {
            LocalDate today = LocalDate.now(INDIA_ZONE);

            // College attendance is Monday to Saturday only.
            if (today.getDayOfWeek() == DayOfWeek.SUNDAY) {
                return ResponseEntity.status(403).body(
                        Map.of(
                                "message",
                                "Attendance is available Monday to Saturday only."
                        )
                );
            }

            Object rawId = request.get("studentId");

            if (rawId == null) {
                return ResponseEntity.badRequest().body(
                        Map.of("message", "Student ID is required.")
                );
            }

            long studentId;

            try {
                studentId = Long.parseLong(rawId.toString());
                if (studentId <= 0) {
                    throw new NumberFormatException();
                }
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().body(
                        Map.of("message", "Invalid student ID.")
                );
            }

            List<Map<String, Object>> registered =
                    jdbcTemplate.queryForList(
                            """
                            SELECT id, email, class_id
                            FROM students
                            WHERE id = ?
                            """,
                            studentId
                    );

            if (registered.isEmpty()) {
                return ResponseEntity.status(404).body(
                        Map.of("message",
                                "Registered student not found.")
                );
            }

            Map<String, Object> student = registered.get(0);
            Object classValue = student.get("class_id");

            if (classValue == null) {
                return ResponseEntity.status(409).body(
                        Map.of("message",
                                "Student has no class assigned.")
                );
            }

            int classId = ((Number) classValue).intValue();

            // Reuse today's DAILY session for this class, if present.
            List<Map<String, Object>> sessions =
                    jdbcTemplate.queryForList(
                            """
                            SELECT session_id
                            FROM sessions
                            WHERE class_id = ?
                              AND session_date = ?
                              AND session_type = 'DAILY'
                            ORDER BY session_id DESC
                            LIMIT 1
                            """,
                            classId,
                            java.sql.Date.valueOf(today)
                    );

            int sessionId;

            if (sessions.isEmpty()) {
                LocalDateTime now = LocalDateTime.now(INDIA_ZONE);

                jdbcTemplate.update(
                        """
                        INSERT INTO sessions
                            (class_id, session_date, start_time,
                             session_type)
                        VALUES (?, ?, ?, 'DAILY')
                        """,
                        classId,
                        java.sql.Date.valueOf(today),
                        java.sql.Time.valueOf(now.toLocalTime())
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

            // Avoid marking the same student twice in one session.
            Integer existing = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM attendence
                    WHERE session_id = ? AND student_id = ?
                    """,
                    Integer.class,
                    sessionId,
                    studentId
            );

            if (existing != null && existing > 0) {
                return ResponseEntity.status(409).body(
                        Map.of(
                                "message",
                                "Attendance is already marked for today.",
                                "studentId", studentId,
                                "sessionId", sessionId
                        )
                );
            }

            LocalDateTime now = LocalDateTime.now(INDIA_ZONE);

            jdbcTemplate.update(
                    """
                    INSERT INTO attendence
                        (session_id, student_id, status, marked_at)
                    VALUES (?, ?, 'PRESENT', ?)
                    """,
                    sessionId,
                    studentId,
                    java.sql.Timestamp.valueOf(now)
            );

            return ResponseEntity.ok(
                    Map.of(
                            "message", "Attendance saved successfully.",
                            "studentId", studentId,
                            "sessionId", sessionId,
                            "status", "PRESENT",
                            "date", today.toString()
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
