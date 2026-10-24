package com.smartattend.controller;

import com.smartattend.Services.AuthenticationService;
import com.smartattend.entity.Teacher;
import com.smartattend.repository.TeacherRepository;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/teachers")
public class TeacherController {

    private final TeacherRepository teacherRepository;
    private final AuthenticationService authenticationService;

    public TeacherController(
            TeacherRepository teacherRepository,
            AuthenticationService authenticationService) {

        this.teacherRepository = teacherRepository;
        this.authenticationService = authenticationService;
    }

    // =========================
    // TEACHER REGISTRATION
    // =========================
    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> registerTeacher(
            @RequestBody Map<String, String> request) {

        String teacherId = clean(request.get("teacherId"));
        String name = clean(request.get("name"));
        String department = clean(request.get("department"));
        String email = clean(request.get("email")).toLowerCase();
        String mobile = clean(request.get("mobile"));
        String rawPassword = request.get("password");

        if (teacherId.isBlank()
                || name.isBlank()
                || department.isBlank()
                || email.isBlank()
                || mobile.isBlank()
                || rawPassword == null
                || rawPassword.isBlank()) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Please fill in all required fields."
                    ));
        }

        if (teacherId.length() > 50) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Teacher ID must be 50 characters or fewer."
                    ));
        }

        if (!mobile.matches("[0-9]{10}")) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Enter a valid 10-digit mobile number."
                    ));
        }

        if (rawPassword.length() < 8) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Password must contain at least 8 characters."
                    ));
        }

        if (teacherRepository.existsByTeacherId(teacherId)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "message",
                            "This Teacher ID is already registered."
                    ));
        }

        if (teacherRepository.existsByEmail(email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "message",
                            "This email is already registered."
                    ));
        }

        Teacher teacher = new Teacher();
        teacher.setTeacherId(teacherId);
        teacher.setName(name);
        teacher.setDepartment(department);
        teacher.setEmail(email);
        teacher.setMobile(mobile);
        teacher.setPasswordHash(
                authenticationService.hashPassword(rawPassword)
        );

        try {
            teacherRepository.save(teacher);

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of(
                            "message",
                            "Teacher registered successfully. Please log in."
                    ));

        } catch (DataIntegrityViolationException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "message",
                            "Teacher ID or email is already registered."
                    ));
        }
    }

    // =========================
    // TEACHER LOGIN
    // =========================
    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> loginTeacher(
            @RequestBody Map<String, String> request) {

        String email = clean(request.get("email")).toLowerCase();
        String password = request.get("password");

        if (email.isBlank()
                || password == null
                || password.isBlank()) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Please enter email and password."
                    ));
        }

        Teacher teacher = teacherRepository.findByEmail(email)
                .orElse(null);

        if (teacher == null
                || !authenticationService.matchesPassword(
                        password,
                        teacher.getPasswordHash())) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "message",
                            "Invalid email or password."
                    ));
        }

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Login successful!",
                        "teacherId",
                        teacher.getTeacherId(),
                        "name",
                        teacher.getName(),
                        "email",
                        teacher.getEmail()
                )
        );
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }
}