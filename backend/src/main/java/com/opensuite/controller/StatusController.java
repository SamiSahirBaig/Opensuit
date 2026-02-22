package com.opensuite.controller;

import com.opensuite.dto.ErrorResponse;
import com.opensuite.dto.JobStatusResponse;
import com.opensuite.service.JobService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@Tag(name = "Status", description = "Job status tracking — poll to check progress and retrieve download tokens")
public class StatusController {

    private final JobService jobService;

    public StatusController(JobService jobService) {
        this.jobService = jobService;
    }

    @GetMapping("/status/{jobId}")
    @Operation(summary = "Get the status of a processing job", description = "Returns the current status, progress percentage, and download token (when completed) for a job. "
            +
            "Poll this endpoint to track an asynchronous conversion, editing, or security job.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Job status retrieved", content = @Content(schema = @Schema(implementation = JobStatusResponse.class))),
            @ApiResponse(responseCode = "404", description = "Job not found", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Unexpected server error", content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<JobStatusResponse> getStatus(
            @Parameter(description = "Job ID returned from an upload, conversion, or editing request", required = true, example = "a1b2c3d4-e5f6-7890-abcd-ef1234567890") @PathVariable String jobId) {
        JobStatusResponse status = jobService.getJobStatus(jobId);
        return ResponseEntity.ok(status);
    }
}
