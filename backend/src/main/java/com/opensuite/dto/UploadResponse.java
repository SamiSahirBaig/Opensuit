package com.opensuite.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Response returned after uploading a file or starting a processing job")
public class UploadResponse {

    @Schema(description = "Unique job identifier (UUID)", example = "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
    private String jobId;

    @Schema(description = "Current job status", example = "QUEUED", allowableValues = { "QUEUED", "PROCESSING",
            "COMPLETED", "FAILED" })
    private String status;

    @Schema(description = "Human-readable status message", example = "Conversion started. Check status at /api/status/a1b2c3d4-e5f6-7890-abcd-ef1234567890")
    private String message;

    public UploadResponse() {
    }

    public UploadResponse(String jobId, String status, String message) {
        this.jobId = jobId;
        this.status = status;
        this.message = message;
    }

    public String getJobId() {
        return jobId;
    }

    public void setJobId(String jobId) {
        this.jobId = jobId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
