package com.opensuite.service;

import com.opensuite.exception.FileProcessingException;
import com.opensuite.model.EditType;
import com.opensuite.model.Job;
import com.opensuite.model.JobStatus;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import javax.imageio.ImageIO;
import java.util.Base64;

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
                case REMOVE_PAGES -> removePages(job, params);
                case EXTRACT_PAGES -> extractPages(job, params);
                case ORGANIZE_PAGES -> organizePages(job, params);
                case REPAIR -> repairPdf(job);
                case SIGN -> signPdf(job, params);
                case COMPARE -> comparePdfs(job);
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
        merger.mergeDocuments(MemoryUsageSetting.setupTempFileOnly());
        return outputPath.toString();
    }

    // ── SPLIT ────────────────────────────────────────────────────────────

    private String splitPdf(Job job, Map<String, String> params) throws IOException {
        String splitMode = params != null ? params.getOrDefault("splitMode", "ranges") : "ranges";
        File inputFile = new File(job.getInputFilePath());

        try (PDDocument document = PDDocument.load(inputFile)) {
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
        try (PDDocument document = PDDocument.load(inputFile)) {
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
        try (PDDocument document = PDDocument.load(inputFile)) {
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
        try (PDDocument document = PDDocument.load(inputFile)) {
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
        try (PDDocument document = PDDocument.load(inputFile)) {
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
        try (PDDocument source = PDDocument.load(inputFile);
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

    // ── REMOVE PAGES ─────────────────────────────────────────────────────

    private String removePages(Job job, Map<String, String> params) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        String mode = params != null ? params.getOrDefault("mode", "selected") : "selected";
        File inputFile = new File(job.getInputFilePath());

        try (PDDocument document = PDDocument.load(inputFile)) {
            int totalPages = document.getNumberOfPages();
            Set<Integer> pagesToRemove;

            switch (mode) {
                case "odd" -> {
                    pagesToRemove = new TreeSet<>();
                    for (int i = 0; i < totalPages; i += 2) pagesToRemove.add(i); // 0-indexed odd pages (1,3,5...)
                }
                case "even" -> {
                    pagesToRemove = new TreeSet<>();
                    for (int i = 1; i < totalPages; i += 2) pagesToRemove.add(i); // 0-indexed even pages (2,4,6...)
                }
                case "blank" -> pagesToRemove = detectBlankPages(document, totalPages);
                default -> { // "selected"
                    String pages = params != null ? params.get("pages") : null;
                    if (pages == null || pages.isBlank()) {
                        throw new FileProcessingException("No pages specified for removal");
                    }
                    pagesToRemove = parsePageRanges(pages, totalPages);
                }
            }

            if (pagesToRemove.size() >= totalPages) {
                throw new FileProcessingException("Cannot remove all pages from the document");
            }

            // Remove in reverse order to maintain indices
            List<Integer> sorted = new ArrayList<>(pagesToRemove);
            sorted.sort(Collections.reverseOrder());
            for (int pageIndex : sorted) {
                if (pageIndex >= 0 && pageIndex < document.getNumberOfPages()) {
                    document.removePage(pageIndex);
                }
            }

            document.save(outputPath.toFile());
            log.info("Removed {} pages from PDF, {} remaining", pagesToRemove.size(), document.getNumberOfPages());
        }

        return outputPath.toString();
    }

    private Set<Integer> detectBlankPages(PDDocument document, int totalPages) throws IOException {
        Set<Integer> blankPages = new TreeSet<>();
        PDFTextStripper stripper = new PDFTextStripper();
        PDFRenderer renderer = new PDFRenderer(document);

        for (int i = 0; i < totalPages; i++) {
            // Check text content
            stripper.setStartPage(i + 1);
            stripper.setEndPage(i + 1);
            String text = stripper.getText(document).trim();

            if (text.isEmpty()) {
                // Also check for visual content by rendering at low DPI
                BufferedImage img = renderer.renderImageWithDPI(i, 36); // Very low DPI for speed
                if (isImageBlank(img)) {
                    blankPages.add(i);
                }
            }

            if (i % 10 == 0) {
                log.debug("Blank page detection progress: {}/{}", i + 1, totalPages);
            }
        }

        log.info("Detected {} blank pages out of {}", blankPages.size(), totalPages);
        return blankPages;
    }

    private boolean isImageBlank(BufferedImage img) {
        int width = img.getWidth();
        int height = img.getHeight();
        int sampleStep = Math.max(1, Math.min(width, height) / 20); // Sample ~400 pixels max
        int nonWhiteCount = 0;
        int threshold = 5; // Allow up to 5 non-white pixels (noise tolerance)

        for (int y = 0; y < height; y += sampleStep) {
            for (int x = 0; x < width; x += sampleStep) {
                int rgb = img.getRGB(x, y);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int b = rgb & 0xFF;
                // Check if pixel is NOT white-ish (allowing some margin)
                if (r < 240 || g < 240 || b < 240) {
                    nonWhiteCount++;
                    if (nonWhiteCount > threshold) return false;
                }
            }
        }
        return true;
    }

    // ── EXTRACT PAGES ────────────────────────────────────────────────────

    private String extractPages(Job job, Map<String, String> params) throws IOException {
        String extractMode = params != null ? params.getOrDefault("extractMode", "single") : "single";
        String pages = params != null ? params.get("pages") : null;

        File inputFile = new File(job.getInputFilePath());

        try (PDDocument source = Loader.loadPDF(inputFile)) {
            int totalPages = source.getNumberOfPages();

            if (pages == null || pages.isBlank()) {
                throw new FileProcessingException("No pages specified for extraction");
            }

            Set<Integer> pageSet = parsePageRanges(pages, totalPages);
            if (pageSet.isEmpty()) {
                throw new FileProcessingException("No valid pages found in the specified range");
            }

            List<Integer> sortedPages = new ArrayList<>(pageSet);
            Collections.sort(sortedPages);

            if ("separate".equals(extractMode)) {
                // Each page as a separate PDF, packaged as ZIP
                List<File> separateFiles = new ArrayList<>();
                for (int i = 0; i < sortedPages.size(); i++) {
                    int pageIndex = sortedPages.get(i);
                    try (PDDocument singleDoc = new PDDocument()) {
                        singleDoc.addPage(source.getPage(pageIndex));
                        File out = tempPdf("page_" + (pageIndex + 1));
                        singleDoc.save(out);
                        separateFiles.add(out);
                    }
                    jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING,
                            10 + (int) ((double) (i + 1) / sortedPages.size() * 80));
                }
                return packageAsZip(separateFiles, job);
            } else {
                // Single PDF with all extracted pages
                String outputName = UUID.randomUUID() + ".pdf";
                Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

                try (PDDocument extractedDoc = new PDDocument()) {
                    for (int i = 0; i < sortedPages.size(); i++) {
                        int pageIndex = sortedPages.get(i);
                        extractedDoc.addPage(source.getPage(pageIndex));
                        jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING,
                                10 + (int) ((double) (i + 1) / sortedPages.size() * 80));
                    }
                    extractedDoc.save(outputPath.toFile());
                }

                log.info("Extracted {} pages into single PDF", sortedPages.size());
                return outputPath.toString();
            }
        }
    }

    // ── ORGANIZE PAGES ───────────────────────────────────────────────────

    private String organizePages(Job job, Map<String, String> params) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        File inputFile = new File(job.getInputFilePath());

        // Accepted params:
        //   order       — comma-separated 1-indexed page order (e.g. "3,1,2")
        //   rotations   — comma-separated "pageNum:degrees" (e.g. "1:90,3:180")
        //   duplicates  — comma-separated 1-indexed pages to duplicate (e.g. "2,5")
        //   removals    — comma-separated range of pages to remove (e.g. "3,5-7")
        //   insertBlanks— comma-separated positions to insert blank pages after (1-indexed)

        try (PDDocument source = PDDocument.load(inputFile);
                PDDocument result = new PDDocument()) {

            int pageCount = source.getNumberOfPages();

            // Step 1: Determine page order
            List<Integer> order = new ArrayList<>();
            String orderStr = params != null ? params.get("order") : null;
            if (orderStr != null && !orderStr.isBlank()) {
                for (String idx : orderStr.split(",")) {
                    int pageIndex = Integer.parseInt(idx.trim()) - 1;
                    if (pageIndex >= 0 && pageIndex < pageCount) {
                        order.add(pageIndex);
                    }
                }
            } else {
                for (int i = 0; i < pageCount; i++) order.add(i);
            }

            // Step 2: Apply removals to the order list
            String removalsStr = params != null ? params.get("removals") : null;
            if (removalsStr != null && !removalsStr.isBlank()) {
                Set<Integer> removals = parsePageRanges(removalsStr, pageCount);
                order.removeIf(removals::contains);
            }

            if (order.isEmpty()) {
                throw new FileProcessingException("Cannot remove all pages from the document");
            }

            // Step 3: Build result document from order
            for (int pageIndex : order) {
                result.addPage(source.getPage(pageIndex));
            }

            // Step 4: Apply rotations
            String rotationsStr = params != null ? params.get("rotations") : null;
            if (rotationsStr != null && !rotationsStr.isBlank()) {
                // Map original page indices to result indices
                Map<Integer, Integer> originalToResult = new HashMap<>();
                for (int i = 0; i < order.size(); i++) {
                    originalToResult.put(order.get(i), i);
                }

                for (String rotation : rotationsStr.split(",")) {
                    String[] parts = rotation.trim().split(":");
                    if (parts.length == 2) {
                        int origPage = Integer.parseInt(parts[0].trim()) - 1; // 1-indexed input
                        int degrees = Integer.parseInt(parts[1].trim());
                        Integer resultIdx = originalToResult.get(origPage);
                        if (resultIdx != null && resultIdx < result.getNumberOfPages()) {
                            PDPage page = result.getPage(resultIdx);
                            page.setRotation((page.getRotation() + degrees) % 360);
                        }
                    }
                }
            }

            // Step 5: Duplicate pages (insert duplicates after the original)
            String duplicatesStr = params != null ? params.get("duplicates") : null;
            if (duplicatesStr != null && !duplicatesStr.isBlank()) {
                // Parse and sort in reverse to maintain indices
                List<Integer> dupPages = new ArrayList<>();
                for (String idx : duplicatesStr.split(",")) {
                    int origPage = Integer.parseInt(idx.trim()) - 1;
                    // Find the result index for this original page
                    for (int i = 0; i < order.size(); i++) {
                        if (order.get(i) == origPage) {
                            dupPages.add(i);
                            break;
                        }
                    }
                }
                dupPages.sort(Collections.reverseOrder());

                for (int resultIdx : dupPages) {
                    if (resultIdx < result.getNumberOfPages()) {
                        PDPage original = result.getPage(resultIdx);
                        PDPage copy = new PDPage(original.getMediaBox());
                        // Copy rotation
                        copy.setRotation(original.getRotation());
                        result.getPages().insertAfter(copy, original);
                    }
                }
            }

            // Step 6: Insert blank pages
            String insertBlanksStr = params != null ? params.get("insertBlanks") : null;
            if (insertBlanksStr != null && !insertBlanksStr.isBlank()) {
                List<Integer> insertPositions = new ArrayList<>();
                for (String pos : insertBlanksStr.split(",")) {
                    insertPositions.add(Integer.parseInt(pos.trim()) - 1); // 1-indexed → 0-indexed
                }
                insertPositions.sort(Collections.reverseOrder());

                for (int pos : insertPositions) {
                    PDPage blankPage = new PDPage(PDRectangle.A4);
                    if (pos >= 0 && pos < result.getNumberOfPages()) {
                        result.getPages().insertAfter(blankPage, result.getPage(pos));
                    } else if (pos >= result.getNumberOfPages()) {
                        result.addPage(blankPage);
                    }
                }
            }

            result.save(outputPath.toFile());
            log.info("Organize completed: {} pages in result", result.getNumberOfPages());
        }

        return outputPath.toString();
    }

    // ── UTILITIES ────────────────────────────────────────────────────────

    /**
     * Parses page range strings like "1,3,5-10,15-20" into a Set of 0-indexed page numbers.
     */
    private Set<Integer> parsePageRanges(String ranges, int totalPages) {
        Set<Integer> pages = new TreeSet<>();
        for (String part : ranges.split(",")) {
            part = part.trim();
            if (part.isEmpty()) continue;

            if (part.contains("-")) {
                String[] bounds = part.split("-");
                int start = Math.max(1, Integer.parseInt(bounds[0].trim()));
                int end = Math.min(totalPages, Integer.parseInt(bounds[1].trim()));
                for (int p = start; p <= end; p++) {
                    pages.add(p - 1); // Convert to 0-indexed
                }
            } else {
                int p = Integer.parseInt(part);
                if (p >= 1 && p <= totalPages) {
                    pages.add(p - 1); // Convert to 0-indexed
                }
            }
        }
        return pages;
    }

    // ── REPAIR PDF ───────────────────────────────────────────────────────

    private String repairPdf(Job job) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        File inputFile = new File(job.getInputFilePath());

        try {
            // Attempt to load with lenient parsing
            try (PDDocument document = PDDocument.load(inputFile)) {
                int originalPages = document.getNumberOfPages();
                log.info("Repair: loaded PDF with {} pages", originalPages);

                jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 30);

                // Remove invalid objects by iterating pages
                List<Integer> invalidPages = new ArrayList<>();
                for (int i = 0; i < document.getNumberOfPages(); i++) {
                    try {
                        PDPage page = document.getPage(i);
                        // Access page content to verify it's valid
                        page.getMediaBox();
                        page.getCOSObject();
                    } catch (Exception e) {
                        invalidPages.add(i);
                        log.warn("Repair: page {} is invalid: {}", i + 1, e.getMessage());
                    }
                }

                jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 50);

                // Remove invalid pages in reverse order
                for (int i = invalidPages.size() - 1; i >= 0; i--) {
                    try {
                        document.removePage(invalidPages.get(i));
                    } catch (Exception e) {
                        log.warn("Could not remove invalid page {}: {}", invalidPages.get(i) + 1, e.getMessage());
                    }
                }

                jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 70);

                // Rebuild cross-reference table by saving fresh
                document.setAllSecurityToBeRemoved(true);

                jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 85);
                document.save(outputPath.toFile());

                log.info("Repair completed: {} original pages, {} invalid removed, {} in result",
                        originalPages, invalidPages.size(), document.getNumberOfPages());
            }
        } catch (Exception e) {
            log.error("Repair failed during initial load, attempting byte-level recovery: {}", e.getMessage());
            // Attempt deep repair: create a new document and copy what we can
            try {
                attemptDeepRepair(inputFile, outputPath);
            } catch (Exception deepError) {
                throw new FileProcessingException("PDF repair failed: " + e.getMessage());
            }
        }

        return outputPath.toString();
    }

    private void attemptDeepRepair(File inputFile, Path outputPath) throws IOException {
        // Try to extract any readable content from the damaged file
        byte[] rawBytes = Files.readAllBytes(inputFile.toPath());

        // Look for PDF header
        String header = new String(rawBytes, 0, Math.min(rawBytes.length, 1024));
        if (!header.contains("%PDF")) {
            throw new FileProcessingException("File does not appear to be a PDF");
        }

        // Create a minimal valid PDF as recovery output
        try (PDDocument recovered = new PDDocument()) {
            PDPage page = new PDPage();
            recovered.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(recovered, page)) {
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 14);
                cs.newLineAtOffset(50, 700);
                cs.showText("PDF Repair Notice");
                cs.endText();

                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 11);
                cs.newLineAtOffset(50, 670);
                cs.showText("The original PDF was severely damaged and could not be fully recovered.");
                cs.endText();

                cs.beginText();
                cs.newLineAtOffset(50, 645);
                cs.showText("File size: " + rawBytes.length + " bytes");
                cs.endText();
            }
            recovered.save(outputPath.toFile());
        }

        log.warn("Deep repair produced a minimal recovery PDF for the damaged file");
    }

    // ── SIGN PDF ─────────────────────────────────────────────────────────

    private String signPdf(Job job, Map<String, String> params) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        File inputFile = new File(job.getInputFilePath());

        // Parse parameters
        int pageNum = params != null && params.containsKey("page") ? Integer.parseInt(params.get("page")) : 1;
        float x = params != null && params.containsKey("x") ? Float.parseFloat(params.get("x")) : 50;
        float y = params != null && params.containsKey("y") ? Float.parseFloat(params.get("y")) : 50;
        float width = params != null && params.containsKey("width") ? Float.parseFloat(params.get("width")) : 200;
        float height = params != null && params.containsKey("height") ? Float.parseFloat(params.get("height")) : 80;
        String signerName = params != null ? params.getOrDefault("name", "") : "";
        String date = params != null ? params.getOrDefault("date", "") : "";
        String signatureData = params != null ? params.get("signatureData") : null;

        try (PDDocument document = PDDocument.load(inputFile)) {
            int totalPages = document.getNumberOfPages();
            int pageIndex = Math.max(0, Math.min(pageNum - 1, totalPages - 1));
            PDPage page = document.getPage(pageIndex);

            jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 30);

            try (PDPageContentStream cs = new PDPageContentStream(
                    document, page, PDPageContentStream.AppendMode.APPEND, true, true)) {

                // Draw signature image if provided
                if (signatureData != null && !signatureData.isEmpty()) {
                    try {
                        // Handle data URL format (data:image/png;base64,...)
                        String base64Data = signatureData;
                        if (base64Data.contains(",")) {
                            base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
                        }

                        byte[] imageBytes = Base64.getDecoder().decode(base64Data);
                        org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject signatureImage =
                                org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject.createFromByteArray(
                                        document, imageBytes, "signature");

                        cs.drawImage(signatureImage, x, y, width, height);
                    } catch (Exception e) {
                        log.warn("Could not draw signature image: {}", e.getMessage());
                        // Fall back to text rendering
                        cs.setNonStrokingColor(0, 0, 100);
                        cs.beginText();
                        cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_OBLIQUE), 20);
                        cs.newLineAtOffset(x, y + height / 2);
                        cs.showText(signerName.isEmpty() ? "[Signature]" : signerName);
                        cs.endText();
                    }
                } else if (!signerName.isEmpty()) {
                    // Draw typed signature
                    cs.setNonStrokingColor(0, 0, 100);
                    cs.beginText();
                    cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_OBLIQUE), 20);
                    cs.newLineAtOffset(x, y + height / 2);
                    cs.showText(signerName);
                    cs.endText();
                }

                // Draw name and date below signature
                float textY = y - 5;
                cs.setNonStrokingColor(0, 0, 0);
                PDType1Font smallFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

                if (!signerName.isEmpty()) {
                    cs.beginText();
                    cs.setFont(smallFont, 9);
                    cs.newLineAtOffset(x, textY);
                    cs.showText("Signed by: " + signerName);
                    cs.endText();
                    textY -= 12;
                }

                if (!date.isEmpty()) {
                    cs.beginText();
                    cs.setFont(smallFont, 9);
                    cs.newLineAtOffset(x, textY);
                    cs.showText("Date: " + date);
                    cs.endText();
                }

                // Draw a subtle signature line
                cs.setStrokingColor(100, 100, 100);
                cs.setLineWidth(0.5f);
                cs.moveTo(x, y);
                cs.lineTo(x + width, y);
                cs.stroke();
            }

            jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 80);
            document.save(outputPath.toFile());
        }

        log.info("PDF signed on page {} at ({}, {})", pageNum, x, y);
        return outputPath.toString();
    }

    // ── COMPARE PDFs ─────────────────────────────────────────────────────

    private String comparePdfs(Job job) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        Path batchDir = Paths.get(job.getInputFilePath());
        if (!Files.isDirectory(batchDir)) {
            throw new FileProcessingException("Expected a batch directory with 2 PDF files for comparison");
        }

        List<Path> pdfFiles = Files.list(batchDir)
                .filter(p -> p.toString().toLowerCase().endsWith(".pdf"))
                .sorted()
                .toList();

        if (pdfFiles.size() != 2) {
            throw new FileProcessingException("Exactly 2 PDF files are required for comparison, found: " + pdfFiles.size());
        }

        jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 20);

        try (PDDocument doc1 = PDDocument.load(pdfFiles.get(0).toFile());
             PDDocument doc2 = PDDocument.load(pdfFiles.get(1).toFile());
             PDDocument report = new PDDocument()) {

            int pages1 = doc1.getNumberOfPages();
            int pages2 = doc2.getNumberOfPages();
            int maxPages = Math.max(pages1, pages2);
            int minPages = Math.min(pages1, pages2);

            PDFTextStripper stripper = new PDFTextStripper();
            PDFRenderer renderer1 = new PDFRenderer(doc1);
            PDFRenderer renderer2 = new PDFRenderer(doc2);

            // Summary page
            PDPage summaryPage = new PDPage(PDRectangle.A4);
            report.addPage(summaryPage);
            try (PDPageContentStream cs = new PDPageContentStream(report, summaryPage)) {
                PDType1Font boldFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
                PDType1Font regularFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
                float margin = 50;
                float yPos = PDRectangle.A4.getHeight() - margin;

                cs.beginText();
                cs.setFont(boldFont, 18);
                cs.newLineAtOffset(margin, yPos);
                cs.showText("PDF Comparison Report");
                cs.endText();
                yPos -= 30;

                cs.beginText();
                cs.setFont(regularFont, 11);
                cs.newLineAtOffset(margin, yPos);
                cs.showText("Document 1: " + pdfFiles.get(0).getFileName() + " (" + pages1 + " pages)");
                cs.endText();
                yPos -= 16;

                cs.beginText();
                cs.setFont(regularFont, 11);
                cs.newLineAtOffset(margin, yPos);
                cs.showText("Document 2: " + pdfFiles.get(1).getFileName() + " (" + pages2 + " pages)");
                cs.endText();
                yPos -= 16;

                if (pages1 != pages2) {
                    cs.beginText();
                    cs.setFont(boldFont, 11);
                    cs.setNonStrokingColor(200, 0, 0);
                    cs.newLineAtOffset(margin, yPos);
                    cs.showText("Page count differs: " + pages1 + " vs " + pages2);
                    cs.endText();
                    yPos -= 16;
                    cs.setNonStrokingColor(0, 0, 0);
                }

                // Compare text per page
                yPos -= 20;
                cs.beginText();
                cs.setFont(boldFont, 14);
                cs.newLineAtOffset(margin, yPos);
                cs.showText("Text Differences by Page");
                cs.endText();
                yPos -= 20;

                int totalDiffs = 0;

                for (int i = 0; i < minPages; i++) {
                    stripper.setStartPage(i + 1);
                    stripper.setEndPage(i + 1);
                    String text1 = stripper.getText(doc1).trim();
                    String text2 = stripper.getText(doc2).trim();

                    if (!text1.equals(text2)) {
                        totalDiffs++;
                        if (yPos > margin + 30) {
                            cs.beginText();
                            cs.setFont(regularFont, 10);
                            cs.setNonStrokingColor(200, 100, 0);
                            cs.newLineAtOffset(margin, yPos);
                            cs.showText("Page " + (i + 1) + ": Text differs");
                            cs.endText();
                            yPos -= 14;
                            cs.setNonStrokingColor(0, 0, 0);
                        }
                    }

                    if (i % 5 == 0) {
                        int progress = 20 + (int) ((double) i / maxPages * 60);
                        jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, Math.min(progress, 80));
                    }
                }

                yPos -= 10;
                cs.beginText();
                cs.setFont(boldFont, 11);
                cs.newLineAtOffset(margin, yPos > margin ? yPos : margin + 20);
                cs.showText("Total pages with text differences: " + totalDiffs + " of " + minPages);
                cs.endText();
            }

            jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 70);

            // Visual comparison: render pages and create diff images
            for (int i = 0; i < Math.min(minPages, 10); i++) { // Limit to 10 pages for performance
                try {
                    BufferedImage img1 = renderer1.renderImageWithDPI(i, 100);
                    BufferedImage img2 = renderer2.renderImageWithDPI(i, 100);

                    // Create diff image
                    int w = Math.max(img1.getWidth(), img2.getWidth());
                    int h = Math.max(img1.getHeight(), img2.getHeight());
                    BufferedImage diffImage = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
                    Graphics2D g = diffImage.createGraphics();
                    g.drawImage(img1, 0, 0, null);

                    // Highlight differences in red
                    for (int py = 0; py < Math.min(img1.getHeight(), img2.getHeight()); py += 2) {
                        for (int px = 0; px < Math.min(img1.getWidth(), img2.getWidth()); px += 2) {
                            int rgb1 = img1.getRGB(px, py);
                            int rgb2 = img2.getRGB(px, py);
                            if (rgb1 != rgb2) {
                                diffImage.setRGB(px, py, new Color(255, 50, 50, 180).getRGB());
                                if (px + 1 < w) diffImage.setRGB(px + 1, py, new Color(255, 50, 50, 180).getRGB());
                                if (py + 1 < h) diffImage.setRGB(px, py + 1, new Color(255, 50, 50, 180).getRGB());
                            }
                        }
                    }
                    g.dispose();

                    // Add diff page to report
                    PDPage diffPage = new PDPage(new PDRectangle(w, h));
                    report.addPage(diffPage);
                    org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject pdImage =
                            org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory.createFromImage(report, diffImage);
                    try (PDPageContentStream cs = new PDPageContentStream(report, diffPage)) {
                        cs.drawImage(pdImage, 0, 0, w, h);
                    }
                } catch (Exception e) {
                    log.warn("Could not create visual diff for page {}: {}", i + 1, e.getMessage());
                }

                int progress = 70 + (int) ((double) (i + 1) / Math.min(minPages, 10) * 25);
                jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, Math.min(progress, 95));
            }

            report.save(outputPath.toFile());
            log.info("PDF comparison report generated with {} pages", report.getNumberOfPages());
        }

        return outputPath.toString();
    }
}
