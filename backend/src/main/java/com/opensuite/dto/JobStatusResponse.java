package com.opensuite.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Detailed status of a processing job including progress and download information")
public class JobStatusResponse {

    @Schema(description = "Unique job identifier (UUID)", example = "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
    private String jobId;

    @Schema(description = "Current job status", example = "COMPLETED", allowableValues = { "QUEUED", "PROCESSING",
            "COMPLETED", "FAILED" })
    private String status;

    @Schema(description = "Processing progress percentage (0–100)", example = "100", minimum = "0", maximum = "100")
    private int progress;

    @Schema(description = "One-time download token, available when status is COMPLETED. Expires after 10 minutes.", example = "dl_token_abc123", nullable = true)
    private String downloadToken;

    @Schema(description = "Human-readable status message", example = "Processing completed successfully", nullable = true)
    private String message;

    @Schema(description = "Error details when status is FAILED", example = "Unsupported file format", nullable = true)
    private String errorMessage;

    @Schema(description = "Original file name as uploaded by the user", nullable = true)
    private String originalFileName;

    @Schema(description = "Original file size in bytes (for compression operations)", nullable = true)
    private Long originalSizeBytes;

    @Schema(description = "Compressed file size in bytes (for compression operations)", nullable = true)
    private Long compressedSizeBytes;

    public JobStatusResponse() {
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

    public int getProgress() {
        return progress;
    }

    public void setProgress(int progress) {
        this.progress = progress;
    }

    public String getDownloadToken() {
        return downloadToken;
    }

    public void setDownloadToken(String downloadToken) {
        this.downloadToken = downloadToken;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public String getOriginalFileName() {
        return originalFileName;
    }

    public void setOriginalFileName(String originalFileName) {
        this.originalFileName = originalFileName;
    }

    public Long getOriginalSizeBytes() {
        return originalSizeBytes;
    }

    public void setOriginalSizeBytes(Long originalSizeBytes) {
        this.originalSizeBytes = originalSizeBytes;
    }

    public Long getCompressedSizeBytes() {
        return compressedSizeBytes;
    }

    public void setCompressedSizeBytes(Long compressedSizeBytes) {
        this.compressedSizeBytes = compressedSizeBytes;
    }
}
