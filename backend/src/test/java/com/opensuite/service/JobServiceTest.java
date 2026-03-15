package com.opensuite.service;

import com.opensuite.dto.JobStatusResponse;
import com.opensuite.exception.ResourceNotFoundException;
import com.opensuite.model.DownloadToken;
import com.opensuite.model.Job;
import com.opensuite.model.JobStatus;
import com.opensuite.repository.DownloadTokenRepository;
import com.opensuite.repository.JobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JobServiceTest {

    @Mock
    private JobRepository jobRepository;

    @Mock
    private DownloadTokenRepository tokenRepository;

    @InjectMocks
    private JobService jobService;

    private Job testJob;

    @BeforeEach
    void setUp() {
        testJob = new Job();
        testJob.setId("test-job-id");
        testJob.setStatus(JobStatus.QUEUED);
        testJob.setJobType("convert:pdf_to_word");
        testJob.setInputFilePath("/tmp/input.pdf");
        testJob.setOriginalFileName("document.pdf");
    }

    @Test
    void getJob_existingJob_returnsJob() {
        when(jobRepository.findById("test-job-id")).thenReturn(Optional.of(testJob));

        Job result = jobService.getJob("test-job-id");

        assertEquals("test-job-id", result.getId());
        assertEquals(JobStatus.QUEUED, result.getStatus());
    }

    @Test
    void getJob_nonExistentJob_throwsResourceNotFoundException() {
        when(jobRepository.findById("missing-id")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> jobService.getJob("missing-id"));
    }

    @Test
    void getJobStatus_completedJob_includesDownloadToken() {
        testJob.setStatus(JobStatus.COMPLETED);
        when(jobRepository.findById("test-job-id")).thenReturn(Optional.of(testJob));
        when(tokenRepository.save(any(DownloadToken.class))).thenAnswer(i -> i.getArgument(0));

        JobStatusResponse response = jobService.getJobStatus("test-job-id");

        assertEquals("COMPLETED", response.getStatus());
        assertNotNull(response.getDownloadToken());
        assertEquals("Processing complete. Download available.", response.getMessage());
    }

    @Test
    void getJobStatus_failedJob_includesErrorMessage() {
        testJob.setStatus(JobStatus.FAILED);
        testJob.setErrorMessage("Conversion failed: corrupt file");
        when(jobRepository.findById("test-job-id")).thenReturn(Optional.of(testJob));

        JobStatusResponse response = jobService.getJobStatus("test-job-id");

        assertEquals("FAILED", response.getStatus());
        assertEquals("Conversion failed: corrupt file", response.getMessage());
    }

    @Test
    void getJobStatus_processingJob_showsInProgress() {
        testJob.setStatus(JobStatus.PROCESSING);
        testJob.setProgress(50);
        when(jobRepository.findById("test-job-id")).thenReturn(Optional.of(testJob));

        JobStatusResponse response = jobService.getJobStatus("test-job-id");

        assertEquals("PROCESSING", response.getStatus());
        assertEquals(50, response.getProgress());
        assertEquals("Processing in progress...", response.getMessage());
    }

    @Test
    void getJobStatus_queuedJob_showsQueued() {
        when(jobRepository.findById("test-job-id")).thenReturn(Optional.of(testJob));

        JobStatusResponse response = jobService.getJobStatus("test-job-id");

        assertEquals("QUEUED", response.getStatus());
        assertEquals("Queued for processing.", response.getMessage());
    }

    @Test
    void updateJobStatus_completedStatus_setsCompletedAtAndProgress100() {
        when(jobRepository.findById("test-job-id")).thenReturn(Optional.of(testJob));
        when(jobRepository.save(any(Job.class))).thenAnswer(i -> i.getArgument(0));

        jobService.updateJobStatus("test-job-id", JobStatus.COMPLETED, 80);

        ArgumentCaptor<Job> captor = ArgumentCaptor.forClass(Job.class);
        verify(jobRepository).save(captor.capture());
        Job saved = captor.getValue();

        assertEquals(JobStatus.COMPLETED, saved.getStatus());
        assertEquals(100, saved.getProgress()); // Always 100 for COMPLETED
        assertNotNull(saved.getCompletedAt());
    }

    @Test
    void updateJobStatus_processingStatus_setsProgress() {
        when(jobRepository.findById("test-job-id")).thenReturn(Optional.of(testJob));
        when(jobRepository.save(any(Job.class))).thenAnswer(i -> i.getArgument(0));

        jobService.updateJobStatus("test-job-id", JobStatus.PROCESSING, 50);

        ArgumentCaptor<Job> captor = ArgumentCaptor.forClass(Job.class);
        verify(jobRepository).save(captor.capture());
        assertEquals(50, captor.getValue().getProgress());
    }

    @Test
    void failJob_setsFailedStatusAndErrorMessage() {
        when(jobRepository.findById("test-job-id")).thenReturn(Optional.of(testJob));
        when(jobRepository.save(any(Job.class))).thenAnswer(i -> i.getArgument(0));

        jobService.failJob("test-job-id", "Something went wrong");

        ArgumentCaptor<Job> captor = ArgumentCaptor.forClass(Job.class);
        verify(jobRepository).save(captor.capture());
        Job saved = captor.getValue();

        assertEquals(JobStatus.FAILED, saved.getStatus());
        assertEquals("Something went wrong", saved.getErrorMessage());
        assertNotNull(saved.getCompletedAt());
    }

    @Test
    void setOutputFile_updatesOutputPath() {
        when(jobRepository.findById("test-job-id")).thenReturn(Optional.of(testJob));
        when(jobRepository.save(any(Job.class))).thenAnswer(i -> i.getArgument(0));

        jobService.setOutputFile("test-job-id", "/tmp/output.docx");

        ArgumentCaptor<Job> captor = ArgumentCaptor.forClass(Job.class);
        verify(jobRepository).save(captor.capture());
        assertEquals("/tmp/output.docx", captor.getValue().getOutputFilePath());
    }

    @Test
    void validateDownloadToken_validToken_returnsJob() {
        DownloadToken token = new DownloadToken("valid-token", "test-job-id",
                LocalDateTime.now().plusMinutes(10));
        when(tokenRepository.findByToken("valid-token")).thenReturn(Optional.of(token));
        when(jobRepository.findById("test-job-id")).thenReturn(Optional.of(testJob));
        when(tokenRepository.save(any(DownloadToken.class))).thenAnswer(i -> i.getArgument(0));

        Job result = jobService.validateDownloadToken("valid-token");

        assertEquals("test-job-id", result.getId());
        assertTrue(token.isUsed()); // Token marked as used
    }

    @Test
    void validateDownloadToken_expiredToken_throwsException() {
        DownloadToken token = new DownloadToken("expired-token", "test-job-id",
                LocalDateTime.now().minusMinutes(5)); // Expired 5 min ago
        when(tokenRepository.findByToken("expired-token")).thenReturn(Optional.of(token));

        assertThrows(ResourceNotFoundException.class,
                () -> jobService.validateDownloadToken("expired-token"));
    }

    @Test
    void validateDownloadToken_usedToken_throwsException() {
        DownloadToken token = new DownloadToken("used-token", "test-job-id",
                LocalDateTime.now().plusMinutes(10));
        token.setUsed(true);
        when(tokenRepository.findByToken("used-token")).thenReturn(Optional.of(token));

        assertThrows(ResourceNotFoundException.class,
                () -> jobService.validateDownloadToken("used-token"));
    }

    @Test
    void validateDownloadToken_invalidToken_throwsException() {
        when(tokenRepository.findByToken("nonexistent")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> jobService.validateDownloadToken("nonexistent"));
    }
}
