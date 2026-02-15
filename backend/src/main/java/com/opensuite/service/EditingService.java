package com.opensuite.service;

import com.opensuite.exception.FileProcessingException;
import com.opensuite.model.EditType;
import com.opensuite.model.Job;
import com.opensuite.model.JobStatus;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.multipdf.PDFMergerUtility;
import org.apache.pdfbox.multipdf.Splitter;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

@Service
public class EditingService {

    private static final Logger log = LoggerFactory.getLogger(EditingService.class);

    private final JobService jobService;
    private final FileUploadService fileUploadService;

    public EditingService(JobService jobService, FileUploadService fileUploadService) {
        this.jobService = jobService;
        this.fileUploadService = fileUploadService;
    }

    @Async("taskExecutor")
    public void processEdit(String jobId, EditType type, Map<String, String> params) {
        try {
            jobService.updateJobStatus(jobId, JobStatus.PROCESSING, 10);
            Job job = jobService.getJob(jobId);

            String outputPath = switch (type) {
                case MERGE -> mergePdfs(job);
                case SPLIT -> splitPdf(job, params);
                case ROTATE -> rotatePdf(job, params);
                case COMPRESS -> compressPdf(job, params);
                case WATERMARK -> addWatermark(job, params);
                case PAGE_NUMBERS -> addPageNumbers(job);
                case REORDER -> reorderPages(job, params);
                default -> throw new FileProcessingException("Edit type not yet implemented: " + type);
            };

            jobService.setOutputFile(jobId, outputPath);
            jobService.updateJobStatus(jobId, JobStatus.COMPLETED, 100);
            log.info("Edit completed: {} for job {}", type, jobId);

        } catch (Exception e) {
            log.error("Edit failed for job {}: {}", jobId, e.getMessage(), e);
            jobService.failJob(jobId, "Edit failed: " + e.getMessage());
        }
    }

    private String mergePdfs(Job job) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        PDFMergerUtility merger = new PDFMergerUtility();
        merger.setDestinationFileName(outputPath.toString());

        // Files are stored as comma-separated paths in the batch directory
        Path batchDir = Paths.get(job.getInputFilePath());
        if (Files.isDirectory(batchDir)) {
            Files.list(batchDir)
                    .filter(p -> p.toString().endsWith(".pdf"))
                    .sorted()
                    .forEach(p -> {
                        try {
                            merger.addSource(p.toFile());
                        } catch (Exception e) {
                            throw new RuntimeException("Failed to add source: " + p, e);
                        }
                    });
        } else {
            // Single file - just copy
            Files.copy(Paths.get(job.getInputFilePath()), outputPath);
            return outputPath.toString();
        }

        merger.mergeDocuments(null);
        return outputPath.toString();
    }

    private String splitPdf(Job job, Map<String, String> params) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        int splitPage = params != null && params.containsKey("page") ? Integer.parseInt(params.get("page")) : 1;

        File inputFile = new File(job.getInputFilePath());
        try (PDDocument document = Loader.loadPDF(inputFile)) {
            Splitter splitter = new Splitter();
            splitter.setSplitAtPage(splitPage);

            List<PDDocument> pages = splitter.split(document);
            if (!pages.isEmpty()) {
                pages.get(0).save(outputPath.toFile());
                // Close all split documents
                for (PDDocument doc : pages) {
                    doc.close();
                }
            }
        }

        return outputPath.toString();
    }

    private String rotatePdf(Job job, Map<String, String> params) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        int degrees = params != null && params.containsKey("degrees") ? Integer.parseInt(params.get("degrees")) : 90;

        File inputFile = new File(job.getInputFilePath());
        try (PDDocument document = Loader.loadPDF(inputFile)) {
            for (PDPage page : document.getPages()) {
                page.setRotation((page.getRotation() + degrees) % 360);
            }
            document.save(outputPath.toFile());
        }

        return outputPath.toString();
    }

    private String compressPdf(Job job, Map<String, String> params) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        File inputFile = new File(job.getInputFilePath());
        try (PDDocument document = Loader.loadPDF(inputFile)) {
            // Basic compression by removing unused objects
            document.save(outputPath.toFile());
        }

        return outputPath.toString();
    }

    private String addWatermark(Job job, Map<String, String> params) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        String watermarkText = params != null && params.containsKey("text") ? params.get("text") : "WATERMARK";

        File inputFile = new File(job.getInputFilePath());
        try (PDDocument document = Loader.loadPDF(inputFile)) {
            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);

            for (PDPage page : document.getPages()) {
                PDRectangle mediaBox = page.getMediaBox();
                try (PDPageContentStream cs = new PDPageContentStream(
                        document, page, PDPageContentStream.AppendMode.APPEND, true, true)) {

                    cs.setFont(font, 60);
                    cs.setNonStrokingColor(200, 200, 200);

                    cs.beginText();
                    cs.newLineAtOffset(mediaBox.getWidth() / 4, mediaBox.getHeight() / 2);
                    cs.showText(watermarkText);
                    cs.endText();
                }
            }
            document.save(outputPath.toFile());
        }

        return outputPath.toString();
    }

    private String addPageNumbers(Job job) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        File inputFile = new File(job.getInputFilePath());
        try (PDDocument document = Loader.loadPDF(inputFile)) {
            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            int totalPages = document.getNumberOfPages();

            for (int i = 0; i < totalPages; i++) {
                PDPage page = document.getPage(i);
                PDRectangle mediaBox = page.getMediaBox();

                try (PDPageContentStream cs = new PDPageContentStream(
                        document, page, PDPageContentStream.AppendMode.APPEND, true, true)) {

                    cs.setFont(font, 10);
                    cs.setNonStrokingColor(0, 0, 0);

                    String pageNum = String.format("Page %d of %d", i + 1, totalPages);
                    cs.beginText();
                    cs.newLineAtOffset(mediaBox.getWidth() / 2 - 30, 20);
                    cs.showText(pageNum);
                    cs.endText();
                }
            }
            document.save(outputPath.toFile());
        }

        return outputPath.toString();
    }

    private String reorderPages(Job job, Map<String, String> params) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        String order = params != null ? params.get("order") : null;

        File inputFile = new File(job.getInputFilePath());
        try (PDDocument source = Loader.loadPDF(inputFile);
                PDDocument result = new PDDocument()) {

            int pageCount = source.getNumberOfPages();

            if (order != null && !order.isEmpty()) {
                // Parse comma-separated page order (1-indexed)
                String[] indices = order.split(",");
                for (String idx : indices) {
                    int pageIndex = Integer.parseInt(idx.trim()) - 1;
                    if (pageIndex >= 0 && pageIndex < pageCount) {
                        result.addPage(source.getPage(pageIndex));
                    }
                }
            } else {
                // Reverse order by default
                for (int i = pageCount - 1; i >= 0; i--) {
                    result.addPage(source.getPage(i));
                }
            }

            result.save(outputPath.toFile());
        }

        return outputPath.toString();
    }
}
