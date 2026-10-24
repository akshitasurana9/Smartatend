
package com.smartattend.repository;

import com.smartattend.entity.SessionRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface SessionRepository
        extends JpaRepository<SessionRecord, Integer> {

    @Query(value = """
        SELECT s.session_id
        FROM sessions s
        JOIN classes c ON c.class_id = s.class_id
        WHERE LOWER(TRIM(c.class_name)) =
              LOWER(TRIM(:studentClass))
          AND s.session_date = CURRENT_DATE
          AND s.session_type = 'DAILY'
        ORDER BY s.session_id DESC
        LIMIT 1
        """, nativeQuery = true)
    Optional<Integer> findTodaySessionId(
            @Param("studentClass") String studentClass
    );
}
