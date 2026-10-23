
package com.smartattend.controller;

import com.smartattend.entity.Student;
import com.smartattend.repository.StudentRepository;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    private final StudentRepository repository;
    private final BCryptPasswordEncoder encoder =
            new BCryptPasswordEncoder();

    public StudentController(StudentRepository repository) {
        this.repository = repository;
    }

    // GET ALL STUDENTS
    @GetMapping
    public List<Map<String, Object>> getAll() {
        return repository.findAllByOrderByIdDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // GET ONE STUDENT
    @GetMapping("/{id}")
    public ResponseEntity<?> getOne(@PathVariable Long id) {
        return repository.findById(id)
                .<ResponseEntity<?>>map(s ->
                        ResponseEntity.ok(toResponse(s)))
                .orElseGet(() ->
                        error(HttpStatus.NOT_FOUND,
                                "Student not found."));
    }

    // ADD STUDENT FROM TEACHER DASHBOARD
    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<?> addStudent(
            @RequestParam String name,
            @RequestParam String studentClass,
            @RequestParam String email,
            @RequestParam String password,
            @RequestParam(required = false) MultipartFile photo) {

        name = name.trim();
        studentClass = studentClass.trim();
        email = email.trim().toLowerCase(Locale.ROOT);

        if (name.isBlank() || studentClass.isBlank()
                || email.isBlank() || password.isBlank()) {
            return error(HttpStatus.BAD_REQUEST,
                    "Please fill in all required fields.");
        }

        if (password.length() < 8 || password.length() > 72) {
            return error(HttpStatus.BAD_REQUEST,
                    "Password must be between 8 and 72 characters.");
        }

        if (repository.existsByEmailIgnoreCase(email)) {
            return error(HttpStatus.CONFLICT,
                    "This email is already registered.");
        }

        String photoPath = null;

        try {
            if (photo != null && !photo.isEmpty()) {

                if (photo.getSize() > 2 * 1024 * 1024) {
                    return error(HttpStatus.BAD_REQUEST,
                            "Photo must be smaller than 2 MB.");
                }

                String type = photo.getContentType();
                String extension;

                if ("image/jpeg".equals(type)) {
                    extension = ".jpg";
                } else if ("image/png".equals(type)) {
                    extension = ".png";
                } else if ("image/webp".equals(type)) {
                    extension = ".webp";
                } else {
                    return error(HttpStatus.BAD_REQUEST,
                            "Only JPG, PNG or WEBP photos are allowed.");
                }

                Path directory = Paths.get("uploads/student-photos")
                        .toAbsolutePath().normalize();

                Files.createDirectories(directory);

                String filename = UUID.randomUUID() + extension;
                Path destination = directory.resolve(filename).normalize();

                if (!destination.startsWith(directory)) {
                    return error(HttpStatus.BAD_REQUEST,
                            "Invalid photo path.");
                }

                Files.copy(photo.getInputStream(), destination,
                        StandardCopyOption.REPLACE_EXISTING);

                photoPath = "/student-photos/" + filename;
            }

            Student student = new Student();
            student.setName(name);
            student.setStudentClass(studentClass);
            student.setEmail(email);
            student.setPhotoPath(photoPath);
            student.setPasswordHash(encoder.encode(password));

            Student saved = repository.save(student);

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(toResponse(saved));

        } catch (IOException ex) {
            return error(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Could not save the student photo.");
        } catch (DataIntegrityViolationException ex) {
            return error(HttpStatus.CONFLICT,
                    "This email is already registered.");
        }
    }

    // STUDENT LOGIN
    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest request) {

        String email = request.email()
                .trim().toLowerCase(Locale.ROOT);

        Optional<Student> found =
                repository.findByEmailIgnoreCase(email);

        if (found.isEmpty()
                || !encoder.matches(
                        request.password(),
                        found.get().getPasswordHash())) {

            return error(HttpStatus.UNAUTHORIZED,
                    "Invalid email or password.");
        }

        return ResponseEntity.ok(
                Map.of(
                        "message", "Login successful.",
                        "student", toResponse(found.get())
                )
        );
    }

    // DELETE STUDENT
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!repository.existsById(id)) {
            return error(HttpStatus.NOT_FOUND,
                    "Student not found.");
        }

        repository.deleteById(id);

        return ResponseEntity.ok(
                Map.of("message", "Student deleted successfully."));
    }

    // SAFE RESPONSE: NEVER SEND PASSWORD HASH
    private Map<String, Object> toResponse(Student s) {
        Map<String, Object> result = new LinkedHashMap<>();

        result.put("id", s.getId());
        result.put("name", s.getName());
        result.put("studentClass", s.getStudentClass());
        result.put("email", s.getEmail());
        result.put("photoPath",
                s.getPhotoPath() == null ? "" : s.getPhotoPath());
        result.put("createdAt",
                s.getCreatedAt() == null
                        ? "" : s.getCreatedAt().toString());

        return result;
    }

    private ResponseEntity<Map<String, String>> error(
            HttpStatus status, String message) {
        return ResponseEntity.status(status)
                .body(Map.of("message", message));
    }

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password) {
    }
}
