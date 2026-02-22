package com.opensuite.scheduler;

import com.opensuite.model.DownloadToken;
import com.opensuite.model.Job;
import com.opensuite.model.JobStatus;
import com.opensuite.repository.DownloadTokenRepository;
import com.opensuite.repository.JobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FileCleanupSchedulerTest {

    @Mock
    private JobRepository jobRepository;

    @Mock
    private DownloadTokenRepository tokenRepository;

    @InjectMocks
    private FileCleanupScheduler scheduler;

    @TempDir
    Path tempDir;

    @Test
    void cleanupExpiredFiles_deletesOldJobFiles() throws IOException {
        // Create a temp file to simulate a stored job file
        Path oldFile = Files.createFile(tempDir.resolve("old-job-file.pdf"));
        assertTrue(Files.exists(oldFile));

        Job oldJob = new Job();
        oldJob.setId("old-job");
        oldJob.setStatus(JobStatus.COMPLETED);
        oldJob.setInputFilePath(oldFile.toString());
        oldJob.setCreatedAt(LocalDateTime.now().minusHours(2));

        when(jobRepository.findByCreatedAtBeforeAndStatusNot(any(LocalDateTime.class), eq(JobStatus.PROCESSING)))
                .thenReturn(List.of(oldJob));

        scheduler.cleanupExpiredFiles();

        // The file should have been deleted
        assertFalse(Files.exists(oldFile));
        verify(jobRepository).delete(oldJob);
    }

    @Test
    void cleanupExpiredFiles_skipsProcessingJobs() throws IOException {
        // Processing jobs should not be cleaned up — the query excludes them
        when(jobRepository.findByCreatedAtBeforeAndStatusNot(any(LocalDateTime.class), eq(JobStatus.PROCESSING)))
                .thenReturn(List.of());

        scheduler.cleanupExpiredFiles();

        // No deletions should occur
        verify(jobRepository, never()).delete(any(Job.class));
    }

    @Test
    void cleanupExpiredFiles_deletesExpiredTokens() {
        DownloadToken expiredToken = new DownloadToken("expired-t", "job1",
                LocalDateTime.now().minusHours(1));

        when(jobRepository.findByCreatedAtBeforeAndStatusNot(any(LocalDateTime.class), eq(JobStatus.PROCESSING)))
                .thenReturn(List.of());

        scheduler.cleanupExpiredFiles();

        verify(tokenRepository).deleteByExpiresAtBefore(any(LocalDateTime.class));
    }
}
