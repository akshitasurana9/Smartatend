package com.smartattend.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "sessions")
public class SessionRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "session_id")
    private Integer sessionId;

    @Column(name = "class_id", nullable = false)
    private Integer classId;

    @Column(name = "session_date", nullable = false)
    private LocalDate sessionDate;

    @Column(name = "session_type", nullable = false)
    private String sessionType;

    public SessionRecord() {
    }

    public Integer getSessionId() {
        return sessionId;
    }

    public Integer getClassId() {
        return classId;
    }

    public LocalDate getSessionDate() {
        return sessionDate;
    }

    public String getSessionType() {
        return sessionType;
    }

    public void setClassId(Integer classId) {
        this.classId = classId;
    }

    public void setSessionDate(LocalDate sessionDate) {
        this.sessionDate = sessionDate;
    }

    public void setSessionType(String sessionType) {
        this.sessionType = sessionType;
    }
}