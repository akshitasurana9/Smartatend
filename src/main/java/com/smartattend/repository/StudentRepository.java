package com.smartattend.repository;

import com.smartattend.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudentRepository
        extends JpaRepository<Student, Long> {

    boolean existsByEmailIgnoreCase(String email);

    Optional<Student> findByEmailIgnoreCase(String email);

    List<Student> findAllByOrderByIdDesc();
}