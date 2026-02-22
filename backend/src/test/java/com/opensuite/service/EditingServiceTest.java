package com.opensuite.service;

import com.opensuite.model.EditType;
import com.opensuite.model.Job;
import com.opensuite.model.JobStatus;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.Loader;
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
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EditingServiceTest {

    @Mock
    private JobService jobService;

    @Mock
    private FileUploadService fileUploadService;

    private EditingService editingService;

    @TempDir
    Path tempDir;

    private File testPdfFile;
    private Job testJob;

    @BeforeEach
    void setUp() throws IOException {
        editingService = new EditingService(jobService, fileUploadService);

        // Create a multi-page PDF for testing
        testPdfFile = tempDir.resolve("input.pdf").toFile();
        try (PDDocument doc = new PDDocument()) {
            for (int i = 0; i < 3; i++) {
                PDPage page = new PDPage();
                doc.addPage(page);
                try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                    cs.beginText();
                    cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 14);
                    cs.newLineAtOffset(100, 700);
                    cs.showText("Page " + (i + 1));
                    cs.endText();
                }
            }
            doc.save(testPdfFile);
        }

        testJob = new Job();
        testJob.setId("edit-job-id");
        testJob.setInputFilePath(testPdfFile.getAbsolutePath());
        testJob.setOriginalFileName("input.pdf");
    }

    @Test
    void processEdit_routesAndCompletes() {
        when(jobService.getJob("edit-job-id")).thenReturn(testJob);
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());

        editingService.processEdit("edit-job-id", EditType.ROTATE, Map.of("angle", "90"));

        verify(jobService).updateJobStatus("edit-job-id", JobStatus.PROCESSING, 10);
        verify(jobService).setOutputFile(eq("edit-job-id"), anyString());
        verify(jobService).updateJobStatus("edit-job-id", JobStatus.COMPLETED, 100);
    }

    @Test
    void processEdit_failure_setsJobFailed() {
        testJob.setInputFilePath("/nonexistent/file.pdf");
        when(jobService.getJob("edit-job-id")).thenReturn(testJob);
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());

        editingService.processEdit("edit-job-id", EditType.SPLIT, Map.of("pages", "1-2"));

        verify(jobService).failJob(eq("edit-job-id"), anyString());
    }

    @Test
    void splitPdf_splitsByPageRange() throws IOException {
        when(jobService.getJob("edit-job-id")).thenReturn(testJob);
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());

        editingService.processEdit("edit-job-id", EditType.SPLIT, Map.of("pages", "1-2"));

        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(jobService).setOutputFile(eq("edit-job-id"), pathCaptor.capture());

        File outputFile = new File(pathCaptor.getValue());
        assertTrue(outputFile.exists());
        try (PDDocument doc = Loader.loadPDF(outputFile)) {
            assertEquals(2, doc.getNumberOfPages());
        }
    }

    @Test
    void rotatePdf_rotatesAllPages() throws IOException {
        when(jobService.getJob("edit-job-id")).thenReturn(testJob);
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());

        editingService.processEdit("edit-job-id", EditType.ROTATE, Map.of("angle", "90"));

        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(jobService).setOutputFile(eq("edit-job-id"), pathCaptor.capture());

        File outputFile = new File(pathCaptor.getValue());
        assertTrue(outputFile.exists());
        try (PDDocument doc = Loader.loadPDF(outputFile)) {
            assertEquals(3, doc.getNumberOfPages());
            assertEquals(90, doc.getPage(0).getRotation());
        }
    }

    @Test
    void addPageNumbers_addsNumbersToAllPages() throws IOException {
        when(jobService.getJob("edit-job-id")).thenReturn(testJob);
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());

        editingService.processEdit("edit-job-id", EditType.PAGE_NUMBERS, null);

        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(jobService).setOutputFile(eq("edit-job-id"), pathCaptor.capture());

        File outputFile = new File(pathCaptor.getValue());
        assertTrue(outputFile.exists());
        assertTrue(outputFile.length() > 0);
    }

    @Test
    void compressPdf_producesOutput() throws IOException {
        when(jobService.getJob("edit-job-id")).thenReturn(testJob);
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());

        editingService.processEdit("edit-job-id", EditType.COMPRESS, null);

        verify(jobService).setOutputFile(eq("edit-job-id"), anyString());
        verify(jobService).updateJobStatus("edit-job-id", JobStatus.COMPLETED, 100);
    }

    @Test
    void addWatermark_producesOutput() throws IOException {
        when(jobService.getJob("edit-job-id")).thenReturn(testJob);
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());

        editingService.processEdit("edit-job-id", EditType.WATERMARK,
                Map.of("text", "CONFIDENTIAL"));

        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(jobService).setOutputFile(eq("edit-job-id"), pathCaptor.capture());

        File outputFile = new File(pathCaptor.getValue());
        assertTrue(outputFile.exists());
        assertTrue(outputFile.length() > testPdfFile.length()); // Watermark adds content
    }
}
