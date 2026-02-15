package com.opensuite.controller;

import com.opensuite.dto.UploadResponse;
import com.opensuite.model.ConversionType;
import com.opensuite.model.Job;
import com.opensuite.service.BatchProcessingService;
import com.opensuite.service.FileUploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/batch")
@Tag(name = "Batch Processing", description = "Batch file processing operations")
public class BatchController {

    private final FileUploadService fileUploadService;
    private final BatchProcessingService batchService;

    public BatchController(FileUploadService fileUploadService, BatchProcessingService batchService) {
        this.fileUploadService = fileUploadService;
        this.batchService = batchService;
    }

    @PostMapping
    @Operation(summary = "Process batch file conversion")
    public ResponseEntity<UploadResponse> processBatch(
            @RequestParam("files") MultipartFile[] files,
            @RequestParam("type") String type) {

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
