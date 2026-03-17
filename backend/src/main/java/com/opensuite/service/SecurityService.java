package com.opensuite.service;

import com.opensuite.exception.FileProcessingException;
import com.opensuite.model.Job;
import com.opensuite.model.JobStatus;
import com.opensuite.model.SecurityAction;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentInformation;
import org.apache.pdfbox.pdmodel.encryption.AccessPermission;
import org.apache.pdfbox.pdmodel.encryption.StandardProtectionPolicy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

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
            };

            jobService.setOutputFile(jobId, outputPath);
            jobService.updateJobStatus(jobId, JobStatus.COMPLETED, 100);
            log.info("Security action completed: {} for job {}", action, jobId);

        } catch (Exception e) {
            log.error("Security action failed for job {}: {}", jobId, e.getMessage(), e);
            jobService.failJob(jobId, "Security action failed: " + e.getMessage());
        }
    }

    private String protectPdf(Job job, Map<String, String> params) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        String password = params != null ? params.getOrDefault("password", "password") : "password";

        File inputFile = new File(job.getInputFilePath());
        try (PDDocument document = PDDocument.load(inputFile)) {
            AccessPermission ap = new AccessPermission();
            StandardProtectionPolicy policy = new StandardProtectionPolicy(password, password, ap);
            policy.setEncryptionKeyLength(128);
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
        try (PDDocument document = PDDocument.load(inputFile, password)) {
            document.setAllSecurityToBeRemoved(true);
            document.save(outputPath.toFile());
        }

        return outputPath.toString();
    }

    private String restrictPdf(Job job, Map<String, String> params) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        String ownerPassword = params != null ? params.getOrDefault("password", "owner123") : "owner123";

        File inputFile = new File(job.getInputFilePath());
        try (PDDocument document = PDDocument.load(inputFile)) {
            AccessPermission ap = new AccessPermission();
            ap.setCanPrint(false);
            ap.setCanModify(false);
            ap.setCanExtractContent(false);
            ap.setCanModifyAnnotations(false);

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
        try (PDDocument document = PDDocument.load(inputFile, password)) {
            document.setAllSecurityToBeRemoved(true);
            document.save(outputPath.toFile());
        }

        return outputPath.toString();
    }

    private String cleanMetadata(Job job) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        File inputFile = new File(job.getInputFilePath());
        try (PDDocument document = PDDocument.load(inputFile)) {
            PDDocumentInformation info = new PDDocumentInformation();
            document.setDocumentInformation(info);
            // Remove XMP metadata if present
            document.getDocumentCatalog().setMetadata(null);
            document.save(outputPath.toFile());
        }

        return outputPath.toString();
    }
}
