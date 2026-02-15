package com.opensuite.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * OCR Service - Placeholder for Tesseract/OCR integration.
 * 
 * To implement full OCR support:
 * 1. Install Tesseract OCR on the system
 * 2. Add tess4j dependency to pom.xml
 * 3. Implement processOCR method using Tesseract API
 */
@Service
public class OCRService {

    private static final Logger log = LoggerFactory.getLogger(OCRService.class);

    /**
     * Process OCR on a PDF file.
     * Currently a placeholder - requires Tesseract installation.
     */
    public String processOCR(String inputPath, String language) {
        log.warn("OCR processing requested but Tesseract is not configured. " +
                "Install Tesseract and configure tess4j for full OCR support.");
        // Return input path as-is (no-op placeholder)
        return inputPath;
    }
}
