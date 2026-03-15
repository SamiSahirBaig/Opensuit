package com.opensuite.service;

import com.opensuite.exception.FileProcessingException;
import com.opensuite.model.ConversionType;
import com.opensuite.model.Job;
import com.opensuite.model.JobStatus;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.PDXObject;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.util.Units;
import org.apache.poi.xslf.usermodel.*;
import org.apache.poi.xwpf.usermodel.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.Dimension;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ConversionService {

    private static final Logger log = LoggerFactory.getLogger(ConversionService.class);

    private final JobService jobService;
    private final FileUploadService fileUploadService;
    private final LibreOfficeConverter libreOffice;

    public ConversionService(JobService jobService, FileUploadService fileUploadService,
            LibreOfficeConverter libreOffice) {
        this.jobService = jobService;
        this.fileUploadService = fileUploadService;
        this.libreOffice = libreOffice;
    }

    @Async("taskExecutor")
    public void processConversion(String jobId, ConversionType type) {
        processConversion(jobId, type, false);
    }

    @Async("taskExecutor")
    public void processConversion(String jobId, ConversionType type, boolean useOcr) {
        try {
            jobService.updateJobStatus(jobId, JobStatus.PROCESSING, 10);
            Job job = jobService.getJob(jobId);

            String outputPath = switch (type) {
                case PDF_TO_TXT -> convertPdfToTxt(job);
                case PDF_TO_JPG -> convertPdfToImage(job, "jpg");
                case PDF_TO_PNG -> convertPdfToImage(job, "png");
                case JPG_TO_PDF, PNG_TO_PDF -> convertImageToPdf(job);
                case PDF_TO_HTML -> convertPdfToHtml(job);
                case WORD_TO_PDF -> convertWordToPdf(job);
                case EXCEL_TO_PDF -> convertExcelToPdf(job);
                case PPTX_TO_PDF -> convertPptxToPdf(job);
                case PDF_TO_WORD -> convertPdfToWord(job, useOcr);
                case PDF_TO_EXCEL -> convertPdfToExcel(job, useOcr);
                case PDF_TO_PPTX -> convertPdfToPptx(job);
                case TXT_TO_PDF -> convertTxtToPdf(job);
                case HTML_TO_PDF -> convertHtmlToPdf(job);
                case PDF_TO_EPUB -> convertViaLibreOffice(job, "epub");
                case EPUB_TO_PDF -> convertViaLibreOffice(job, "pdf");
                case PDF_TO_PDFA -> convertViaLibreOffice(job, "pdf");
                case CSV_TO_PDF -> convertCsvToPdf(job);
            };

            jobService.setOutputFile(jobId, outputPath);
            jobService.updateJobStatus(jobId, JobStatus.COMPLETED, 100);
            log.info("Conversion completed: {} for job {}", type, jobId);

        } catch (Exception e) {
            log.error("Conversion failed for job {}: {}", jobId, e.getMessage(), e);
            jobService.failJob(jobId, "Conversion failed: " + e.getMessage());
        }
    }

    // ============== LibreOffice generic conversion ==============

    private String convertViaLibreOffice(Job job, String outputFormat) throws IOException {
        if (!libreOffice.isAvailable()) {
            throw new FileProcessingException("LibreOffice is required for this conversion but is not available");
        }
        jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 30);
        Path result = libreOffice.convert(job.getInputFilePath(), outputFormat, fileUploadService.getTempDir());
        jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 80);
        return result.toString();
    }

    // ============== Word to PDF (LibreOffice with POI fallback) ==============

    private String convertWordToPdf(Job job) throws IOException {
        // Prefer LibreOffice for high-fidelity conversion
        if (libreOffice.isAvailable()) {
            log.info("Using LibreOffice for Word->PDF conversion");
            return convertViaLibreOffice(job, "pdf");
        }

        // Fallback: basic POI-based text extraction to PDF
        log.info("LibreOffice not available, using POI fallback for Word->PDF");
        return convertWordToPdfFallback(job);
    }

    private String convertWordToPdfFallback(Job job) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        try (FileInputStream fis = new FileInputStream(job.getInputFilePath());
                XWPFDocument document = new XWPFDocument(fis);
                PDDocument pdfDoc = new PDDocument()) {

            PDType1Font fontRegular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            PDType1Font fontBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font fontItalic = new PDType1Font(Standard14Fonts.FontName.HELVETICA_OBLIQUE);

            float pageWidth = PDRectangle.A4.getWidth();
            float pageHeight = PDRectangle.A4.getHeight();
            float margin = 50;
            float usableWidth = pageWidth - 2 * margin;
            float lineHeight = 14;
            float fontSize = 11;
            float headingSize = 16;
            float subHeadingSize = 13;

            PDPage currentPage = new PDPage(PDRectangle.A4);
            pdfDoc.addPage(currentPage);
            PDPageContentStream contentStream = new PDPageContentStream(pdfDoc, currentPage);
            float yPosition = pageHeight - margin;

            jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 30);

            for (IBodyElement element : document.getBodyElements()) {
                if (element instanceof XWPFParagraph paragraph) {
                    String text = paragraph.getText().trim();
                    if (text.isEmpty()) {
                        yPosition -= lineHeight;
                        if (yPosition < margin) {
                            contentStream.close();
                            currentPage = new PDPage(PDRectangle.A4);
                            pdfDoc.addPage(currentPage);
                            contentStream = new PDPageContentStream(pdfDoc, currentPage);
                            yPosition = pageHeight - margin;
                        }
                        continue;
                    }

                    String style = paragraph.getStyle();
                    PDType1Font useFont = fontRegular;
                    float useFontSize = fontSize;

                    if (style != null) {
                        if (style.contains("Heading1") || style.equalsIgnoreCase("Heading 1")) {
                            useFont = fontBold;
                            useFontSize = headingSize;
                            yPosition -= lineHeight;
                        } else if (style.contains("Heading2") || style.equalsIgnoreCase("Heading 2") ||
                                style.contains("Heading3") || style.equalsIgnoreCase("Heading 3")) {
                            useFont = fontBold;
                            useFontSize = subHeadingSize;
                            yPosition -= lineHeight * 0.5f;
                        }
                    }

                    boolean isBold = false;
                    boolean isItalic = false;
                    for (XWPFRun run : paragraph.getRuns()) {
                        if (run.isBold())
                            isBold = true;
                        if (run.isItalic())
                            isItalic = true;
                    }
                    if (isBold && useFont == fontRegular)
                        useFont = fontBold;
                    if (isItalic && useFont == fontRegular)
                        useFont = fontItalic;

                    List<String> lines = wrapText(text, useFont, useFontSize, usableWidth);

                    for (String line : lines) {
                        if (yPosition < margin) {
                            contentStream.close();
                            currentPage = new PDPage(PDRectangle.A4);
                            pdfDoc.addPage(currentPage);
                            contentStream = new PDPageContentStream(pdfDoc, currentPage);
                            yPosition = pageHeight - margin;
                        }
                        contentStream.beginText();
                        contentStream.setFont(useFont, useFontSize);
                        contentStream.newLineAtOffset(margin, yPosition);
                        contentStream.showText(line);
                        contentStream.endText();
                        yPosition -= (useFontSize + 3);
                    }
                    yPosition -= 4;

                } else if (element instanceof XWPFTable table) {
                    for (XWPFTableRow row : table.getRows()) {
                        StringBuilder rowText = new StringBuilder();
                        for (XWPFTableCell cell : row.getTableCells()) {
                            if (rowText.length() > 0)
                                rowText.append("  |  ");
                            rowText.append(cell.getText().trim());
                        }
                        if (yPosition < margin) {
                            contentStream.close();
                            currentPage = new PDPage(PDRectangle.A4);
                            pdfDoc.addPage(currentPage);
                            contentStream = new PDPageContentStream(pdfDoc, currentPage);
                            yPosition = pageHeight - margin;
                        }
                        String cellLine = rowText.toString();
                        float textWidth = fontRegular.getStringWidth(cellLine) / 1000 * fontSize;
                        if (textWidth > usableWidth) {
                            int maxChars = (int) (cellLine.length() * usableWidth / textWidth);
                            cellLine = cellLine.substring(0, Math.max(1, maxChars - 3)) + "...";
                        }
                        contentStream.beginText();
                        contentStream.setFont(fontRegular, fontSize);
                        contentStream.newLineAtOffset(margin, yPosition);
                        contentStream.showText(cellLine);
                        contentStream.endText();
                        yPosition -= lineHeight;
                    }
                    yPosition -= 8;
                }
            }

            contentStream.close();
            jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 80);
            pdfDoc.save(outputPath.toFile());
        }
        return outputPath.toString();
    }

    // ============== Excel to PDF (LibreOffice with POI fallback) ==============

    private String convertExcelToPdf(Job job) throws IOException {
        if (libreOffice.isAvailable()) {
            log.info("Using LibreOffice for Excel->PDF conversion");
            return convertViaLibreOffice(job, "pdf");
        }

        log.info("LibreOffice not available, using POI fallback for Excel->PDF");
        return convertExcelToPdfFallback(job);
    }

    private String convertExcelToPdfFallback(Job job) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        try (FileInputStream fis = new FileInputStream(job.getInputFilePath());
                Workbook workbook = WorkbookFactory.create(fis);
                PDDocument pdfDoc = new PDDocument()) {

            PDType1Font fontRegular = new PDType1Font(Standard14Fonts.FontName.COURIER);
            PDType1Font fontBold = new PDType1Font(Standard14Fonts.FontName.COURIER_BOLD);
            float fontSize = 9;
            float lineHeight = 12;
            float margin = 40;
            float pageWidth = PDRectangle.A4.getWidth();
            float pageHeight = PDRectangle.A4.getHeight();

            jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 30);

            for (int sheetIdx = 0; sheetIdx < workbook.getNumberOfSheets(); sheetIdx++) {
                Sheet sheet = workbook.getSheetAt(sheetIdx);
                PDPage currentPage = new PDPage(PDRectangle.A4);
                pdfDoc.addPage(currentPage);
                PDPageContentStream contentStream = new PDPageContentStream(pdfDoc, currentPage);
                float yPosition = pageHeight - margin;

                contentStream.beginText();
                contentStream.setFont(fontBold, 12);
                contentStream.newLineAtOffset(margin, yPosition);
                contentStream.showText("Sheet: " + sheet.getSheetName());
                contentStream.endText();
                yPosition -= 20;

                DataFormatter formatter = new DataFormatter();
                for (Row row : sheet) {
                    if (yPosition < margin) {
                        contentStream.close();
                        currentPage = new PDPage(PDRectangle.A4);
                        pdfDoc.addPage(currentPage);
                        contentStream = new PDPageContentStream(pdfDoc, currentPage);
                        yPosition = pageHeight - margin;
                    }
                    StringBuilder rowText = new StringBuilder();
                    for (Cell cell : row) {
                        if (rowText.length() > 0)
                            rowText.append("  |  ");
                        rowText.append(formatter.formatCellValue(cell));
                    }
                    String line = rowText.toString();
                    float textWidth = fontRegular.getStringWidth(line) / 1000 * fontSize;
                    float usableWidth = pageWidth - 2 * margin;
                    if (textWidth > usableWidth) {
                        int maxChars = (int) (line.length() * usableWidth / textWidth);
                        line = line.substring(0, Math.max(1, maxChars - 3)) + "...";
                    }
                    contentStream.beginText();
                    contentStream.setFont(fontRegular, fontSize);
                    contentStream.newLineAtOffset(margin, yPosition);
                    contentStream.showText(line);
                    contentStream.endText();
                    yPosition -= lineHeight;
                }
                contentStream.close();
            }

            jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 80);
            pdfDoc.save(outputPath.toFile());
        }
        return outputPath.toString();
    }

    // ============== PowerPoint to PDF (LibreOffice with POI fallback)
    // ==============

    private String convertPptxToPdf(Job job) throws IOException {
        if (libreOffice.isAvailable()) {
            log.info("Using LibreOffice for PPTX->PDF conversion");
            return convertViaLibreOffice(job, "pdf");
        }

        log.info("LibreOffice not available, using POI fallback for PPTX->PDF");
        return convertPptxToPdfFallback(job);
    }

    private String convertPptxToPdfFallback(Job job) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        try (FileInputStream fis = new FileInputStream(job.getInputFilePath());
                XMLSlideShow pptx = new XMLSlideShow(fis);
                PDDocument pdfDoc = new PDDocument()) {

            java.awt.Dimension pgSize = pptx.getPageSize();
            int slideWidth = pgSize.width;
            int slideHeight = pgSize.height;
            float scale = 2.0f;
            int renderWidth = (int) (slideWidth * scale);
            int renderHeight = (int) (slideHeight * scale);

            jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 30);

            List<XSLFSlide> slides = pptx.getSlides();
            for (int i = 0; i < slides.size(); i++) {
                XSLFSlide slide = slides.get(i);
                BufferedImage img = new BufferedImage(renderWidth, renderHeight, BufferedImage.TYPE_INT_RGB);
                Graphics2D graphics = img.createGraphics();
                graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                graphics.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
                graphics.setColor(java.awt.Color.WHITE);
                graphics.fillRect(0, 0, renderWidth, renderHeight);
                graphics.scale(scale, scale);
                slide.draw(graphics);
                graphics.dispose();

                PDRectangle pageSize = new PDRectangle(slideWidth, slideHeight);
                PDPage page = new PDPage(pageSize);
                pdfDoc.addPage(page);
                PDImageXObject pdImage = LosslessFactory.createFromImage(pdfDoc, img);
                PDPageContentStream contentStream = new PDPageContentStream(pdfDoc, page);
                contentStream.drawImage(pdImage, 0, 0, slideWidth, slideHeight);
                contentStream.close();

                int progress = 30 + (int) ((double) (i + 1) / slides.size() * 50);
                jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, progress);
            }
            pdfDoc.save(outputPath.toFile());
        }
        return outputPath.toString();
    }

    // ============== PDF to Text ==============

    private String convertPdfToTxt(Job job) throws IOException {
        String outputName = UUID.randomUUID() + ".txt";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        File inputFile = new File(job.getInputFilePath());
        try (PDDocument document = Loader.loadPDF(inputFile)) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);
            Files.writeString(outputPath, text);
        }

        jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 80);
        return outputPath.toString();
    }

    // ============== PDF to Image ==============

    private String convertPdfToImage(Job job, String format) throws IOException {
        String outputName = UUID.randomUUID() + "." + format;
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        File inputFile = new File(job.getInputFilePath());
        try (PDDocument document = Loader.loadPDF(inputFile)) {
            PDFRenderer renderer = new PDFRenderer(document);
            // Render first page at 300 DPI
            BufferedImage image = renderer.renderImageWithDPI(0, 300);
            ImageIO.write(image, format, outputPath.toFile());
        }

        jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 80);
        return outputPath.toString();
    }

    // ============== Image to PDF ==============

    private String convertImageToPdf(Job job) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        BufferedImage image = ImageIO.read(new File(job.getInputFilePath()));
        if (image == null) {
            throw new FileProcessingException("Cannot read image file");
        }

        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(new PDRectangle(image.getWidth(), image.getHeight()));
            document.addPage(page);

            PDPageContentStream contentStream = new PDPageContentStream(document, page);
            PDImageXObject pdImage = LosslessFactory.createFromImage(document, image);
            contentStream.drawImage(pdImage, 0, 0, image.getWidth(), image.getHeight());
            contentStream.close();

            document.save(outputPath.toFile());
        }

        jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 80);
        return outputPath.toString();
    }

    // ============== PDF to HTML (LibreOffice with fallback) ==============

    private String convertPdfToHtml(Job job) throws IOException {
        // Prefer LibreOffice for rich HTML (preserves formatting, images, layout)
        if (libreOffice.isAvailable()) {
            log.info("Using LibreOffice for PDF->HTML conversion");
            return convertViaLibreOffice(job, "html");
        }

        // Fallback: basic text extraction
        log.info("LibreOffice not available, using fallback for PDF->HTML");
        String outputName = UUID.randomUUID() + ".html";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        File inputFile = new File(job.getInputFilePath());
        try (PDDocument document = Loader.loadPDF(inputFile)) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);

            String html = """
                    <!DOCTYPE html>
                    <html lang="en">
                    <head><meta charset="UTF-8"><title>Converted PDF</title>
                    <style>body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;line-height:1.6;}</style>
                    </head>
                    <body>
                    <pre>%s</pre>
                    </body></html>
                    """
                    .formatted(escapeHtml(text));

            Files.writeString(outputPath, html);
        }

        return outputPath.toString();
    }

    // ============== PDF to Word (LibreOffice with enhanced POI fallback) ==============

    private String convertPdfToWord(Job job, boolean useOcr) throws IOException {
        // Prefer LibreOffice for high-fidelity conversion (unless OCR requested)
        if (libreOffice.isAvailable() && !useOcr) {
            log.info("Using LibreOffice for PDF->Word conversion");
            return convertViaLibreOffice(job, "docx");
        }

        log.info("Using enhanced POI fallback for PDF->Word (ocr={})", useOcr);
        String outputName = UUID.randomUUID() + ".docx";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        File inputFile = new File(job.getInputFilePath());
        try (PDDocument pdfDocument = Loader.loadPDF(inputFile)) {
            int totalPages = pdfDocument.getNumberOfPages();
            PDFRenderer renderer = new PDFRenderer(pdfDocument);

            try (XWPFDocument doc = new XWPFDocument()) {
                for (int pageIdx = 0; pageIdx < totalPages; pageIdx++) {
                    // --- Extract text (OCR or direct) ---
                    String pageText;
                    if (useOcr) {
                        pageText = extractTextViaOcr(renderer, pageIdx);
                    } else {
                        PDFTextStripper stripper = new PDFTextStripper();
                        stripper.setStartPage(pageIdx + 1);
                        stripper.setEndPage(pageIdx + 1);
                        pageText = stripper.getText(pdfDocument);
                    }

                    // Page header for multi-page docs
                    if (totalPages > 1) {
                        XWPFParagraph header = doc.createParagraph();
                        XWPFRun headerRun = header.createRun();
                        headerRun.setText("Page " + (pageIdx + 1));
                        headerRun.setBold(true);
                        headerRun.setFontSize(14);
                        headerRun.setFontFamily("Calibri");
                        headerRun.setColor("2563EB");
                    }

                    // --- Extract and embed images from this page ---
                    extractAndEmbedImages(pdfDocument, pageIdx, doc);

                    // --- Process text: detect tables vs paragraphs ---
                    String[] blocks = pageText.split("\\n\\s*\\n");
                    for (String block : blocks) {
                        String trimmed = block.trim();
                        if (trimmed.isEmpty()) continue;

                        String[] lines = trimmed.split("\\n");
                        if (looksLikeTable(lines)) {
                            createWordTable(doc, lines);
                        } else {
                            for (String line : lines) {
                                String lineTrimmed = line.trim();
                                if (lineTrimmed.isEmpty()) continue;

                                XWPFParagraph p = doc.createParagraph();
                                XWPFRun run = p.createRun();
                                run.setText(lineTrimmed);
                                run.setFontFamily("Calibri");

                                // Heuristic: short ALL-CAPS or lines < 60 chars ending without period → heading
                                if (lineTrimmed.length() < 60 && lineTrimmed.equals(lineTrimmed.toUpperCase())
                                        && lineTrimmed.length() > 3) {
                                    run.setBold(true);
                                    run.setFontSize(14);
                                } else {
                                    run.setFontSize(11);
                                }
                            }
                        }
                    }

                    // Page break between pages
                    if (pageIdx < totalPages - 1) {
                        XWPFParagraph pageBreak = doc.createParagraph();
                        pageBreak.setPageBreak(true);
                    }

                    int progress = 10 + (int) ((double) (pageIdx + 1) / totalPages * 70);
                    jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, progress);
                }

                try (FileOutputStream fos = new FileOutputStream(outputPath.toFile())) {
                    doc.write(fos);
                }
            }
        }

        jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 90);
        return outputPath.toString();
    }

    /**
     * Extract images from a PDF page and embed them into the Word document.
     */
    private void extractAndEmbedImages(PDDocument pdfDocument, int pageIdx, XWPFDocument doc) {
        try {
            PDPage page = pdfDocument.getPage(pageIdx);
            PDResources resources = page.getResources();
            if (resources == null) return;

            for (COSName name : resources.getXObjectNames()) {
                PDXObject xObject = resources.getXObject(name);
                if (xObject instanceof PDImageXObject image) {
                    try {
                        BufferedImage bufferedImage = image.getImage();
                        if (bufferedImage == null || bufferedImage.getWidth() < 20) continue;

                        ByteArrayOutputStream imgBytes = new ByteArrayOutputStream();
                        ImageIO.write(bufferedImage, "png", imgBytes);

                        XWPFParagraph imgParagraph = doc.createParagraph();
                        imgParagraph.setAlignment(ParagraphAlignment.CENTER);
                        XWPFRun imgRun = imgParagraph.createRun();

                        // Scale image to fit within page width (max 500px wide)
                        int maxWidth = 500;
                        int w = bufferedImage.getWidth();
                        int h = bufferedImage.getHeight();
                        if (w > maxWidth) {
                            h = (int) ((double) maxWidth / w * h);
                            w = maxWidth;
                        }

                        imgRun.addPicture(
                                new ByteArrayInputStream(imgBytes.toByteArray()),
                                XWPFDocument.PICTURE_TYPE_PNG,
                                name.getName() + ".png",
                                Units.toEMU(w), Units.toEMU(h));
                    } catch (Exception e) {
                        log.debug("Could not extract image {} from page {}: {}", name.getName(), pageIdx, e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Could not process images on page {}: {}", pageIdx, e.getMessage());
        }
    }

    /**
     * Detect if a block of lines looks like a table (consistent delimiters).
     */
    private boolean looksLikeTable(String[] lines) {
        if (lines.length < 2) return false;
        int tabCount = 0, pipeCount = 0, multiSpaceCount = 0;
        for (String line : lines) {
            if (line.contains("\t")) tabCount++;
            if (line.contains("|")) pipeCount++;
            if (line.matches(".*\\S\\s{2,}\\S.*")) multiSpaceCount++;
        }
        // At least 60% of lines have a consistent delimiter
        double threshold = lines.length * 0.6;
        return tabCount >= threshold || pipeCount >= threshold || multiSpaceCount >= threshold;
    }

    /**
     * Create a Word table from lines with detected delimiters.
     */
    private void createWordTable(XWPFDocument doc, String[] lines) {
        // Determine delimiter
        String delimiter;
        int tabCount = 0, pipeCount = 0;
        for (String line : lines) {
            if (line.contains("\t")) tabCount++;
            if (line.contains("|")) pipeCount++;
        }
        if (tabCount >= pipeCount) {
            delimiter = "\t";
        } else if (pipeCount > 0) {
            delimiter = "\\|";
        } else {
            delimiter = "\\s{2,}";
        }

        // Parse rows
        List<String[]> rows = new ArrayList<>();
        int maxCols = 0;
        for (String line : lines) {
            String[] cells = line.split(delimiter);
            // Trim each cell
            for (int i = 0; i < cells.length; i++) {
                cells[i] = cells[i].trim();
            }
            rows.add(cells);
            maxCols = Math.max(maxCols, cells.length);
        }

        if (maxCols == 0 || rows.isEmpty()) return;

        XWPFTable table = doc.createTable(rows.size(), maxCols);
        table.setWidth("100%");

        for (int r = 0; r < rows.size(); r++) {
            XWPFTableRow tableRow = table.getRow(r);
            String[] cells = rows.get(r);
            for (int c = 0; c < maxCols; c++) {
                XWPFTableCell cell = tableRow.getCell(c);
                String value = c < cells.length ? cells[c] : "";
                cell.setText(value);

                // Bold first row (header)
                if (r == 0) {
                    for (XWPFParagraph p : cell.getParagraphs()) {
                        for (XWPFRun run : p.getRuns()) {
                            run.setBold(true);
                        }
                    }
                }
            }
        }

        // Add a spacer paragraph after the table
        doc.createParagraph();
    }

    // ============== PDF to Excel (LibreOffice with enhanced POI fallback) ==============

    private String convertPdfToExcel(Job job, boolean useOcr) throws IOException {
        // Prefer LibreOffice (unless OCR requested)
        if (libreOffice.isAvailable() && !useOcr) {
            log.info("Using LibreOffice for PDF->Excel conversion");
            return convertViaLibreOffice(job, "xlsx");
        }

        log.info("Using enhanced POI fallback for PDF->Excel (ocr={})", useOcr);
        String outputName = UUID.randomUUID() + ".xlsx";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        File inputFile = new File(job.getInputFilePath());
        try (PDDocument pdfDocument = Loader.loadPDF(inputFile)) {
            int totalPages = pdfDocument.getNumberOfPages();
            PDFRenderer renderer = new PDFRenderer(pdfDocument);

            try (Workbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
                CellStyle headerStyle = workbook.createCellStyle();
                Font boldFont = workbook.createFont();
                boldFont.setBold(true);
                headerStyle.setFont(boldFont);

                for (int pageIdx = 0; pageIdx < totalPages; pageIdx++) {
                    // Extract text (OCR or direct)
                    String pageText;
                    if (useOcr) {
                        pageText = extractTextViaOcr(renderer, pageIdx);
                    } else {
                        PDFTextStripper stripper = new PDFTextStripper();
                        stripper.setStartPage(pageIdx + 1);
                        stripper.setEndPage(pageIdx + 1);
                        pageText = stripper.getText(pdfDocument);
                    }

                    String sheetName = totalPages > 1
                            ? "Page " + (pageIdx + 1)
                            : "Extracted Data";
                    Sheet sheet = workbook.createSheet(sheetName);
                    String[] lines = pageText.split("\\n");

                    // Detect best delimiter for this page
                    String delimiter = detectBestDelimiter(lines);

                    int rowIdx = 0;
                    for (String line : lines) {
                        String trimmed = line.trim();
                        if (trimmed.isEmpty()) continue;

                        Row row = sheet.createRow(rowIdx);
                        String[] cells = trimmed.split(delimiter);

                        for (int j = 0; j < cells.length; j++) {
                            Cell cell = row.createCell(j);
                            String value = cells[j].trim();

                            // Try numeric parsing
                            if (value.matches("-?\\d+\\.?\\d*%?")) {
                                try {
                                    String numStr = value.endsWith("%")
                                            ? value.substring(0, value.length() - 1)
                                            : value;
                                    double num = Double.parseDouble(numStr);
                                    if (value.endsWith("%")) num /= 100;
                                    cell.setCellValue(num);
                                } catch (NumberFormatException e) {
                                    cell.setCellValue(value);
                                }
                            } else {
                                cell.setCellValue(value);
                            }

                            // Bold header row
                            if (rowIdx == 0) {
                                cell.setCellStyle(headerStyle);
                            }
                        }
                        rowIdx++;
                    }

                    // Auto-size columns
                    if (rowIdx > 0) {
                        Row firstRow = sheet.getRow(0);
                        if (firstRow != null) {
                            for (int i = 0; i < Math.min(20, firstRow.getLastCellNum()); i++) {
                                sheet.autoSizeColumn(i);
                            }
                        }
                    }

                    int progress = 10 + (int) ((double) (pageIdx + 1) / totalPages * 70);
                    jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, progress);
                }

                try (FileOutputStream fos = new FileOutputStream(outputPath.toFile())) {
                    workbook.write(fos);
                }
            }
        }

        jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 90);
        return outputPath.toString();
    }

    /**
     * Detect the best delimiter for a set of lines.
     */
    private String detectBestDelimiter(String[] lines) {
        int tabScore = 0, pipeScore = 0, multiSpaceScore = 0;
        for (String line : lines) {
            if (line.contains("\t")) tabScore += 3;
            if (line.contains("|")) pipeScore += 2;
            if (line.matches(".*\\S\\s{2,}\\S.*")) multiSpaceScore += 1;
        }
        if (tabScore >= pipeScore && tabScore >= multiSpaceScore) return "\t";
        if (pipeScore >= multiSpaceScore) return "\\|";
        return "\\s{2,}";
    }

    // ============== PDF to PowerPoint (LibreOffice with image fallback) ==============

    private String convertPdfToPptx(Job job) throws IOException {
        // Prefer LibreOffice for high-fidelity conversion
        if (libreOffice.isAvailable()) {
            log.info("Using LibreOffice for PDF->PPTX conversion");
            return convertViaLibreOffice(job, "pptx");
        }

        log.info("Using image-based fallback for PDF->PPTX");
        String outputName = UUID.randomUUID() + ".pptx";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        File inputFile = new File(job.getInputFilePath());
        try (PDDocument pdfDocument = Loader.loadPDF(inputFile);
             XMLSlideShow pptx = new XMLSlideShow()) {

            PDFRenderer renderer = new PDFRenderer(pdfDocument);
            int totalPages = pdfDocument.getNumberOfPages();

            // Set slide size to widescreen (10"x7.5")
            pptx.setPageSize(new Dimension(720, 540));

            for (int pageIdx = 0; pageIdx < totalPages; pageIdx++) {
                // Render page at 200 DPI for good quality
                BufferedImage pageImage = renderer.renderImageWithDPI(pageIdx, 200);

                // Convert to PNG bytes
                ByteArrayOutputStream imgBytes = new ByteArrayOutputStream();
                ImageIO.write(pageImage, "png", imgBytes);

                // Add image to presentation
                XSLFPictureData picData = pptx.addPicture(
                        imgBytes.toByteArray(), XSLFPictureData.PictureType.PNG);

                XSLFSlide slide = pptx.createSlide();
                XSLFPictureShape pic = slide.createPicture(picData);

                // Scale to fit slide
                Dimension slideSize = pptx.getPageSize();
                pic.setAnchor(new java.awt.Rectangle(0, 0, slideSize.width, slideSize.height));

                // Overlay extracted text as a text box
                PDFTextStripper stripper = new PDFTextStripper();
                stripper.setStartPage(pageIdx + 1);
                stripper.setEndPage(pageIdx + 1);
                String pageText = stripper.getText(pdfDocument).trim();

                if (!pageText.isEmpty()) {
                    XSLFTextBox textBox = slide.createTextBox();
                    textBox.setAnchor(new java.awt.Rectangle(20, 20, slideSize.width - 40, slideSize.height - 40));
                    textBox.clearText();

                    // Add text with semi-transparent background for readability
                    XSLFTextParagraph para = textBox.addNewTextParagraph();
                    XSLFTextRun run = para.addNewTextRun();
                    // Truncate very long text to avoid slide overflow
                    String truncated = pageText.length() > 2000
                            ? pageText.substring(0, 2000) + "..."
                            : pageText;
                    run.setText(truncated);
                    run.setFontSize(8.0);
                    run.setFontColor(new Color(0, 0, 0, 0)); // Transparent — text is selectable but hidden behind image
                }

                int progress = 10 + (int) ((double) (pageIdx + 1) / totalPages * 70);
                jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, progress);
            }

            try (FileOutputStream fos = new FileOutputStream(outputPath.toFile())) {
                pptx.write(fos);
            }
        }

        jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 90);
        return outputPath.toString();
    }

    // ============== OCR Helper ==============

    /**
     * Extract text from a PDF page by rendering it as an image and running Tesseract OCR.
     * Falls back to PDFTextStripper if Tesseract is not available.
     */
    private String extractTextViaOcr(PDFRenderer renderer, int pageIdx) {
        try {
            // Render page at 300 DPI for OCR accuracy
            BufferedImage image = renderer.renderImageWithDPI(pageIdx, 300);

            // Write to temp file
            Path tempImage = Files.createTempFile("ocr_page_", ".png");
            Path tempOutput = Files.createTempFile("ocr_out_", "");
            try {
                ImageIO.write(image, "png", tempImage.toFile());

                // Run Tesseract
                ProcessBuilder pb = new ProcessBuilder(
                        "tesseract", tempImage.toString(), tempOutput.toString());
                pb.redirectErrorStream(true);
                Process process = pb.start();
                int exitCode = process.waitFor();

                if (exitCode == 0) {
                    // Tesseract writes to output.txt
                    Path resultFile = Paths.get(tempOutput + ".txt");
                    if (Files.exists(resultFile)) {
                        String text = Files.readString(resultFile);
                        Files.deleteIfExists(resultFile);
                        return text;
                    }
                }
                log.warn("Tesseract exited with code {} for page {}", exitCode, pageIdx);
            } finally {
                Files.deleteIfExists(tempImage);
                Files.deleteIfExists(tempOutput);
            }
        } catch (Exception e) {
            log.warn("OCR failed for page {}, falling back to text stripper: {}", pageIdx, e.getMessage());
        }
        return ""; // Return empty — caller will get regular text extraction as fallback
    }

    /**
     * Check if Tesseract OCR is available on the system.
     */
    public boolean isOcrAvailable() {
        try {
            Process p = new ProcessBuilder("tesseract", "--version")
                    .redirectErrorStream(true).start();
            int exit = p.waitFor();
            return exit == 0;
        } catch (Exception e) {
            return false;
        }
    }

    // ============== TXT to PDF ==============

    private String convertTxtToPdf(Job job) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        String text = Files.readString(Paths.get(job.getInputFilePath()));
        jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 30);

        try (PDDocument pdfDoc = new PDDocument()) {
            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.COURIER);
            float fontSize = 10;
            float margin = 50;
            float pageWidth = PDRectangle.A4.getWidth();
            float pageHeight = PDRectangle.A4.getHeight();
            float usableWidth = pageWidth - 2 * margin;

            String sanitized = sanitizeText(text);
            String[] rawLines = sanitized.split("\\n");

            PDPage currentPage = new PDPage(PDRectangle.A4);
            pdfDoc.addPage(currentPage);
            PDPageContentStream contentStream = new PDPageContentStream(pdfDoc, currentPage);
            float yPosition = pageHeight - margin;

            for (String rawLine : rawLines) {
                List<String> wrapped = wrapText(rawLine, font, fontSize, usableWidth);
                for (String line : wrapped) {
                    if (yPosition < margin) {
                        contentStream.close();
                        currentPage = new PDPage(PDRectangle.A4);
                        pdfDoc.addPage(currentPage);
                        contentStream = new PDPageContentStream(pdfDoc, currentPage);
                        yPosition = pageHeight - margin;
                    }

                    contentStream.beginText();
                    contentStream.setFont(font, fontSize);
                    contentStream.newLineAtOffset(margin, yPosition);
                    contentStream.showText(line);
                    contentStream.endText();
                    yPosition -= (fontSize + 3);
                }
            }

            contentStream.close();
            pdfDoc.save(outputPath.toFile());
        }

        jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 80);
        return outputPath.toString();
    }

    // ============== HTML to PDF (LibreOffice with fallback) ==============

    private String convertHtmlToPdf(Job job) throws IOException {
        if (libreOffice.isAvailable()) {
            log.info("Using LibreOffice for HTML->PDF conversion");
            return convertViaLibreOffice(job, "pdf");
        }

        log.info("LibreOffice not available, using fallback for HTML->PDF");
        return convertHtmlToPdfFallback(job);
    }

    private String convertHtmlToPdfFallback(Job job) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        String html = Files.readString(Paths.get(job.getInputFilePath()));
        jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 30);

        String plainText = html.replaceAll("<[^>]+>", " ")
                .replaceAll("&amp;", "&")
                .replaceAll("&lt;", "<")
                .replaceAll("&gt;", ">")
                .replaceAll("&quot;", "\"")
                .replaceAll("&nbsp;", " ")
                .replaceAll("&#\\d+;", " ")
                .replaceAll("\\s+", " ")
                .trim();

        try (PDDocument pdfDoc = new PDDocument()) {
            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            float fontSize = 11;
            float margin = 50;
            float pageWidth = PDRectangle.A4.getWidth();
            float pageHeight = PDRectangle.A4.getHeight();
            float usableWidth = pageWidth - 2 * margin;

            String sanitized = sanitizeText(plainText);
            List<String> lines = wrapText(sanitized, font, fontSize, usableWidth);

            PDPage currentPage = new PDPage(PDRectangle.A4);
            pdfDoc.addPage(currentPage);
            PDPageContentStream contentStream = new PDPageContentStream(pdfDoc, currentPage);
            float yPosition = pageHeight - margin;

            for (String line : lines) {
                if (yPosition < margin) {
                    contentStream.close();
                    currentPage = new PDPage(PDRectangle.A4);
                    pdfDoc.addPage(currentPage);
                    contentStream = new PDPageContentStream(pdfDoc, currentPage);
                    yPosition = pageHeight - margin;
                }
                contentStream.beginText();
                contentStream.setFont(font, fontSize);
                contentStream.newLineAtOffset(margin, yPosition);
                contentStream.showText(line);
                contentStream.endText();
                yPosition -= (fontSize + 3);
            }

            contentStream.close();
            pdfDoc.save(outputPath.toFile());
        }

        jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 80);
        return outputPath.toString();
    }

    // ============== CSV to PDF (LibreOffice with fallback) ==============

    private String convertCsvToPdf(Job job) throws IOException {
        if (libreOffice.isAvailable()) {
            log.info("Using LibreOffice for CSV->PDF conversion");
            return convertViaLibreOffice(job, "pdf");
        }

        log.info("LibreOffice not available, using fallback for CSV->PDF");
        return convertCsvToPdfFallback(job);
    }

    private String convertCsvToPdfFallback(Job job) throws IOException {
        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        String csvContent = Files.readString(Paths.get(job.getInputFilePath()));
        jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 30);

        try (PDDocument pdfDoc = new PDDocument()) {
            PDType1Font fontRegular = new PDType1Font(Standard14Fonts.FontName.COURIER);
            PDType1Font fontBold = new PDType1Font(Standard14Fonts.FontName.COURIER_BOLD);
            float fontSize = 9;
            float lineHeight = 12;
            float margin = 40;
            float pageWidth = PDRectangle.A4.getWidth();
            float pageHeight = PDRectangle.A4.getHeight();
            float usableWidth = pageWidth - 2 * margin;

            PDPage currentPage = new PDPage(PDRectangle.A4);
            pdfDoc.addPage(currentPage);
            PDPageContentStream contentStream = new PDPageContentStream(pdfDoc, currentPage);
            float yPosition = pageHeight - margin;

            // Title
            contentStream.beginText();
            contentStream.setFont(fontBold, 12);
            contentStream.newLineAtOffset(margin, yPosition);
            contentStream.showText("CSV Data");
            contentStream.endText();
            yPosition -= 20;

            String[] rows = csvContent.split("\\n");
            for (int i = 0; i < rows.length; i++) {
                if (yPosition < margin) {
                    contentStream.close();
                    currentPage = new PDPage(PDRectangle.A4);
                    pdfDoc.addPage(currentPage);
                    contentStream = new PDPageContentStream(pdfDoc, currentPage);
                    yPosition = pageHeight - margin;
                }

                String line = sanitizeText(rows[i].trim());
                // Replace commas with pipe separators for readability
                line = line.replace(",", "  |  ");

                float textWidth = fontRegular.getStringWidth(line) / 1000 * fontSize;
                if (textWidth > usableWidth) {
                    int maxChars = (int) (line.length() * usableWidth / textWidth);
                    line = line.substring(0, Math.max(1, maxChars - 3)) + "...";
                }

                PDType1Font rowFont = (i == 0) ? fontBold : fontRegular;
                contentStream.beginText();
                contentStream.setFont(rowFont, fontSize);
                contentStream.newLineAtOffset(margin, yPosition);
                contentStream.showText(line);
                contentStream.endText();
                yPosition -= lineHeight;
            }

            contentStream.close();
            pdfDoc.save(outputPath.toFile());
        }

        jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 80);
        return outputPath.toString();
    }

    // ============== Utility Methods ==============

    private List<String> wrapText(String text, PDType1Font font, float fontSize, float maxWidth) throws IOException {
        List<String> lines = new java.util.ArrayList<>();
        // Replace special characters that PDType1Font can't encode
        text = sanitizeText(text);

        String[] words = text.split("\\s+");
        StringBuilder currentLine = new StringBuilder();

        for (String word : words) {
            String testLine = currentLine.length() == 0 ? word : currentLine + " " + word;
            float textWidth = font.getStringWidth(testLine) / 1000 * fontSize;

            if (textWidth > maxWidth && currentLine.length() > 0) {
                lines.add(currentLine.toString());
                currentLine = new StringBuilder(word);
            } else {
                currentLine = new StringBuilder(testLine);
            }
        }

        if (currentLine.length() > 0) {
            lines.add(currentLine.toString());
        }

        if (lines.isEmpty()) {
            lines.add("");
        }

        return lines;
    }

    private String sanitizeText(String text) {
        // Replace characters that can't be encoded in WinAnsiEncoding
        StringBuilder sb = new StringBuilder();
        for (char c : text.toCharArray()) {
            if (c >= 32 && c <= 126) {
                sb.append(c);
            } else if (c == '\t') {
                sb.append("    ");
            } else if (c >= 160 && c <= 255) {
                sb.append(c); // Latin-1 supplement, generally safe
            } else {
                sb.append(' '); // Replace unsupported chars with space
            }
        }
        return sb.toString();
    }

    private String escapeHtml(String text) {
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
