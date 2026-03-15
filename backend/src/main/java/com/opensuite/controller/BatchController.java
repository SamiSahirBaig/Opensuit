package com.opensuite.controller;

import com.opensuite.dto.ErrorResponse;
import com.opensuite.dto.UploadResponse;
import com.opensuite.model.ConversionType;
import com.opensuite.model.Job;
import com.opensuite.service.BatchProcessingService;
import com.opensuite.service.FileUploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/batch")
@Tag(name = "Batch Processing", description = "Batch file processing — convert multiple files in a single request")
public class BatchController {

    private final FileUploadService fileUploadService;
    private final BatchProcessingService batchService;

    public BatchController(FileUploadService fileUploadService, BatchProcessingService batchService) {
        this.fileUploadService = fileUploadService;
        this.batchService = batchService;
    }

    @PostMapping
    @Operation(summary = "Process batch file conversion", description = "Uploads multiple files and converts them all using the specified conversion type. "
            +
            "Results are packaged together and can be downloaded via the returned jobId.")
    @ApiResponses({
            @ApiResponse(responseCode = "202", description = "Batch job accepted and queued", content = @Content(schema = @Schema(implementation = UploadResponse.class))),
            @ApiResponse(responseCode = "400", description = "Unknown conversion type or no files provided", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "413", description = "Total upload size exceeds the limit", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Unexpected server error", content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<UploadResponse> processBatch(
            @Parameter(description = "Files to process (max 50 MB each)", required = true) @RequestParam("files") MultipartFile[] files,
            @Parameter(description = "Conversion type to apply to all files, e.g. `pdf-to-word`", required = true, example = "pdf-to-word") @RequestParam("type") String type) {

        ConversionType conversionType;
        try {
            conversionType = ConversionType.valueOf(type.toUpperCase().replace("-", "_"));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Unknown conversion type: " + type);
        }

        Job job = fileUploadService.uploadFiles(files, "batch:" + type);
        batchService.processBatch(job.getId(), conversionType);

        return ResponseEntity.accepted().body(new UploadResponse(
                job.getId(),
                "QUEUED",
                "Batch processing started. Check status at /api/status/" + job.getId()));
    }
}
