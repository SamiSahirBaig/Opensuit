package com.opensuite.service;

import com.opensuite.exception.FileProcessingException;
import com.opensuite.model.EditType;
import com.opensuite.model.Job;
import com.opensuite.model.JobStatus;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.io.IOUtils;
import org.apache.pdfbox.multipdf.PDFMergerUtility;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.PDXObject;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

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

    // ── MERGE ────────────────────────────────────────────────────────────

    private String mergePdfs(Job job) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        PDFMergerUtility merger = new PDFMergerUtility();
        merger.setDestinationFileName(outputPath.toString());

        Path batchDir = Paths.get(job.getInputFilePath());
        if (Files.isDirectory(batchDir)) {
            List<Path> sources = Files.list(batchDir)
                    .filter(p -> p.toString().toLowerCase().endsWith(".pdf"))
                    .sorted()
                    .toList();

            if (sources.isEmpty()) {
                throw new FileProcessingException("No PDF files found to merge");
            }

            for (int i = 0; i < sources.size(); i++) {
                merger.addSource(sources.get(i).toFile());
                int progress = 10 + (int) ((double) i / sources.size() * 70);
                jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, progress);
            }
        } else {
            Files.copy(Paths.get(job.getInputFilePath()), outputPath);
            return outputPath.toString();
        }

        jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 85);
        // Use temp-file-only memory setting for large merges
        merger.mergeDocuments(IOUtils.createTempFileOnlyStreamCache());
        return outputPath.toString();
    }

    // ── SPLIT ────────────────────────────────────────────────────────────

    private String splitPdf(Job job, Map<String, String> params) throws IOException {
        String splitMode = params != null ? params.getOrDefault("splitMode", "ranges") : "ranges";
        File inputFile = new File(job.getInputFilePath());

        try (PDDocument document = Loader.loadPDF(inputFile)) {
            int totalPages = document.getNumberOfPages();
            log.info("Split mode={} totalPages={} jobId={}", splitMode, totalPages, job.getId());

            List<File> splitFiles = switch (splitMode) {
                case "individual" -> splitIndividual(document, totalPages, job);
                case "every-n" -> {
                    int n = params != null && params.containsKey("pages")
                            ? Integer.parseInt(params.get("pages"))
                            : 1;
                    yield splitEveryN(document, totalPages, n, job);
                }
                case "by-size" -> {
                    int maxMb = params != null && params.containsKey("maxSizeMb")
                            ? Integer.parseInt(params.get("maxSizeMb"))
                            : 5;
                    yield splitBySize(document, totalPages, maxMb, job);
                }
                default -> { // "ranges" or legacy "page" param
                    String ranges = params != null ? params.get("ranges") : null;
                    if (ranges == null && params != null && params.containsKey("page")) {
                        // Legacy fallback: split at page N → produces two files
                        int page = Integer.parseInt(params.get("page"));
                        ranges = "1-" + page + "," + (page + 1) + "-" + totalPages;
                    }
                    if (ranges == null)
                        ranges = "1-" + totalPages;
                    yield splitByRanges(document, totalPages, ranges, job);
                }
            };

            // Single result → return the PDF directly; multiple → ZIP
            if (splitFiles.size() == 1) {
                return splitFiles.get(0).getAbsolutePath();
            }
            return packageAsZip(splitFiles, job);
        }
    }

    private List<File> splitByRanges(PDDocument source, int totalPages, String rangesStr, Job job)
            throws IOException {
        List<File> results = new ArrayList<>();
        String[] ranges = rangesStr.split(",");

        for (int r = 0; r < ranges.length; r++) {
            String range = ranges[r].trim();
            String[] parts = range.contains("-") ? range.split("-") : new String[] { range, range };
            int start = Math.max(1, Integer.parseInt(parts[0].trim()));
            int end = Math.min(totalPages, Integer.parseInt(parts[1].trim()));

            try (PDDocument chunk = new PDDocument()) {
                for (int p = start; p <= end; p++) {
                    chunk.addPage(source.getPage(p - 1));
                }
                File out = tempPdf("split_" + (r + 1) + "_pages" + start + "-" + end);
                chunk.save(out);
                results.add(out);
            }
            jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING,
                    10 + (int) ((double) (r + 1) / ranges.length * 80));
        }
        return results;
    }

    private List<File> splitIndividual(PDDocument source, int totalPages, Job job) throws IOException {
        List<File> results = new ArrayList<>();
        for (int i = 0; i < totalPages; i++) {
            try (PDDocument single = new PDDocument()) {
                single.addPage(source.getPage(i));
                File out = tempPdf("page_" + (i + 1));
                single.save(out);
                results.add(out);
            }
            if (i % 10 == 0) {
                jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING,
                        10 + (int) ((double) (i + 1) / totalPages * 80));
            }
        }
        return results;
    }

    private List<File> splitEveryN(PDDocument source, int totalPages, int n, Job job) throws IOException {
        if (n < 1)
            n = 1;
        List<File> results = new ArrayList<>();
        int chunkIndex = 0;

        for (int start = 0; start < totalPages; start += n) {
            int end = Math.min(start + n, totalPages);
            try (PDDocument chunk = new PDDocument()) {
                for (int p = start; p < end; p++) {
                    chunk.addPage(source.getPage(p));
                }
                File out = tempPdf("chunk_" + (++chunkIndex) + "_pages" + (start + 1) + "-" + end);
                chunk.save(out);
                results.add(out);
            }
            jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING,
                    10 + (int) ((double) end / totalPages * 80));
        }
        return results;
    }

    private List<File> splitBySize(PDDocument source, int totalPages, int maxMb, Job job) throws IOException {
        long maxBytes = (long) maxMb * 1024 * 1024;
        List<File> results = new ArrayList<>();
        int chunkIndex = 0;
        int pageIndex = 0;

        while (pageIndex < totalPages) {
            PDDocument chunk = new PDDocument();
            int chunkStart = pageIndex + 1;

            // Add pages until we exceed the limit or run out
            while (pageIndex < totalPages) {
                chunk.addPage(source.getPage(pageIndex));
                pageIndex++;

                // Estimate current chunk size by writing to a temp buffer
                if (chunk.getNumberOfPages() > 1) {
                    ByteArrayOutputStream sizeCheck = new ByteArrayOutputStream();
                    chunk.save(sizeCheck);
                    if (sizeCheck.size() > maxBytes && chunk.getNumberOfPages() > 1) {
                        // Remove last page - it pushed us over
                        chunk.removePage(chunk.getNumberOfPages() - 1);
                        pageIndex--;
                        break;
                    }
                }
            }

            File out = tempPdf("chunk_" + (++chunkIndex) + "_pages" + chunkStart + "-" + pageIndex);
            chunk.save(out);
            chunk.close();
            results.add(out);
            jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING,
                    10 + (int) ((double) pageIndex / totalPages * 80));
        }
        return results;
    }

    private File tempPdf(String label) throws IOException {
        return Files.createTempFile(
                Paths.get(fileUploadService.getTempDir()),
                label + "_", ".pdf").toFile();
    }

    private String packageAsZip(List<File> files, Job job) throws IOException {
        String zipName = UUID.randomUUID() + ".zip";
        Path zipPath = Paths.get(fileUploadService.getTempDir(), zipName);

        try (ZipOutputStream zos = new ZipOutputStream(new FileOutputStream(zipPath.toFile()))) {
            for (int i = 0; i < files.size(); i++) {
                File f = files.get(i);
                zos.putNextEntry(new ZipEntry(f.getName()));
                Files.copy(f.toPath(), zos);
                zos.closeEntry();
                // Clean up temp split file
                f.delete();
            }
        }

        jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 95);
        log.info("Packaged {} split files into ZIP: {}", files.size(), zipPath);
        return zipPath.toString();
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

        // Parse compression parameters
        String level = params != null ? params.getOrDefault("level", "recommended") : "recommended";
        String dpiParam = params != null ? params.get("dpi") : null;
        boolean removeMetadata = params != null && "true".equalsIgnoreCase(params.get("removeMetadata"));

        // Determine target DPI and JPEG quality from preset
        int targetDpi;
        float jpegQuality;
        switch (level.toLowerCase()) {
            case "extreme" -> { targetDpi = 72;  jpegQuality = 0.3f; }
            case "low"     -> { targetDpi = 300; jpegQuality = 0.75f; }
            default        -> { targetDpi = 150; jpegQuality = 0.5f; } // "recommended"
        }

        // Override DPI if explicitly provided
        if (dpiParam != null && !dpiParam.isEmpty()) {
            targetDpi = Integer.parseInt(dpiParam);
        }

        File inputFile = new File(job.getInputFilePath());
        long originalSize = inputFile.length();

        try (PDDocument document = Loader.loadPDF(inputFile)) {
            int totalPages = document.getNumberOfPages();
            jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 15);

            // Compress images on each page
            for (int i = 0; i < totalPages; i++) {
                PDPage page = document.getPage(i);
                compressPageImages(document, page, targetDpi, jpegQuality);

                int progress = 15 + (int) ((double) (i + 1) / totalPages * 65);
                jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, progress);
            }

            // Remove metadata if requested
            if (removeMetadata) {
                document.getDocumentInformation().setTitle(null);
                document.getDocumentInformation().setAuthor(null);
                document.getDocumentInformation().setSubject(null);
                document.getDocumentInformation().setKeywords(null);
                document.getDocumentInformation().setCreator(null);
                document.getDocumentInformation().setProducer(null);
            }

            jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 85);
            document.save(outputPath.toFile());
        }

        long compressedSize = Files.size(outputPath);
        log.info("Compression complete: {} → {} bytes ({}% reduction), level={}, dpi={}",
                originalSize, compressedSize,
                originalSize > 0 ? (100 - (compressedSize * 100 / originalSize)) : 0,
                level, targetDpi);

        // Store sizes in the job so the frontend can display them
        job.setFileSizeBytes(originalSize);
        // Encode compression result in a parseable format in the error message field (reused as metadata)
        // Format: "compressed:originalBytes:compressedBytes"
        jobService.setJobMessage(job.getId(),
                "compressed:" + originalSize + ":" + compressedSize);

        return outputPath.toString();
    }

    /**
     * Compress all image XObjects on a page by re-encoding them as JPEG.
     */
    private void compressPageImages(PDDocument document, PDPage page, int targetDpi, float jpegQuality) {
        try {
            PDResources resources = page.getResources();
            if (resources == null) return;

            for (COSName name : resources.getXObjectNames()) {
                PDXObject xObject = resources.getXObject(name);
                if (xObject instanceof PDImageXObject image) {
                    try {
                        BufferedImage bufferedImage = image.getImage();
                        if (bufferedImage == null) continue;

                        // Skip tiny images (icons, logos) — compress only images > 100px
                        if (bufferedImage.getWidth() < 100 && bufferedImage.getHeight() < 100) {
                            continue;
                        }

                        // Calculate scale factor based on target DPI
                        // Assume original images are at 300 DPI (common for scanned docs)
                        float scale = Math.min(1.0f, targetDpi / 300.0f);
                        int newWidth = Math.max(1, (int) (bufferedImage.getWidth() * scale));
                        int newHeight = Math.max(1, (int) (bufferedImage.getHeight() * scale));

                        // Scale down
                        BufferedImage scaled = new BufferedImage(newWidth, newHeight, BufferedImage.TYPE_INT_RGB);
                        Graphics2D g2d = scaled.createGraphics();
                        g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                                RenderingHints.VALUE_INTERPOLATION_BILINEAR);
                        g2d.drawImage(bufferedImage, 0, 0, newWidth, newHeight, null);
                        g2d.dispose();

                        // Re-encode as JPEG
                        ByteArrayOutputStream baos = new ByteArrayOutputStream();
                        ImageWriter jpegWriter = ImageIO.getImageWritersByFormatName("jpeg").next();
                        ImageWriteParam writeParam = jpegWriter.getDefaultWriteParam();
                        writeParam.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                        writeParam.setCompressionQuality(jpegQuality);
                        jpegWriter.setOutput(ImageIO.createImageOutputStream(baos));
                        jpegWriter.write(null, new IIOImage(scaled, null, null), writeParam);
                        jpegWriter.dispose();

                        // Replace the image XObject with the compressed version
                        PDImageXObject newImage = PDImageXObject.createFromByteArray(
                                document, baos.toByteArray(), name.getName());
                        resources.put(name, newImage);
                    } catch (Exception e) {
                        // Skip images that can't be processed (encrypted, unsupported format, etc.)
                        log.debug("Skipping image {} on page: {}", name.getName(), e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Could not process page resources: {}", e.getMessage());
        }
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
