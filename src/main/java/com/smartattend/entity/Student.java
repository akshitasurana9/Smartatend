package com.smartattend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "students")
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "student_class", nullable = false, length = 50)
    private String studentClass;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(name = "photo_path", length = 255)
    private String photoPath;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public Student() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getStudentClass() { return studentClass; }
    public void setStudentClass(String studentClass) {
        this.studentClass = studentClass;
    }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhotoPath() { return photoPath; }
    public void setPhotoPath(String photoPath) {
        this.photoPath = photoPath;
    }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public LocalDateTime getCreatedAt() { return createdAt; }
}