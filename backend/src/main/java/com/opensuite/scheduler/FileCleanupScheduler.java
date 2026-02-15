package com.opensuite.scheduler;

import com.opensuite.model.Job;
import com.opensuite.model.JobStatus;
import com.opensuite.repository.DownloadTokenRepository;
import com.opensuite.repository.JobRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.LocalDateTime;
import java.util.List;

@Component
public class FileCleanupScheduler {

    private static final Logger log = LoggerFactory.getLogger(FileCleanupScheduler.class);

    private final JobRepository jobRepository;
    private final DownloadTokenRepository tokenRepository;

    public FileCleanupScheduler(JobRepository jobRepository, DownloadTokenRepository tokenRepository) {
        this.jobRepository = jobRepository;
        this.tokenRepository = tokenRepository;
    }

    /**
     * Runs every 10 minutes. Deletes files older than 1 hour and cleans up expired
     * tokens.
     */
    @Scheduled(fixedRate = 600000) // 10 minutes
    @Transactional
    public void cleanupExpiredFiles() {
        log.info("Starting file cleanup...");

        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        int filesDeleted = 0;
        int jobsCleaned = 0;

        // Find old jobs (created more than 1 hour ago) that are not failed
        List<Job> expiredJobs = jobRepository.findByCreatedAtBeforeAndStatusNot(oneHourAgo, JobStatus.FAILED);

        for (Job job : expiredJobs) {
            try {
                // Delete input file
                if (job.getInputFilePath() != null) {
                    deleteFileOrDirectory(Paths.get(job.getInputFilePath()));
                    filesDeleted++;
                }

                // Delete output file
                if (job.getOutputFilePath() != null) {
                    deleteFileOrDirectory(Paths.get(job.getOutputFilePath()));
                    filesDeleted++;
                }

                // Update job status
                job.setStatus(JobStatus.FAILED);
                job.setErrorMessage("Files expired and cleaned up");
                jobRepository.save(job);
                jobsCleaned++;

            } catch (Exception e) {
                log.error("Failed to cleanup job {}: {}", job.getId(), e.getMessage());
            }
        }

        // Clean up expired download tokens
        tokenRepository.deleteByExpiresAtBefore(LocalDateTime.now());

        log.info("Cleanup complete: {} files deleted, {} jobs cleaned", filesDeleted, jobsCleaned);
    }

    private void deleteFileOrDirectory(Path path) {
        try {
            if (Files.isDirectory(path)) {
                Files.walkFileTree(path, new SimpleFileVisitor<>() {
                    @Override
                    public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                        Files.deleteIfExists(file);
                        return FileVisitResult.CONTINUE;
                    }

                    @Override
                    public FileVisitResult postVisitDirectory(Path dir, IOException exc) throws IOException {
                        Files.deleteIfExists(dir);
                        return FileVisitResult.CONTINUE;
                    }
                });
            } else {
                Files.deleteIfExists(path);
            }
        } catch (IOException e) {
            log.warn("Could not delete path {}: {}", path, e.getMessage());
        }
    }
}
