package com.opensuite.service;

import com.opensuite.exception.FileProcessingException;
import com.opensuite.model.Job;
import com.opensuite.model.JobStatus;
import com.opensuite.model.SecurityAction;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentInformation;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.encryption.AccessPermission;
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException;
import org.apache.pdfbox.pdmodel.encryption.StandardProtectionPolicy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.awt.*;
import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;

@Service
public class SecurityService {

    private static final Logger log = LoggerFactory.getLogger(SecurityService.class);

    private final JobService jobService;
    private final FileUploadService fileUploadService;

    public SecurityService(JobService jobService, FileUploadService fileUploadService) {
        this.jobService = jobService;
        this.fileUploadService = fileUploadService;
    }

    @Async("taskExecutor")
    public void processSecurityAction(String jobId, SecurityAction action, Map<String, String> params) {
        try {
            jobService.updateJobStatus(jobId, JobStatus.PROCESSING, 10);
            Job job = jobService.getJob(jobId);

            String outputPath = switch (action) {
                case PROTECT -> protectPdf(job, params);
                case UNLOCK -> unlockPdf(job, params);
                case RESTRICT -> restrictPdf(job, params);
                case REMOVE_RESTRICTIONS -> removeRestrictions(job, params);
                case CLEAN_METADATA -> cleanMetadata(job);
                case REDACT -> redactPdf(job, params);
            };

            jobService.setOutputFile(jobId, outputPath);
            jobService.updateJobStatus(jobId, JobStatus.COMPLETED, 100);
            log.info("Security action completed: {} for job {}", action, jobId);

        } catch (InvalidPasswordException e) {
            log.error("Wrong password for job {}: {}", jobId, e.getMessage());
            jobService.failJob(jobId, "Incorrect password. Please provide the correct password.");
        } catch (Exception e) {
            log.error("Security action failed for job {}: {}", jobId, e.getMessage(), e);
            jobService.failJob(jobId, "Security action failed: " + e.getMessage());
        }
    }

    private String protectPdf(Job job, Map<String, String> params) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        // Parse passwords — support separate user and owner passwords
        String userPassword = params != null ? params.getOrDefault("userPassword",
                params.getOrDefault("password", "password")) : "password";
        String ownerPassword = params != null ? params.getOrDefault("ownerPassword", userPassword) : userPassword;

        // Parse encryption level
        int encryptionBits = 128;
        if (params != null && params.containsKey("encryptionBits")) {
            try {
                int bits = Integer.parseInt(params.get("encryptionBits"));
                if (bits == 256) encryptionBits = 256;
            } catch (NumberFormatException ignored) {}
        }

        // Parse permissions
        AccessPermission ap = new AccessPermission();
        if (params != null) {
            ap.setCanPrint(!"false".equalsIgnoreCase(params.get("allowPrinting")));
            ap.setCanExtractContent(!"false".equalsIgnoreCase(params.get("allowCopying")));
            ap.setCanModify(!"false".equalsIgnoreCase(params.get("allowEditing")));
            ap.setCanFillInForm(!"false".equalsIgnoreCase(params.get("allowFormFilling")));
            ap.setCanModifyAnnotations(!"false".equalsIgnoreCase(params.get("allowAnnotations")));
        }

        File inputFile = new File(job.getInputFilePath());
        try (PDDocument document = Loader.loadPDF(inputFile)) {
            StandardProtectionPolicy policy = new StandardProtectionPolicy(ownerPassword, userPassword, ap);
            policy.setEncryptionKeyLength(encryptionBits);
            document.protect(policy);
            document.save(outputPath.toFile());
        }

        return outputPath.toString();
    }

    private String unlockPdf(Job job, Map<String, String> params) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        String password = params != null ? params.getOrDefault("password", "") : "";

        File inputFile = new File(job.getInputFilePath());
        try (PDDocument document = Loader.loadPDF(inputFile, password)) {
            document.setAllSecurityToBeRemoved(true);
            document.save(outputPath.toFile());
        } catch (InvalidPasswordException e) {
            throw e;
        }

        return outputPath.toString();
    }

    private String restrictPdf(Job job, Map<String, String> params) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        String ownerPassword = params != null ? params.getOrDefault("password", "owner123") : "owner123";

        // Parse individual permissions (default: all restricted)
        AccessPermission ap = new AccessPermission();
        if (params != null) {
            ap.setCanPrint("true".equalsIgnoreCase(params.getOrDefault("allowPrinting", "false")));
            ap.setCanModify("true".equalsIgnoreCase(params.getOrDefault("allowEditing", "false")));
            ap.setCanExtractContent("true".equalsIgnoreCase(params.getOrDefault("allowCopying", "false")));
            ap.setCanModifyAnnotations("true".equalsIgnoreCase(params.getOrDefault("allowAnnotations", "false")));
            ap.setCanFillInForm("true".equalsIgnoreCase(params.getOrDefault("allowFormFilling", "false")));
        } else {
            ap.setCanPrint(false);
            ap.setCanModify(false);
            ap.setCanExtractContent(false);
            ap.setCanModifyAnnotations(false);
        }

        File inputFile = new File(job.getInputFilePath());
        try (PDDocument document = Loader.loadPDF(inputFile)) {
            StandardProtectionPolicy policy = new StandardProtectionPolicy(ownerPassword, "", ap);
            policy.setEncryptionKeyLength(128);
            document.protect(policy);
            document.save(outputPath.toFile());
        }

        return outputPath.toString();
    }

    private String removeRestrictions(Job job, Map<String, String> params) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        String password = params != null ? params.getOrDefault("password", "") : "";

        File inputFile = new File(job.getInputFilePath());
        try (PDDocument document = Loader.loadPDF(inputFile, password)) {
            document.setAllSecurityToBeRemoved(true);
            document.save(outputPath.toFile());
        }

        return outputPath.toString();
    }

    private String cleanMetadata(Job job) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        File inputFile = new File(job.getInputFilePath());
        try (PDDocument document = Loader.loadPDF(inputFile)) {
            PDDocumentInformation info = new PDDocumentInformation();
            document.setDocumentInformation(info);
            // Remove XMP metadata if present
            document.getDocumentCatalog().setMetadata(null);
            document.save(outputPath.toFile());
        }

        return outputPath.toString();
    }

    private String redactPdf(Job job, Map<String, String> params) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        // Parse redaction areas: format "pageIndex,x,y,width,height" separated by semicolons
        String areasParam = params != null ? params.get("areas") : null;
        if (areasParam == null || areasParam.isEmpty()) {
            throw new FileProcessingException("No redaction areas specified. Use format: pageIndex,x,y,width,height");
        }

        File inputFile = new File(job.getInputFilePath());
        try (PDDocument document = Loader.loadPDF(inputFile)) {
            String[] areaParts = areasParam.split(";");
            int totalAreas = areaParts.length;

            for (int a = 0; a < totalAreas; a++) {
                String[] coords = areaParts[a].trim().split(",");
                if (coords.length < 5) {
                    log.warn("Skipping invalid redaction area: {}", areaParts[a]);
                    continue;
                }

                int pageIndex = Integer.parseInt(coords[0].trim());
                float x = Float.parseFloat(coords[1].trim());
                float y = Float.parseFloat(coords[2].trim());
                float width = Float.parseFloat(coords[3].trim());
                float height = Float.parseFloat(coords[4].trim());

                if (pageIndex < 0 || pageIndex >= document.getNumberOfPages()) {
                    log.warn("Skipping redaction area with invalid page index: {}", pageIndex);
                    continue;
                }

                PDPage page = document.getPage(pageIndex);
                try (PDPageContentStream cs = new PDPageContentStream(
                        document, page, PDPageContentStream.AppendMode.APPEND, true, true)) {
                    cs.setNonStrokingColor(Color.BLACK);
                    cs.addRect(x, y, width, height);
                    cs.fill();
                }

                int progress = 10 + (int) ((double) (a + 1) / totalAreas * 80);
                jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, progress);
            }

            document.save(outputPath.toFile());
        }

        return outputPath.toString();
    }
}
