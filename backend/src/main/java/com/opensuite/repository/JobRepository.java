package com.opensuite.repository;

import com.opensuite.model.Job;
import com.opensuite.model.JobStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface JobRepository extends JpaRepository<Job, String> {

    List<Job> findByStatus(JobStatus status);

    List<Job> findByCreatedAtBeforeAndStatusNot(LocalDateTime dateTime, JobStatus status);

    List<Job> findByStatusAndCreatedAtBefore(JobStatus status, LocalDateTime dateTime);
}
