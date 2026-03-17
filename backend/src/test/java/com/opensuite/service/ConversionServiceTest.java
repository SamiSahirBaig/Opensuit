package com.opensuite.service;

import com.opensuite.model.ConversionType;
import com.opensuite.model.Job;
import com.opensuite.model.JobStatus;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.imageio.ImageIO;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConversionServiceTest {

    @Mock
    private JobService jobService;

    @Mock
    private FileUploadService fileUploadService;

    @Mock
    private LibreOfficeConverter libreOfficeConverter;

    private ConversionService conversionService;

    @TempDir
    Path tempDir;

    private Job testJob;

    @BeforeEach
    void setUp() {
        conversionService = new ConversionService(jobService, fileUploadService, libreOfficeConverter);
    }

    private Job createJobWithPdf(String filename) throws IOException {
        File pdfFile = tempDir.resolve(filename).toFile();
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                cs.newLineAtOffset(25, 700);
                cs.showText("Hello OpenSuite Test");
                cs.endText();
            }
            doc.save(pdfFile);
        }

        Job job = new Job();
        job.setId("conv-" + filename);
        job.setInputFilePath(pdfFile.getAbsolutePath());
        job.setOriginalFileName(filename);
        return job;
    }

    @Test
    void processConversion_pdfToTxt_delegatesAndCompletes() throws IOException {
        Job job = createJobWithPdf("test.pdf");
        when(jobService.getJob(job.getId())).thenReturn(job);
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());

        conversionService.processConversion(job.getId(), ConversionType.PDF_TO_TXT, null);

        verify(jobService).updateJobStatus(job.getId(), JobStatus.PROCESSING, 10);
        verify(jobService).setOutputFile(eq(job.getId()), anyString());
        verify(jobService).updateJobStatus(job.getId(), JobStatus.COMPLETED, 100);
    }

    @Test
    void processConversion_pdfToJpg_delegatesAndCompletes() throws IOException {
        Job job = createJobWithPdf("test-img.pdf");
        when(jobService.getJob(job.getId())).thenReturn(job);
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());

        conversionService.processConversion(job.getId(), ConversionType.PDF_TO_JPG);

        verify(jobService).updateJobStatus(job.getId(), JobStatus.COMPLETED, 100);
    }

    @Test
    void processConversion_txtToPdf_delegatesAndCompletes() throws IOException {
        File txtFile = tempDir.resolve("hello.txt").toFile();
        Files.writeString(txtFile.toPath(), "Hello from test\nSecond line");

        Job job = new Job();
        job.setId("txt-to-pdf");
        job.setInputFilePath(txtFile.getAbsolutePath());
        job.setOriginalFileName("hello.txt");

        when(jobService.getJob("txt-to-pdf")).thenReturn(job);
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());

        conversionService.processConversion("txt-to-pdf", ConversionType.TXT_TO_PDF, null);

        verify(jobService).setOutputFile(eq("txt-to-pdf"), anyString());
        verify(jobService).updateJobStatus("txt-to-pdf", JobStatus.COMPLETED, 100);
    }

    @Test
    void processConversion_imageToPdf_delegatesAndCompletes() throws IOException {
        File pngFile = tempDir.resolve("test.png").toFile();
        BufferedImage img = new BufferedImage(100, 100, BufferedImage.TYPE_INT_RGB);
        ImageIO.write(img, "png", pngFile);

        Job job = new Job();
        job.setId("png-to-pdf");
        job.setInputFilePath(pngFile.getAbsolutePath());
        job.setOriginalFileName("test.png");

        when(jobService.getJob("png-to-pdf")).thenReturn(job);
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());

        conversionService.processConversion("png-to-pdf", ConversionType.PNG_TO_PDF, null);

        verify(jobService).setOutputFile(eq("png-to-pdf"), anyString());
        verify(jobService).updateJobStatus("png-to-pdf", JobStatus.COMPLETED, 100);
    }

    @Test
    void processConversion_failingConversion_setsJobToFailed() {
        Job job = new Job();
        job.setId("fail-job");
        job.setInputFilePath("/nonexistent/file.pdf");
        job.setOriginalFileName("nonexistent.pdf");

        when(jobService.getJob("fail-job")).thenReturn(job);
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());

        conversionService.processConversion("fail-job", ConversionType.PDF_TO_TXT, null);

        verify(jobService).failJob(eq("fail-job"), anyString());
        verify(jobService, never()).updateJobStatus("fail-job", JobStatus.COMPLETED, 100);
    }

    @Test
    void processConversion_pdfToHtml_producesOutput() throws IOException {
        Job job = createJobWithPdf("html-test.pdf");
        when(jobService.getJob(job.getId())).thenReturn(job);
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());

        conversionService.processConversion(job.getId(), ConversionType.PDF_TO_HTML, null);

        verify(jobService).setOutputFile(eq(job.getId()), contains(".html"));
        verify(jobService).updateJobStatus(job.getId(), JobStatus.COMPLETED, 100);
    }

    @Test
    void processConversion_libreOfficeTypes_delegatesToConverter() throws IOException {
        Job job = createJobWithPdf("lo-test.pdf");
        when(jobService.getJob(job.getId())).thenReturn(job);
        when(fileUploadService.getTempDir()).thenReturn(tempDir.toString());
        when(libreOfficeConverter.isAvailable()).thenReturn(true);
        when(libreOfficeConverter.convert(anyString(), eq("epub"), anyString()))
                .thenReturn(tempDir.resolve("lo-test.epub"));

        conversionService.processConversion(job.getId(), ConversionType.PDF_TO_EPUB, null);

        verify(libreOfficeConverter).convert(anyString(), eq("epub"), anyString());
    }
}
