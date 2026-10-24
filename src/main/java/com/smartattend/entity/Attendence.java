
package com.smartattend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "attendence",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_attendence_session_student",
            columnNames = {"session_id", "student_id"}
        )
    }
)
public class Attendence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "attendance_id")
    private Integer attendanceId;

    @Column(name = "session_id", nullable = false)
    private Integer sessionId;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private AttendanceStatus status;

    @Column(name = "recognition_score", precision = 6, scale = 5)
    private BigDecimal recognitionScore;

    @Column(name = "marked_at")
    private LocalDateTime markedAt;

    public Attendence() {
    }

    public Integer getAttendanceId() {
        return attendanceId;
    }

    public Integer getSessionId() {
        return sessionId;
    }

    public void setSessionId(Integer sessionId) {
        this.sessionId = sessionId;
    }

    public Long getStudentId() {
        return studentId;
    }

    public void setStudentId(Long studentId) {
        this.studentId = studentId;
    }

    public AttendanceStatus getStatus() {
        return status;
    }

    public void setStatus(AttendanceStatus status) {
        this.status = status;
    }

    public BigDecimal getRecognitionScore() {
        return recognitionScore;
    }

    public void setRecognitionScore(BigDecimal recognitionScore) {
        this.recognitionScore = recognitionScore;
    }

    public LocalDateTime getMarkedAt() {
        return markedAt;
    }

    public void setMarkedAt(LocalDateTime markedAt) {
        this.markedAt = markedAt;
    }

    public enum AttendanceStatus {
        PRESENT,
        ABSENT,
        LATE
    }
}
