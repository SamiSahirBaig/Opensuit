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
import org.apache.pdfbox.pdmodel.graphics.state.PDExtendedGraphicsState;
import org.apache.pdfbox.util.Matrix;
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
import java.util.*;
import java.util.List;
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
                case PAGE_NUMBERS -> addPageNumbers(job, params);
                case REORDER -> reorderPages(job, params);
                case CROP -> cropPdf(job, params);
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

    // ── ROTATE ───────────────────────────────────────────────────────────

    private String rotatePdf(Job job, Map<String, String> params) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        int degrees = params != null && params.containsKey("degrees") ? Integer.parseInt(params.get("degrees")) : 90;
        String target = params != null ? params.getOrDefault("target", "all") : "all";
        String pagesParam = params != null ? params.get("pages") : null;

        File inputFile = new File(job.getInputFilePath());
        try (PDDocument document = Loader.loadPDF(inputFile)) {
            int totalPages = document.getNumberOfPages();
            Set<Integer> targetPages = resolvePageSet(target, pagesParam, totalPages);

            for (int i = 0; i < totalPages; i++) {
                if (targetPages.contains(i)) {
                    PDPage page = document.getPage(i);
                    page.setRotation((page.getRotation() + degrees) % 360);
                }
            }
            document.save(outputPath.toFile());
        }

        return outputPath.toString();
    }

    // ── COMPRESS ─────────────────────────────────────────────────────────

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

    // ── WATERMARK ────────────────────────────────────────────────────────

    private String addWatermark(Job job, Map<String, String> params) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        // Parse watermark parameters
        String watermarkText = params != null && params.containsKey("text") ? params.get("text") : "WATERMARK";
        float fontSize = parseFloat(params, "fontSize", 60f);
        float opacity = parseFloat(params, "opacity", 0.3f);
        String position = params != null ? params.getOrDefault("position", "center") : "center";
        float rotation = parseFloat(params, "rotation", 0f);
        String pageRange = params != null ? params.get("pageRange") : null;

        // Parse color (hex format like #C8C8C8 or just C8C8C8)
        float red = 200f / 255f, green = 200f / 255f, blue = 200f / 255f;
        String colorParam = params != null ? params.get("color") : null;
        if (colorParam != null && !colorParam.isEmpty()) {
            try {
                String hex = colorParam.startsWith("#") ? colorParam.substring(1) : colorParam;
                Color c = new Color(Integer.parseInt(hex, 16));
                red = c.getRed() / 255f;
                green = c.getGreen() / 255f;
                blue = c.getBlue() / 255f;
            } catch (NumberFormatException e) {
                log.debug("Invalid color '{}', using default gray", colorParam);
            }
        }

        File inputFile = new File(job.getInputFilePath());
        try (PDDocument document = Loader.loadPDF(inputFile)) {
            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            int totalPages = document.getNumberOfPages();
            Set<Integer> targetPages = pageRange != null
                    ? parsePageRange(pageRange, totalPages)
                    : allPages(totalPages);

            for (int i = 0; i < totalPages; i++) {
                if (!targetPages.contains(i)) continue;

                PDPage page = document.getPage(i);
                PDRectangle mediaBox = page.getMediaBox();
                try (PDPageContentStream cs = new PDPageContentStream(
                        document, page, PDPageContentStream.AppendMode.APPEND, true, true)) {

                    // Set transparency
                    PDExtendedGraphicsState gs = new PDExtendedGraphicsState();
                    gs.setNonStrokingAlphaConstant(opacity);
                    cs.setGraphicsStateParameters(gs);

                    cs.setFont(font, fontSize);
                    cs.setNonStrokingColor(red, green, blue);

                    // Calculate position
                    float textWidth = font.getStringWidth(watermarkText) / 1000 * fontSize;
                    float textHeight = fontSize;
                    float[] pos = calculateWatermarkPosition(position, mediaBox, textWidth, textHeight);

                    cs.beginText();
                    if (rotation != 0) {
                        // Apply rotation transform around the watermark center
                        double rad = Math.toRadians(rotation);
                        Matrix matrix = Matrix.getRotateInstance(rad, pos[0], pos[1]);
                        cs.setTextMatrix(matrix);
                    } else {
                        cs.newLineAtOffset(pos[0], pos[1]);
                    }
                    cs.showText(watermarkText);
                    cs.endText();
                }
            }
            document.save(outputPath.toFile());
        }

        return outputPath.toString();
    }

    private float[] calculateWatermarkPosition(String position, PDRectangle mediaBox, float textWidth, float textHeight) {
        float pageW = mediaBox.getWidth();
        float pageH = mediaBox.getHeight();
        float margin = 30;

        return switch (position.toLowerCase()) {
            case "top-left", "top_left" -> new float[]{margin, pageH - margin - textHeight};
            case "top-right", "top_right" -> new float[]{pageW - textWidth - margin, pageH - margin - textHeight};
            case "bottom-left", "bottom_left" -> new float[]{margin, margin};
            case "bottom-right", "bottom_right" -> new float[]{pageW - textWidth - margin, margin};
            case "top-center", "top_center" -> new float[]{(pageW - textWidth) / 2, pageH - margin - textHeight};
            case "bottom-center", "bottom_center" -> new float[]{(pageW - textWidth) / 2, margin};
            default -> new float[]{(pageW - textWidth) / 2, (pageH - textHeight) / 2}; // center
        };
    }

    // ── PAGE NUMBERS ─────────────────────────────────────────────────────

    private String addPageNumbers(Job job, Map<String, String> params) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        // Parse parameters
        String position = params != null ? params.getOrDefault("position", "bottom-center") : "bottom-center";
        String format = params != null ? params.getOrDefault("format", "labeled") : "labeled";
        int startNumber = parseInt(params, "startNumber", 1);
        float fontSize = parseFloat(params, "fontSize", 10f);
        float margin = parseFloat(params, "margin", 20f);
        int skipPages = parseInt(params, "skipPages", 0);

        // Parse color
        float red = 0f, green = 0f, blue = 0f;
        String colorParam = params != null ? params.get("fontColor") : null;
        if (colorParam != null && !colorParam.isEmpty()) {
            try {
                String hex = colorParam.startsWith("#") ? colorParam.substring(1) : colorParam;
                Color c = new Color(Integer.parseInt(hex, 16));
                red = c.getRed() / 255f;
                green = c.getGreen() / 255f;
                blue = c.getBlue() / 255f;
            } catch (NumberFormatException e) {
                log.debug("Invalid color '{}', using default black", colorParam);
            }
        }

        File inputFile = new File(job.getInputFilePath());
        try (PDDocument document = Loader.loadPDF(inputFile)) {
            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            int totalPages = document.getNumberOfPages();

            for (int i = skipPages; i < totalPages; i++) {
                PDPage page = document.getPage(i);
                PDRectangle mediaBox = page.getMediaBox();

                int displayNumber = startNumber + (i - skipPages);
                String pageNumText = formatPageNumber(format, displayNumber, totalPages - skipPages);

                try (PDPageContentStream cs = new PDPageContentStream(
                        document, page, PDPageContentStream.AppendMode.APPEND, true, true)) {

                    cs.setFont(font, fontSize);
                    cs.setNonStrokingColor(red, green, blue);

                    float textWidth = font.getStringWidth(pageNumText) / 1000 * fontSize;
                    float[] pos = calculatePageNumberPosition(position, mediaBox, textWidth, fontSize, margin);

                    cs.beginText();
                    cs.newLineAtOffset(pos[0], pos[1]);
                    cs.showText(pageNumText);
                    cs.endText();
                }
            }
            document.save(outputPath.toFile());
        }

        return outputPath.toString();
    }

    private String formatPageNumber(String format, int pageNum, int totalPages) {
        return switch (format.toLowerCase()) {
            case "numeric" -> String.valueOf(pageNum);
            case "roman" -> toRoman(pageNum);
            default -> String.format("Page %d of %d", pageNum, totalPages); // "labeled"
        };
    }

    private String toRoman(int num) {
        String[] thousands = {"", "m", "mm", "mmm"};
        String[] hundreds = {"", "c", "cc", "ccc", "cd", "d", "dc", "dcc", "dccc", "cm"};
        String[] tens = {"", "x", "xx", "xxx", "xl", "l", "lx", "lxx", "lxxx", "xc"};
        String[] ones = {"", "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix"};

        if (num <= 0 || num > 3999) return String.valueOf(num);
        return thousands[num / 1000] + hundreds[(num % 1000) / 100] + tens[(num % 100) / 10] + ones[num % 10];
    }

    private float[] calculatePageNumberPosition(String position, PDRectangle mediaBox,
                                                 float textWidth, float fontSize, float margin) {
        float pageW = mediaBox.getWidth();
        float pageH = mediaBox.getHeight();

        boolean isTop = position.toLowerCase().contains("top");
        float y = isTop ? (pageH - margin) : margin;

        float x;
        if (position.toLowerCase().contains("left")) {
            x = margin;
        } else if (position.toLowerCase().contains("right")) {
            x = pageW - textWidth - margin;
        } else { // center
            x = (pageW - textWidth) / 2;
        }

        return new float[]{x, y};
    }

    // ── CROP ─────────────────────────────────────────────────────────────

    private String cropPdf(Job job, Map<String, String> params) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        String preset = params != null ? params.getOrDefault("preset", "custom") : "custom";
        float topMargin = parseFloat(params, "top", 0f);
        float rightMargin = parseFloat(params, "right", 0f);
        float bottomMargin = parseFloat(params, "bottom", 0f);
        float leftMargin = parseFloat(params, "left", 0f);
        String pagesParam = params != null ? params.get("pages") : null;

        File inputFile = new File(job.getInputFilePath());
        try (PDDocument document = Loader.loadPDF(inputFile)) {
            int totalPages = document.getNumberOfPages();
            Set<Integer> targetPages = pagesParam != null
                    ? parsePageRange(pagesParam, totalPages)
                    : allPages(totalPages);

            for (int i = 0; i < totalPages; i++) {
                if (!targetPages.contains(i)) continue;

                PDPage page = document.getPage(i);
                PDRectangle mediaBox = page.getMediaBox();

                PDRectangle newBox;
                if ("a4".equalsIgnoreCase(preset)) {
                    newBox = PDRectangle.A4;
                } else if ("letter".equalsIgnoreCase(preset)) {
                    newBox = PDRectangle.LETTER;
                } else {
                    // Custom crop using margin values
                    newBox = new PDRectangle(
                            mediaBox.getLowerLeftX() + leftMargin,
                            mediaBox.getLowerLeftY() + bottomMargin,
                            mediaBox.getWidth() - leftMargin - rightMargin,
                            mediaBox.getHeight() - topMargin - bottomMargin
                    );
                }

                page.setCropBox(newBox);
                if ("a4".equalsIgnoreCase(preset) || "letter".equalsIgnoreCase(preset)) {
                    page.setMediaBox(newBox);
                }

                int progress = 10 + (int) ((double) (i + 1) / totalPages * 80);
                jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, progress);
            }
            document.save(outputPath.toFile());
        }

        return outputPath.toString();
    }

    // ── REORDER ──────────────────────────────────────────────────────────

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

    // ── UTILITY HELPERS ──────────────────────────────────────────────────

    /**
     * Resolve which pages to target based on target type and page param.
     * Returns 0-indexed page set.
     */
    private Set<Integer> resolvePageSet(String target, String pagesParam, int totalPages) {
        Set<Integer> pages = new HashSet<>();
        switch (target.toLowerCase()) {
            case "odd" -> {
                for (int i = 0; i < totalPages; i += 2) pages.add(i);
            }
            case "even" -> {
                for (int i = 1; i < totalPages; i += 2) pages.add(i);
            }
            case "custom" -> {
                if (pagesParam != null) {
                    pages = parsePageRange(pagesParam, totalPages);
                } else {
                    pages = allPages(totalPages);
                }
            }
            default -> pages = allPages(totalPages); // "all"
        }
        return pages;
    }

    /**
     * Parse page range string like "1,3,5-8" into 0-indexed page set.
     */
    private Set<Integer> parsePageRange(String rangeStr, int totalPages) {
        Set<Integer> pages = new HashSet<>();
        if (rangeStr == null || rangeStr.isEmpty()) return allPages(totalPages);

        for (String part : rangeStr.split(",")) {
            part = part.trim();
            if (part.contains("-")) {
                String[] bounds = part.split("-");
                int start = Integer.parseInt(bounds[0].trim()) - 1;
                int end = Integer.parseInt(bounds[1].trim()) - 1;
                for (int i = Math.max(0, start); i <= Math.min(totalPages - 1, end); i++) {
                    pages.add(i);
                }
            } else {
                int page = Integer.parseInt(part) - 1;
                if (page >= 0 && page < totalPages) {
                    pages.add(page);
                }
            }
        }
        return pages;
    }

    private Set<Integer> allPages(int totalPages) {
        Set<Integer> pages = new HashSet<>();
        for (int i = 0; i < totalPages; i++) pages.add(i);
        return pages;
    }

    private float parseFloat(Map<String, String> params, String key, float defaultValue) {
        if (params == null || !params.containsKey(key)) return defaultValue;
        try {
            return Float.parseFloat(params.get(key));
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    private int parseInt(Map<String, String> params, String key, int defaultValue) {
        if (params == null || !params.containsKey(key)) return defaultValue;
        try {
            return Integer.parseInt(params.get(key));
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }
}
