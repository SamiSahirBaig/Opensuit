package com.opensuite.controller;

import com.opensuite.dto.UploadResponse;
import com.opensuite.model.Job;
import com.opensuite.model.SecurityAction;
import com.opensuite.service.FileUploadService;
import com.opensuite.service.SecurityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/security")
@Tag(name = "Security", description = "PDF security operations")
public class SecurityController {

    private final FileUploadService fileUploadService;
    private final SecurityService securityService;

    public SecurityController(FileUploadService fileUploadService, SecurityService securityService) {
        this.fileUploadService = fileUploadService;
        this.securityService = securityService;
    }

    @PostMapping("/{type}")
    @Operation(summary = "Apply security operation to a PDF")
    public ResponseEntity<UploadResponse> applySecurity(
            @PathVariable String type,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) Map<String, String> allParams) {

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
            default -> throw new IllegalArgumentException("Unknown security action: " + type);
        };
    }
}
