package com.opensuite.controller;

import com.opensuite.dto.ErrorResponse;
import com.opensuite.dto.UploadResponse;
import com.opensuite.exception.InvalidTokenException;
import com.opensuite.model.Job;
import com.opensuite.service.FileUploadService;
import com.opensuite.service.JobService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;

@RestController
@RequestMapping("/api")
@Tag(name = "File Operations", description = "Upload files for processing and download completed results")
public class FileController {

    private final FileUploadService fileUploadService;
    private final JobService jobService;

    public FileController(FileUploadService fileUploadService, JobService jobService) {
        this.fileUploadService = fileUploadService;
        this.jobService = jobService;
    }

    @PostMapping("/upload")
    @Operation(summary = "Upload a file for processing", description = "Uploads a file and creates a new processing job. The returned jobId can be used "
            +
            "to track status via GET /api/status/{jobId}. Maximum file size is 50 MB.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "File uploaded successfully", content = @Content(schema = @Schema(implementation = UploadResponse.class))),
            @ApiResponse(responseCode = "413", description = "File exceeds the 50 MB upload limit", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Unexpected server error", content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<UploadResponse> uploadFile(
            @Parameter(description = "File to upload (max 50 MB)", required = true) @RequestParam("file") MultipartFile file,
            @Parameter(description = "Processing type hint", example = "general") @RequestParam(value = "type", defaultValue = "general") String type) {

        Job job = fileUploadService.uploadFile(file, type);

        return ResponseEntity.ok(new UploadResponse(
                job.getId(),
                job.getStatus().name(),
                "File uploaded successfully"));
    }

    @GetMapping("/download/{token}")
    @Operation(summary = "Download a processed file using a secure token", description = "Downloads the result of a completed processing job. Tokens are single-use and expire "
            +
            "after 10 minutes. Files are automatically deleted from the server after 1 hour.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "File download", content = @Content(mediaType = "application/octet-stream")),
            @ApiResponse(responseCode = "403", description = "Invalid or expired download token", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Output file no longer exists (auto-deleted after 1 hour)", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Unexpected server error", content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<Resource> downloadFile(
            @Parameter(description = "One-time download token from job status response", required = true, example = "dl_token_abc123") @PathVariable String token) {
        Job job = jobService.validateDownloadToken(token);

        if (job.getOutputFilePath() == null) {
            throw new InvalidTokenException("No output file available for this job");
        }

        File file = new File(job.getOutputFilePath());
        if (!file.exists()) {
            throw new InvalidTokenException("Output file no longer exists. Files are deleted after 1 hour.");
        }

        Resource resource = new FileSystemResource(file);

        // Determine the correct filename with the output format extension
        String outputExtension = "";
        String outputName = file.getName();
        int dotIndex = outputName.lastIndexOf('.');
        if (dotIndex > 0) {
            outputExtension = outputName.substring(dotIndex); // e.g. ".pdf"
        }

        String baseName = "converted_file";
        if (job.getOriginalFileName() != null) {
            String origName = job.getOriginalFileName();
            int origDot = origName.lastIndexOf('.');
            if (origDot > 0) {
                baseName = origName.substring(0, origDot);
            } else {
                baseName = origName;
            }
        }
        String filename = baseName + outputExtension;

        // Determine content type from extension
        String contentType = switch (outputExtension.toLowerCase()) {
            case ".pdf" -> "application/pdf";
            case ".txt" -> "text/plain";
            case ".html" -> "text/html";
            case ".jpg", ".jpeg" -> "image/jpeg";
            case ".png" -> "image/png";
            case ".docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case ".xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            default -> "application/octet-stream";
        };

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(resource);
    }
}
