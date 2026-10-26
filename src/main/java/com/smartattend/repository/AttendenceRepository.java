package com.smartattend.repository;

import com.smartattend.entity.Attendence;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AttendenceRepository
        extends JpaRepository<Attendence, Integer> {

    boolean existsBySessionIdAndStudentId(
            Integer sessionId,
            Long studentId
    );
}