package com.opensuite.controller;

import com.opensuite.service.AIService;
import com.opensuite.service.ExtractionService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/premium")
@Tag(name = "Premium AI Tools", description = "Endpoints for AI Summarizer, Translate, and PDF Data Extraction")
@CrossOrigin(origins = "*", maxAge = 3600)
public class PremiumController {

    private final AIService aiService;
    private final ExtractionService extractionService;

    public PremiumController(AIService aiService, ExtractionService extractionService) {
        this.aiService = aiService;
        this.extractionService = extractionService;
    }

    @PostMapping("/summarize")
    @Operation(summary = "Summarize PDF using AI")
    public ResponseEntity<Map<String, String>> summarizePdf(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "length", defaultValue = "MEDIUM") String lengthStr,
            @RequestParam(value = "format", defaultValue = "PARAGRAPH") String format) {
        
        try {
            // Setup parameters
            AIService.SummaryLength length;
            try {
                length = AIService.SummaryLength.valueOf(lengthStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                length = AIService.SummaryLength.MEDIUM;
            }
            boolean isBulletPoints = "BULLETS".equalsIgnoreCase(format);

            // Extract context first
            String pdfText = extractionService.extractText(file.getBytes());
            if (pdfText == null || pdfText.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Could not extract readable text from PDF for summarization."));
            }

            // Summarize
            String summary = aiService.summarizePDF(pdfText, length, isBulletPoints);
            return ResponseEntity.ok(Map.of("summary", summary));

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to process PDF text: " + e.getMessage()));
        } catch (Exception e) {
             return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "AI Service Error: " + e.getMessage()));
        }
    }

    @PostMapping("/translate")
    @Operation(summary = "Translate PDF text using AI")
    public ResponseEntity<Map<String, String>> translatePdf(
            @RequestParam("file") MultipartFile file,
            @RequestParam("targetLanguage") String targetLanguage,
            @RequestParam(value = "preserveFormatting", defaultValue = "true") boolean preserveFormatting) {

        try {
            String pdfText = extractionService.extractText(file.getBytes());
            if (pdfText == null || pdfText.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Could not extract readable text from PDF for translation."));
            }

            String translation = aiService.translateText(pdfText, targetLanguage, preserveFormatting);
            return ResponseEntity.ok(Map.of("translation", translation));

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to process PDF text: " + e.getMessage()));
        } catch (Exception e) {
             return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "AI Service Error: " + e.getMessage()));
        }
    }

    @PostMapping("/extract/images")
    @Operation(summary = "Extract all images into a Zip archive")
    public ResponseEntity<byte[]> extractImages(@RequestParam("file") MultipartFile file) {
        try {
            byte[] zipData = extractionService.extractImagesAsZip(file.getBytes());
            if (zipData == null || zipData.length == 0) {
                 return ResponseEntity.noContent().build();
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.valueOf("application/zip"));
            headers.setContentDispositionFormData("attachment", "extracted_images.zip");
            return new ResponseEntity<>(zipData, headers, HttpStatus.OK);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/extract/tables")
    @Operation(summary = "Extract all tables to CSV files in a Zip archive")
    public ResponseEntity<byte[]> extractTables(@RequestParam("file") MultipartFile file) {
        try {
            byte[] zipData = extractionService.extractTablesAsCsvZip(file.getBytes());
            if (zipData == null || zipData.length == 0) {
                 return ResponseEntity.noContent().build();
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.valueOf("application/zip"));
            headers.setContentDispositionFormData("attachment", "extracted_tables.zip");
            return new ResponseEntity<>(zipData, headers, HttpStatus.OK);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @PostMapping("/extract/links")
    @Operation(summary = "Extract all URI annotations/hyperlinks")
    public ResponseEntity<Map<String, List<String>>> extractLinks(@RequestParam("file") MultipartFile file) {
        try {
            List<String> links = extractionService.extractLinks(file.getBytes());
            return ResponseEntity.ok(Map.of("links", links));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/extract/text")
    @Operation(summary = "Extract raw text")
    public ResponseEntity<Map<String, String>> extractRawText(@RequestParam("file") MultipartFile file) {
        try {
            String text = extractionService.extractText(file.getBytes());
            return ResponseEntity.ok(Map.of("text", text));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
