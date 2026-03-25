package com.opensuite.service;

import com.opensuite.model.EditType;
import com.opensuite.model.Job;
import com.opensuite.model.JobStatus;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
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

        editingService.processEdit("edit-job-id", EditType.SPLIT, Map.of("pages", "1-2"));

        verify(jobService).failJob(eq("edit-job-id"), anyString());
    }

    @Test
    void splitPdf_splitsByPageRange() throws IOException {
        when(jobService.getJob("edit-job-id")).thenReturn(testJob);
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());

        editingService.processEdit("edit-job-id", EditType.SPLIT, Map.of("ranges", "1-2"));

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

        editingService.processEdit("edit-job-id", EditType.ROTATE, Map.of("degrees", "90"));

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
    void rotatePdf_rotatesOddPagesOnly() throws IOException {
        when(jobService.getJob("edit-job-id")).thenReturn(testJob);
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());

        editingService.processEdit("edit-job-id", EditType.ROTATE,
                Map.of("degrees", "180", "target", "odd"));

        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(jobService).setOutputFile(eq("edit-job-id"), pathCaptor.capture());

        File outputFile = new File(pathCaptor.getValue());
        try (PDDocument doc = Loader.loadPDF(outputFile)) {
            assertEquals(180, doc.getPage(0).getRotation()); // page 1 (odd, 0-indexed)
            assertEquals(0, doc.getPage(1).getRotation());   // page 2 (even, 0-indexed)
            assertEquals(180, doc.getPage(2).getRotation()); // page 3 (odd, 0-indexed)
        }
    }

    @Test
    void rotatePdf_rotatesCustomPages() throws IOException {
        when(jobService.getJob("edit-job-id")).thenReturn(testJob);
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());

        editingService.processEdit("edit-job-id", EditType.ROTATE,
                Map.of("degrees", "90", "target", "custom", "pages", "2"));

        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(jobService).setOutputFile(eq("edit-job-id"), pathCaptor.capture());

        File outputFile = new File(pathCaptor.getValue());
        try (PDDocument doc = Loader.loadPDF(outputFile)) {
            assertEquals(0, doc.getPage(0).getRotation());  // page 1 — not rotated
            assertEquals(90, doc.getPage(1).getRotation());  // page 2 — rotated
            assertEquals(0, doc.getPage(2).getRotation());  // page 3 — not rotated
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
    void addPageNumbers_withSkipAndFormat() throws IOException {
        when(jobService.getJob("edit-job-id")).thenReturn(testJob);
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());

        editingService.processEdit("edit-job-id", EditType.PAGE_NUMBERS,
                Map.of("format", "roman", "skipPages", "1", "position", "top-right"));

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

    @Test
    void addWatermark_withCustomParams() throws IOException {
        when(jobService.getJob("edit-job-id")).thenReturn(testJob);
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());

        editingService.processEdit("edit-job-id", EditType.WATERMARK,
                Map.of("text", "DRAFT", "fontSize", "40", "opacity", "0.5",
                       "position", "top-right", "color", "#FF0000", "pageRange", "1-2"));

        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(jobService).setOutputFile(eq("edit-job-id"), pathCaptor.capture());

        File outputFile = new File(pathCaptor.getValue());
        assertTrue(outputFile.exists());
        assertTrue(outputFile.length() > 0);
    }

    @Test
    void cropPdf_producesOutput() throws IOException {
        when(jobService.getJob("edit-job-id")).thenReturn(testJob);
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());

        editingService.processEdit("edit-job-id", EditType.CROP,
                Map.of("top", "50", "right", "50", "bottom", "50", "left", "50"));

        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(jobService).setOutputFile(eq("edit-job-id"), pathCaptor.capture());

        File outputFile = new File(pathCaptor.getValue());
        assertTrue(outputFile.exists());

        try (PDDocument doc = Loader.loadPDF(outputFile)) {
            PDRectangle cropBox = doc.getPage(0).getCropBox();
            // Original A4-ish page minus 50pt margins
            assertTrue(cropBox.getWidth() < PDRectangle.LETTER.getWidth());
        }
    }

    @Test
    void cropPdf_withPreset() throws IOException {
        when(jobService.getJob("edit-job-id")).thenReturn(testJob);
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());

        editingService.processEdit("edit-job-id", EditType.CROP, Map.of("preset", "a4"));

        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(jobService).setOutputFile(eq("edit-job-id"), pathCaptor.capture());

        File outputFile = new File(pathCaptor.getValue());
        assertTrue(outputFile.exists());
    }

    @Test
    void cropPdf_specificPages() throws IOException {
        when(jobService.getJob("edit-job-id")).thenReturn(testJob);
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());

        editingService.processEdit("edit-job-id", EditType.CROP,
                Map.of("top", "30", "bottom", "30", "left", "30", "right", "30", "pages", "1,3"));

        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(jobService).setOutputFile(eq("edit-job-id"), pathCaptor.capture());

        File outputFile = new File(pathCaptor.getValue());
        assertTrue(outputFile.exists());

        try (PDDocument doc = Loader.loadPDF(outputFile)) {
            // Pages 1 and 3 should be cropped, page 2 should not
            PDRectangle cropBox1 = doc.getPage(0).getCropBox();
            PDRectangle mediaBox2 = doc.getPage(1).getMediaBox();
            assertTrue(cropBox1.getWidth() < mediaBox2.getWidth());
        }
    }
    @Test
    void convertToPDFA_createsPdfa() throws IOException {
        when(jobService.getJob("edit-job-id")).thenReturn(testJob);
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());

        editingService.processEdit("edit-job-id", EditType.PDF_TO_PDFA, Map.of());

        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(jobService).setOutputFile(eq("edit-job-id"), pathCaptor.capture());

        File outputFile = new File(pathCaptor.getValue());
        assertTrue(outputFile.exists());
    }

    @Test
    void repairPDF_rebuildsStructure() throws IOException {
        when(jobService.getJob("edit-job-id")).thenReturn(testJob);
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());

        editingService.processEdit("edit-job-id", EditType.REPAIR_PDF, Map.of());

        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(jobService).setOutputFile(eq("edit-job-id"), pathCaptor.capture());

        File outputFile = new File(pathCaptor.getValue());
        assertTrue(outputFile.exists());
    }

    @Test
    void signPDF_addsSignature() throws IOException {
        when(jobService.getJob("edit-job-id")).thenReturn(testJob);
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());

        editingService.processEdit("edit-job-id", EditType.SIGN_PDF, Map.of("signerName", "Test Signer"));

        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(jobService).setOutputFile(eq("edit-job-id"), pathCaptor.capture());

        File outputFile = new File(pathCaptor.getValue());
        assertTrue(outputFile.exists());
    }

    @Test
    void comparePDFs_generatesReport() throws IOException {
        // Need to set up a batch directory with 2 files instead of a single file
        File dir = tempDir.resolve("compare_batch").toFile();
        dir.mkdirs();
        File file1 = new File(dir, "1.pdf");
        File file2 = new File(dir, "2.pdf");
        java.nio.file.Files.copy(testPdfFile.toPath(), file1.toPath());
        java.nio.file.Files.copy(testPdfFile.toPath(), file2.toPath());
        
        Job compareJob = new Job();
        compareJob.setId("compare-job-id");
        compareJob.setInputFilePath(dir.getAbsolutePath());
        
        when(jobService.getJob("compare-job-id")).thenReturn(compareJob);
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());

        editingService.processEdit("compare-job-id", EditType.COMPARE_PDF, Map.of());

        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(jobService).setOutputFile(eq("compare-job-id"), pathCaptor.capture());

        File outputFile = new File(pathCaptor.getValue());
        assertTrue(outputFile.exists());
        assertTrue(outputFile.getName().endsWith(".txt"));
        
        String report = java.nio.file.Files.readString(outputFile.toPath());
        assertTrue(report.contains("PDF Comparison Report"));
    }
}
