package com.opensuite.controller;

import com.opensuite.dto.ErrorResponse;
import com.opensuite.dto.UploadResponse;
import com.opensuite.model.EditType;
import com.opensuite.model.Job;
import com.opensuite.service.EditingService;
import com.opensuite.service.FileUploadService;
import com.opensuite.service.JobService;
import com.opensuite.service.WebToPdfService;
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

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/edit")
@Tag(name = "Editing", description = "PDF editing operations — merge, split, rotate, reorder pages, add watermarks, compress, page numbers, headers/footers, and annotations")
public class EditController {

    private final FileUploadService fileUploadService;
    private final EditingService editingService;
    private final JobService jobService;
    private final WebToPdfService webToPdfService;

    public EditController(FileUploadService fileUploadService, EditingService editingService,
                          JobService jobService, WebToPdfService webToPdfService) {
        this.fileUploadService = fileUploadService;
        this.editingService = editingService;
        this.jobService = jobService;
        this.webToPdfService = webToPdfService;
    }

    @PostMapping("/{type}")
    @Operation(summary = "Edit a PDF file", description = "Uploads a PDF and starts an asynchronous editing job. " +
            "Supported types: merge, split, rotate, reorder, watermark, compress, page-numbers, header-footer, annotate. "
            +
            "Operation-specific parameters (e.g. rotation angle, watermark text) are passed as additional query/form params.")
    @ApiResponses({
            @ApiResponse(responseCode = "202", description = "Edit job accepted and queued", content = @Content(schema = @Schema(implementation = UploadResponse.class))),
            @ApiResponse(responseCode = "400", description = "Unknown edit type or invalid parameters", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "413", description = "File exceeds the 50 MB upload limit", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "422", description = "File could not be processed", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Unexpected server error", content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<UploadResponse> edit(
            @Parameter(description = "Edit operation type, e.g. `split`, `rotate`, `watermark`", required = true, example = "rotate") @PathVariable String type,
            @Parameter(description = "PDF file to edit (max 50 MB)", required = true) @RequestParam("file") MultipartFile file,
            @Parameter(description = "Additional operation-specific parameters (e.g. `angle=90`, `text=DRAFT`)") @RequestParam(required = false) Map<String, String> allParams) {

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
    @Operation(summary = "Merge multiple PDF files", description = "Uploads multiple PDF files and merges them into a single PDF in the order provided.")
    @ApiResponses({
            @ApiResponse(responseCode = "202", description = "Merge job accepted and queued", content = @Content(schema = @Schema(implementation = UploadResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid files or fewer than 2 files provided", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "413", description = "Total upload size exceeds the limit", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Unexpected server error", content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<UploadResponse> merge(
            @Parameter(description = "PDF files to merge (2 or more, max 50 MB each)", required = true) @RequestParam("files") MultipartFile[] files) {
        Job job = fileUploadService.uploadFiles(files, "edit:merge");
        editingService.processEdit(job.getId(), EditType.MERGE, null);

        return ResponseEntity.accepted().body(new UploadResponse(
                job.getId(),
                "QUEUED",
                "Merge started. Check status at /api/status/" + job.getId()));
    }

    @PostMapping("/web-to-pdf")
    @Operation(summary = "Convert Webpage to PDF", description = "Converts a URL to a PDF file using a headless browser.")
    @ApiResponses({
            @ApiResponse(responseCode = "202", description = "Conversion job accepted and queued", content = @Content(schema = @Schema(implementation = UploadResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid URL", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Unexpected server error", content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<UploadResponse> webToPdf(
            @Parameter(description = "URL to convert", required = true) @RequestParam("url") String url,
            @Parameter(description = "Page size (e.g. A4, Letter)") @RequestParam(value = "pageSize", defaultValue = "A4") String pageSize,
            @Parameter(description = "Include background images") @RequestParam(value = "includeImages", defaultValue = "true") boolean includeImages) {
        
        Job job = jobService.createJob("edit:web_to_pdf");
        webToPdfService.convertUrlToPdf(job.getId(), url, pageSize, includeImages);

        return ResponseEntity.accepted().body(new UploadResponse(
                job.getId(),
                "QUEUED",
                "Web to PDF conversion started. Check status at /api/status/" + job.getId()));
    }

    @PostMapping("/compare")
    @Operation(summary = "Compare two PDF files", description = "Uploads two PDF files to compare.")
    @ApiResponses({
            @ApiResponse(responseCode = "202", description = "Compare job accepted and queued", content = @Content(schema = @Schema(implementation = UploadResponse.class))),
            @ApiResponse(responseCode = "400", description = "Exactly 2 files required", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Unexpected server error", content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<UploadResponse> compare(
            @Parameter(description = "Two PDF files to compare", required = true) @RequestParam("files") MultipartFile[] files) {
        
        if (files == null || files.length != 2) {
            throw new IllegalArgumentException("Exactly two files are required for comparison.");
        }
        
        Job job = fileUploadService.uploadFiles(files, "edit:compare_pdf");
        editingService.processEdit(job.getId(), EditType.COMPARE_PDF, null);

        return ResponseEntity.accepted().body(new UploadResponse(
                job.getId(),
                "QUEUED",
                "Comparison started. Check status at /api/status/" + job.getId()));
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
            case "crop" -> EditType.CROP;
            case "pdf_to_pdfa", "pdf-to-pdfa" -> EditType.PDF_TO_PDFA;
            case "repair_pdf", "repair-pdf" -> EditType.REPAIR_PDF;
            case "web_to_pdf", "web-to-pdf" -> EditType.WEB_TO_PDF;
            case "sign_pdf", "sign-pdf" -> EditType.SIGN_PDF;
            case "compare_pdf", "compare-pdf" -> EditType.COMPARE_PDF;
            case "ai_summarize", "ai-summarize" -> EditType.AI_SUMMARIZE;
            case "ai_translate", "ai-translate" -> EditType.AI_TRANSLATE;
            case "extract_data", "extract-data" -> EditType.EXTRACT_ALL;
            default -> throw new IllegalArgumentException("Unknown edit type: " + type);
        };
    }
}
