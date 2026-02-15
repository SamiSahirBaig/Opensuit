package com.opensuite.controller;

import com.opensuite.dto.UploadResponse;
import com.opensuite.model.EditType;
import com.opensuite.model.Job;
import com.opensuite.service.EditingService;
import com.opensuite.service.FileUploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/edit")
@Tag(name = "Editing", description = "PDF editing operations")
public class EditController {

    private final FileUploadService fileUploadService;
    private final EditingService editingService;

    public EditController(FileUploadService fileUploadService, EditingService editingService) {
        this.fileUploadService = fileUploadService;
        this.editingService = editingService;
    }

    @PostMapping("/{type}")
    @Operation(summary = "Edit a PDF file")
    public ResponseEntity<UploadResponse> edit(
            @PathVariable String type,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) Map<String, String> allParams) {

        EditType editType = parseEditType(type);

        Job job;
        if (editType == EditType.MERGE) {
            // For merge, we expect the file to be a collection in a batch dir
            job = fileUploadService.uploadFile(file, "edit:" + type);
        } else {
            job = fileUploadService.uploadFile(file, "edit:" + type);
        }

        // Remove standard params, keep only operation-specific ones
        Map<String, String> params = new HashMap<>(allParams);
        params.remove("file");
        params.remove("type");

        editingService.processEdit(job.getId(), editType, params);

        return ResponseEntity.accepted().body(new UploadResponse(
                job.getId(),
                "QUEUED",
                "Edit started. Check status at /api/status/" + job.getId()));
    }

    @PostMapping("/merge")
    @Operation(summary = "Merge multiple PDF files")
    public ResponseEntity<UploadResponse> merge(@RequestParam("files") MultipartFile[] files) {
        Job job = fileUploadService.uploadFiles(files, "edit:merge");
        editingService.processEdit(job.getId(), EditType.MERGE, null);

        return ResponseEntity.accepted().body(new UploadResponse(
                job.getId(),
                "QUEUED",
                "Merge started. Check status at /api/status/" + job.getId()));
    }

    private EditType parseEditType(String type) {
        return switch (type.toLowerCase().replace("-", "_")) {
            case "merge" -> EditType.MERGE;
            case "split" -> EditType.SPLIT;
            case "rotate" -> EditType.ROTATE;
            case "reorder" -> EditType.REORDER;
            case "watermark" -> EditType.WATERMARK;
            case "compress" -> EditType.COMPRESS;
            case "page_numbers", "page-numbers" -> EditType.PAGE_NUMBERS;
            case "header_footer", "header-footer" -> EditType.HEADER_FOOTER;
            case "annotate" -> EditType.ANNOTATE;
            default -> throw new IllegalArgumentException("Unknown edit type: " + type);
        };
    }
}
