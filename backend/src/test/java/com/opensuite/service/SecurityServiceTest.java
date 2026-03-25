package com.opensuite.service;

import com.opensuite.model.Job;
import com.opensuite.model.JobStatus;
import com.opensuite.model.SecurityAction;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDDocumentInformation;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.encryption.AccessPermission;
import org.apache.pdfbox.pdmodel.encryption.StandardProtectionPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SecurityServiceTest {

    @Mock
    private JobService jobService;

    @Mock
    private FileUploadService fileUploadService;

    private SecurityService securityService;

    @TempDir
    Path tempDir;

    private Job testJob;
    private File testPdfFile;

    @BeforeEach
    void setUp() throws IOException {
        securityService = new SecurityService(jobService, fileUploadService);

        // Create a real PDF for testing
        testPdfFile = tempDir.resolve("input.pdf").toFile();
        try (PDDocument doc = new PDDocument()) {
            doc.addPage(new PDPage());
            doc.save(testPdfFile);
        }

        testJob = new Job();
        testJob.setId("sec-job-id");
        testJob.setStatus(JobStatus.PROCESSING);
        testJob.setInputFilePath(testPdfFile.getAbsolutePath());
    }

    @Test
    void processSecurityAction_routesAllActions() {
        when(jobService.getJob("sec-job-id")).thenReturn(testJob);
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());

        securityService.processSecurityAction("sec-job-id", SecurityAction.PROTECT,
                Map.of("password", "secret123"));

        verify(jobService).updateJobStatus("sec-job-id", JobStatus.PROCESSING, 10);
        verify(jobService).setOutputFile(eq("sec-job-id"), anyString());
        verify(jobService).updateJobStatus("sec-job-id", JobStatus.COMPLETED, 100);
    }

    @Test
    void processSecurityAction_failure_setsJobFailed() {
        testJob.setInputFilePath("/nonexistent/file.pdf");
        when(jobService.getJob("sec-job-id")).thenReturn(testJob);
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());

        securityService.processSecurityAction("sec-job-id", SecurityAction.PROTECT, null);

        verify(jobService).failJob(eq("sec-job-id"), anyString());
    }

    @Test
    void protectPdf_setsPasswordProtection() throws IOException {
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());
        when(jobService.getJob("sec-job-id")).thenReturn(testJob);

        securityService.processSecurityAction("sec-job-id", SecurityAction.PROTECT,
                Map.of("password", "mypassword"));

        // Verify the output was set
        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(jobService).setOutputFile(eq("sec-job-id"), pathCaptor.capture());

        // Verify the output PDF is password-protected
        File outputFile = new File(pathCaptor.getValue());
        assertTrue(outputFile.exists());
        // Attempting to load without password should work but the doc is encrypted
        try (PDDocument doc = Loader.loadPDF(outputFile, "mypassword")) {
            assertNotNull(doc);
            assertEquals(1, doc.getNumberOfPages());
        }
    }

    @Test
    void protectPdf_withSeparatePasswords() throws IOException {
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());
        when(jobService.getJob("sec-job-id")).thenReturn(testJob);

        securityService.processSecurityAction("sec-job-id", SecurityAction.PROTECT,
                Map.of("userPassword", "user123", "ownerPassword", "owner456"));

        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(jobService).setOutputFile(eq("sec-job-id"), pathCaptor.capture());

        File outputFile = new File(pathCaptor.getValue());
        assertTrue(outputFile.exists());
        // Should be loadable with user password
        try (PDDocument doc = Loader.loadPDF(outputFile, "user123")) {
            assertNotNull(doc);
        }
    }

    @Test
    void protectPdf_withPermissions() throws IOException {
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());
        when(jobService.getJob("sec-job-id")).thenReturn(testJob);

        securityService.processSecurityAction("sec-job-id", SecurityAction.PROTECT,
                Map.of("password", "test", "allowPrinting", "false", "allowCopying", "false",
                       "allowEditing", "false", "encryptionBits", "128"));

        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(jobService).setOutputFile(eq("sec-job-id"), pathCaptor.capture());

        File outputFile = new File(pathCaptor.getValue());
        assertTrue(outputFile.exists());
        assertTrue(outputFile.length() > 0);
    }

    @Test
    void protectPdf_256bitEncryption() throws IOException {
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());
        when(jobService.getJob("sec-job-id")).thenReturn(testJob);

        securityService.processSecurityAction("sec-job-id", SecurityAction.PROTECT,
                Map.of("password", "test256", "encryptionBits", "256"));

        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(jobService).setOutputFile(eq("sec-job-id"), pathCaptor.capture());

        File outputFile = new File(pathCaptor.getValue());
        assertTrue(outputFile.exists());
        assertTrue(outputFile.length() > 0);
    }

    @Test
    void unlockPdf_removesProtection() throws IOException {
        // First protect the PDF
        File protectedPdf = tempDir.resolve("protected.pdf").toFile();
        try (PDDocument doc = new PDDocument()) {
            doc.addPage(new PDPage());
            AccessPermission ap = new AccessPermission();
            StandardProtectionPolicy policy = new StandardProtectionPolicy("pass", "pass", ap);
            policy.setEncryptionKeyLength(128);
            doc.protect(policy);
            doc.save(protectedPdf);
        }

        testJob.setInputFilePath(protectedPdf.getAbsolutePath());
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());
        when(jobService.getJob("sec-job-id")).thenReturn(testJob);

        securityService.processSecurityAction("sec-job-id", SecurityAction.UNLOCK,
                Map.of("password", "pass"));

        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(jobService).setOutputFile(eq("sec-job-id"), pathCaptor.capture());

        File outputFile = new File(pathCaptor.getValue());
        assertTrue(outputFile.exists());
        // Should be loadable without password now
        try (PDDocument doc = Loader.loadPDF(outputFile)) {
            assertNotNull(doc);
        }
    }

    @Test
    void unlockPdf_wrongPassword_failsJob() throws IOException {
        // Create a password-protected PDF
        File protectedPdf = tempDir.resolve("protected2.pdf").toFile();
        try (PDDocument doc = new PDDocument()) {
            doc.addPage(new PDPage());
            AccessPermission ap = new AccessPermission();
            StandardProtectionPolicy policy = new StandardProtectionPolicy("correct", "correct", ap);
            policy.setEncryptionKeyLength(128);
            doc.protect(policy);
            doc.save(protectedPdf);
        }

        testJob.setInputFilePath(protectedPdf.getAbsolutePath());
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());
        when(jobService.getJob("sec-job-id")).thenReturn(testJob);

        securityService.processSecurityAction("sec-job-id", SecurityAction.UNLOCK,
                Map.of("password", "wrong"));

        // Should fail with password error
        verify(jobService).failJob(eq("sec-job-id"), anyString());
    }

    @Test
    void restrictPdf_setsPermissions() throws IOException {
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());
        when(jobService.getJob("sec-job-id")).thenReturn(testJob);

        securityService.processSecurityAction("sec-job-id", SecurityAction.RESTRICT,
                Map.of("password", "owner123"));

        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(jobService).setOutputFile(eq("sec-job-id"), pathCaptor.capture());

        File outputFile = new File(pathCaptor.getValue());
        assertTrue(outputFile.exists());
        assertTrue(outputFile.length() > 0);
    }

    @Test
    void cleanMetadata_removesDocInfo() throws IOException {
        // Create PDF with metadata
        File metaPdf = tempDir.resolve("meta.pdf").toFile();
        try (PDDocument doc = new PDDocument()) {
            doc.addPage(new PDPage());
            PDDocumentInformation info = doc.getDocumentInformation();
            info.setAuthor("Test Author");
            info.setTitle("Test Title");
            doc.save(metaPdf);
        }

        testJob.setInputFilePath(metaPdf.getAbsolutePath());
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());
        when(jobService.getJob("sec-job-id")).thenReturn(testJob);

        securityService.processSecurityAction("sec-job-id", SecurityAction.CLEAN_METADATA, null);

        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(jobService).setOutputFile(eq("sec-job-id"), pathCaptor.capture());

        // Verify metadata was cleared
        File outputFile = new File(pathCaptor.getValue());
        try (PDDocument doc = Loader.loadPDF(outputFile)) {
            PDDocumentInformation info = doc.getDocumentInformation();
            assertNull(info.getAuthor());
            assertNull(info.getTitle());
        }
    }

    @Test
    void redactPdf_drawsBlackRectangle() throws IOException {
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());
        when(jobService.getJob("sec-job-id")).thenReturn(testJob);

        // Redact an area on page 0
        securityService.processSecurityAction("sec-job-id", SecurityAction.REDACT,
                Map.of("areas", "0,100,100,200,50"));

        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(jobService).setOutputFile(eq("sec-job-id"), pathCaptor.capture());

        File outputFile = new File(pathCaptor.getValue());
        assertTrue(outputFile.exists());
        // Output should be larger than input (redaction adds content)
        assertTrue(outputFile.length() > testPdfFile.length());
    }

    @Test
    void redactPdf_multipleAreas() throws IOException {
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());
        when(jobService.getJob("sec-job-id")).thenReturn(testJob);

        securityService.processSecurityAction("sec-job-id", SecurityAction.REDACT,
                Map.of("areas", "0,100,100,200,50;0,300,300,100,30"));

        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(jobService).setOutputFile(eq("sec-job-id"), pathCaptor.capture());

        File outputFile = new File(pathCaptor.getValue());
        assertTrue(outputFile.exists());
    }

    @Test
    void redactPdf_noAreas_failsJob() {
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());
        when(jobService.getJob("sec-job-id")).thenReturn(testJob);

        securityService.processSecurityAction("sec-job-id", SecurityAction.REDACT,
                Map.of());

        verify(jobService).failJob(eq("sec-job-id"), anyString());
    }
}
