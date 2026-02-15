package com.opensuite.controller;

import com.opensuite.dto.JobStatusResponse;
import com.opensuite.service.JobService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@Tag(name = "Status", description = "Job status tracking")
public class StatusController {

    private final JobService jobService;

    public StatusController(JobService jobService) {
        this.jobService = jobService;
    }

    @GetMapping("/status/{jobId}")
    @Operation(summary = "Get the status of a processing job")
    public ResponseEntity<JobStatusResponse> getStatus(@PathVariable String jobId) {
        JobStatusResponse status = jobService.getJobStatus(jobId);
        return ResponseEntity.ok(status);
    }
}
