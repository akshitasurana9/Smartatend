package com.smartattend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "teachers")
public class Teacher {

    // Teacher ID is entered manually, e.g. TCH001. It is not auto-generated.
    @Id
    @Column(name = "teacher_id", nullable = false, unique = true, length = 50)
    private String teacherId;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "department", nullable = false, length = 100)
    private String department;

    @Column(name = "email", nullable = false, unique = true, length = 150)
    private String email;

    @Column(name = "mobile", nullable = false, length = 20)
    private String mobile;

    // Store a BCrypt hash here, never the plain-text password.
    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    public Teacher() {
    }

    public String getTeacherId() { return teacherId; }
    public void setTeacherId(String teacherId) { this.teacherId = teacherId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getMobile() { return mobile; }
    public void setMobile(String mobile) { this.mobile = mobile; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
}
