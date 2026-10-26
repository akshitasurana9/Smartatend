
package com.smartattend.controller;

import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.sql.Date;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attendance")
@CrossOrigin(origins = "*")
public class AttendanceHistoryController {

    private final JdbcTemplate jdbcTemplate;

    public AttendanceHistoryController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/history")
    public ResponseEntity<?> getAttendanceHistory(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false) String search) {

        try {
            // Validate dates supplied by the frontend.
            LocalDate from = parseDate(fromDate);
            LocalDate to = parseDate(toDate);

            if (from != null && to != null && from.isAfter(to)) {
                return ResponseEntity.badRequest().body(
                    Map.of("error",
                        "From date cannot be later than to date.")
                );
            }

            StringBuilder sql = new StringBuilder("""
                SELECT
                    a.attendance_id AS attendanceId,
                    st.name AS studentName,
                    st.roll_number AS rollNumber,
                    c.class_name AS className,
                    s.session_date AS attendanceDate,
                    a.status AS status,
                    a.marked_at AS markedAt
                FROM attendence a
                INNER JOIN sessions s
                    ON s.session_id = a.session_id
                INNER JOIN students st
    ON st.id = a.student_id
INNER JOIN classes c
    ON c.class_id = st.class_id
                WHERE 1 = 1
                """);

            List<Object> params = new ArrayList<>();

            if (from != null) {
                sql.append(" AND s.session_date >= ?");
                params.add(Date.valueOf(from));
            }

            if (to != null) {
                sql.append(" AND s.session_date <= ?");
                params.add(Date.valueOf(to));
            }

            if (search != null && !search.isBlank()) {
                sql.append("""
                    AND (
                        LOWER(st.name) LIKE LOWER(?)
                        OR LOWER(st.roll_number) LIKE LOWER(?)
                        OR LOWER(c.class_name) LIKE LOWER(?)
                        OR LOWER(COALESCE(st.email, '')) LIKE LOWER(?)
                    )
                    """);

                String keyword = "%" + search.trim() + "%";

                params.add(keyword);
                params.add(keyword);
                params.add(keyword);
                params.add(keyword);
            }

            sql.append(
                " ORDER BY s.session_date DESC, a.marked_at DESC, " +
                "a.attendance_id DESC"
            );

            List<Map<String, Object>> records =
                jdbcTemplate.queryForList(sql.toString(), params.toArray());

            return ResponseEntity.ok(records);

        } catch (DateTimeParseException ex) {
            return ResponseEntity.badRequest().body(
                Map.of(
                    "error",
                    "Invalid date. Use the YYYY-MM-DD format."
                )
            );

        } catch (DataAccessException ex) {
            // Database details are logged by the application framework.
            Map<String, String> error = new LinkedHashMap<>();
            error.put(
                "error",
                "Unable to load attendance. Check the database connection " +
                "and attendance table structure."
            );

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                 .body(error);
        }
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return LocalDate.parse(value.trim());
    }
}
