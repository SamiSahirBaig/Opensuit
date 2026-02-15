package com.opensuite.service;

import com.opensuite.model.ConversionType;
import com.opensuite.model.Job;
import com.opensuite.model.JobStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class BatchProcessingService {

    private static final Logger log = LoggerFactory.getLogger(BatchProcessingService.class);

    private final JobService jobService;
    private final ConversionService conversionService;

    public BatchProcessingService(JobService jobService, ConversionService conversionService) {
        this.jobService = jobService;
        this.conversionService = conversionService;
    }

    @Async("taskExecutor")
    public void processBatch(String jobId, ConversionType type) {
        try {
            jobService.updateJobStatus(jobId, JobStatus.PROCESSING, 5);
            Job job = jobService.getJob(jobId);

            // Batch processing delegates to the conversion service for each file
            // The job's input path is a directory containing multiple files
            conversionService.processConversion(jobId, type);

            log.info("Batch processing completed for job {}", jobId);
        } catch (Exception e) {
            log.error("Batch processing failed for job {}: {}", jobId, e.getMessage(), e);
            jobService.failJob(jobId, "Batch processing failed: " + e.getMessage());
        }
    }
}
