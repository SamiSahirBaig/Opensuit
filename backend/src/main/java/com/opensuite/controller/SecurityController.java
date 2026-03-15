package com.opensuite.controller;

import com.opensuite.dto.ErrorResponse;
import com.opensuite.dto.UploadResponse;
import com.opensuite.model.Job;
import com.opensuite.model.SecurityAction;
import com.opensuite.service.FileUploadService;
import com.opensuite.service.SecurityService;
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
@RequestMapping("/api/security")
@Tag(name = "Security", description = "PDF security operations — password-protect, unlock, restrict permissions, remove restrictions, and clean metadata")
public class SecurityController {

    private final FileUploadService fileUploadService;
    private final SecurityService securityService;

    public SecurityController(FileUploadService fileUploadService, SecurityService securityService) {
        this.fileUploadService = fileUploadService;
        this.securityService = securityService;
    }

    @PostMapping("/{type}")
    @Operation(summary = "Apply security operation to a PDF", description = "Uploads a PDF and applies the requested security operation asynchronously. "
            +
            "Supported types: protect (set password), unlock (remove password), restrict (set permissions), " +
            "remove-restrictions, clean-metadata. " +
            "Operation-specific parameters (e.g. `password`, `permissions`) are passed as additional form params.")
    @ApiResponses({
            @ApiResponse(responseCode = "202", description = "Security action accepted and queued", content = @Content(schema = @Schema(implementation = UploadResponse.class))),
            @ApiResponse(responseCode = "400", description = "Unknown security action or missing parameters", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "413", description = "File exceeds the 50 MB upload limit", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "422", description = "File could not be processed", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Unexpected server error", content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<UploadResponse> applySecurity(
            @Parameter(description = "Security operation type", required = true, example = "protect", schema = @Schema(allowableValues = {
                    "protect", "unlock", "restrict", "remove-restrictions",
                    "clean-metadata" })) @PathVariable String type,
            @Parameter(description = "PDF file to secure (max 50 MB)", required = true) @RequestParam("file") MultipartFile file,
            @Parameter(description = "Additional parameters (e.g. `password=secret123` for protect/unlock)") @RequestParam(required = false) Map<String, String> allParams) {

        SecurityAction action = parseSecurityAction(type);
        Job job = fileUploadService.uploadFile(file, "security:" + type);

        Map<String, String> params = new HashMap<>(allParams);
        params.remove("file");
        params.remove("type");

        securityService.processSecurityAction(job.getId(), action, params);

        return ResponseEntity.accepted().body(new UploadResponse(
                job.getId(),
                "QUEUED",
                "Security action started. Check status at /api/status/" + job.getId()));
    }

    private SecurityAction parseSecurityAction(String type) {
        return switch (type.toLowerCase().replace("-", "_")) {
            case "protect" -> SecurityAction.PROTECT;
            case "unlock" -> SecurityAction.UNLOCK;
            case "restrict" -> SecurityAction.RESTRICT;
            case "remove_restrictions", "remove-restrictions" -> SecurityAction.REMOVE_RESTRICTIONS;
            case "clean_metadata", "clean-metadata" -> SecurityAction.CLEAN_METADATA;
            case "redact" -> SecurityAction.REDACT;
            default -> throw new IllegalArgumentException("Unknown security action: " + type);
        };
    }
}
