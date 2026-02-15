package com.opensuite.service;

import com.opensuite.dto.JobStatusResponse;
import com.opensuite.exception.ResourceNotFoundException;
import com.opensuite.model.DownloadToken;
import com.opensuite.model.Job;
import com.opensuite.model.JobStatus;
import com.opensuite.repository.DownloadTokenRepository;
import com.opensuite.repository.JobRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class JobService {

    private final JobRepository jobRepository;
    private final DownloadTokenRepository tokenRepository;

    @Value("${opensuite.download.token-expiry-minutes:10}")
    private int tokenExpiryMinutes;

    public JobService(JobRepository jobRepository, DownloadTokenRepository tokenRepository) {
        this.jobRepository = jobRepository;
        this.tokenRepository = tokenRepository;
    }

    public Job getJob(String jobId) {
        return jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + jobId));
    }

    public JobStatusResponse getJobStatus(String jobId) {
        Job job = getJob(jobId);

        JobStatusResponse response = new JobStatusResponse();
        response.setJobId(job.getId());
        response.setStatus(job.getStatus().name());
        response.setProgress(job.getProgress());

        if (job.getStatus() == JobStatus.COMPLETED) {
            String token = generateDownloadToken(job);
            response.setDownloadToken(token);
            response.setMessage("Processing complete. Download available.");
        } else if (job.getStatus() == JobStatus.FAILED) {
            response.setMessage(job.getErrorMessage() != null ? job.getErrorMessage() : "Processing failed.");
        } else if (job.getStatus() == JobStatus.PROCESSING) {
            response.setMessage("Processing in progress...");
        } else {
            response.setMessage("Queued for processing.");
        }

        return response;
    }

    public void updateJobStatus(String jobId, JobStatus status, Integer progress) {
        Job job = getJob(jobId);
        job.setStatus(status);
        if (progress != null) {
            job.setProgress(progress);
        }
        if (status == JobStatus.COMPLETED) {
            job.setCompletedAt(LocalDateTime.now());
            job.setProgress(100);
        }
        jobRepository.save(job);
    }

    public void failJob(String jobId, String errorMessage) {
        Job job = getJob(jobId);
        job.setStatus(JobStatus.FAILED);
        job.setErrorMessage(errorMessage);
        job.setCompletedAt(LocalDateTime.now());
        jobRepository.save(job);
    }

    public void setOutputFile(String jobId, String outputPath) {
        Job job = getJob(jobId);
        job.setOutputFilePath(outputPath);
        jobRepository.save(job);
    }

    private String generateDownloadToken(Job job) {
        String tokenValue = UUID.randomUUID().toString();
        DownloadToken token = new DownloadToken(
                tokenValue,
                job.getId(),
                LocalDateTime.now().plusMinutes(tokenExpiryMinutes));

        tokenRepository.save(token);
        return tokenValue;
    }

    public Job validateDownloadToken(String tokenValue) {
        DownloadToken token = tokenRepository.findByToken(tokenValue)
                .orElseThrow(() -> new ResourceNotFoundException("Invalid download token"));

        if (token.isExpired()) {
            throw new ResourceNotFoundException("Download token has expired");
        }

        if (token.isUsed()) {
            throw new ResourceNotFoundException("Download token has already been used");
        }

        // Mark token as used
        token.setUsed(true);
        tokenRepository.save(token);

        return getJob(token.getJobId());
    }
}
