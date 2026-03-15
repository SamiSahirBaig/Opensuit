package com.opensuite.service;

import com.opensuite.exception.FileProcessingException;
import com.opensuite.model.ConversionType;
import com.opensuite.model.Job;
import com.opensuite.model.JobStatus;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xslf.usermodel.*;
import org.apache.poi.xwpf.usermodel.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.Dimension;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
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
                case PDF_TO_WORD -> convertPdfToWord(job);
                case PDF_TO_EXCEL -> convertPdfToExcel(job);
                case PDF_TO_PPTX -> convertViaLibreOffice(job, "pptx");
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

    // ============== PDF to Word (LibreOffice with POI fallback) ==============

    private String convertPdfToWord(Job job) throws IOException {
        // Prefer LibreOffice for high-fidelity conversion
        if (libreOffice.isAvailable()) {
            log.info("Using LibreOffice for PDF->Word conversion");
            return convertViaLibreOffice(job, "docx");
        }

        // Fallback: basic text extraction to Word
        log.info("LibreOffice not available, using POI fallback for PDF->Word");
        String outputName = UUID.randomUUID() + ".docx";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        File inputFile = new File(job.getInputFilePath());
        try (PDDocument pdfDocument = Loader.loadPDF(inputFile)) {
            PDFTextStripper stripper = new PDFTextStripper();
            String fullText = stripper.getText(pdfDocument);

            jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 50);

            try (XWPFDocument doc = new XWPFDocument()) {
                // Split by pages (PDFTextStripper uses form feed between pages)
                String[] pages = fullText.split("\f");

                for (int i = 0; i < pages.length; i++) {
                    String pageText = pages[i].trim();
                    if (pageText.isEmpty())
                        continue;

                    // Add page header
                    if (pages.length > 1) {
                        XWPFParagraph header = doc.createParagraph();
                        header.setStyle("Heading2");
                        XWPFRun headerRun = header.createRun();
                        headerRun.setText("Page " + (i + 1));
                        headerRun.setBold(true);
                        headerRun.setFontSize(14);
                    }

                    // Split into paragraphs by double newlines
                    String[] paragraphs = pageText.split("\\n\\s*\\n");
                    for (String para : paragraphs) {
                        String trimmed = para.trim();
                        if (trimmed.isEmpty())
                            continue;

                        XWPFParagraph p = doc.createParagraph();
                        XWPFRun run = p.createRun();
                        // Handle line breaks within paragraph
                        String[] lines = trimmed.split("\\n");
                        for (int l = 0; l < lines.length; l++) {
                            run.setText(lines[l].trim());
                            if (l < lines.length - 1) {
                                run.addBreak();
                            }
                        }
                        run.setFontFamily("Calibri");
                        run.setFontSize(11);
                    }

                    // Add page break between pages (except last)
                    if (i < pages.length - 1) {
                        XWPFParagraph pageBreak = doc.createParagraph();
                        pageBreak.setPageBreak(true);
                    }
                }

                try (FileOutputStream fos = new FileOutputStream(outputPath.toFile())) {
                    doc.write(fos);
                }
            }
        }

        jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 80);
        return outputPath.toString();
    }

    // ============== PDF to Excel (LibreOffice with POI fallback) ==============

    private String convertPdfToExcel(Job job) throws IOException {
        // Prefer LibreOffice for high-fidelity conversion
        if (libreOffice.isAvailable()) {
            log.info("Using LibreOffice for PDF->Excel conversion");
            return convertViaLibreOffice(job, "xlsx");
        }

        // Fallback: text extraction to Excel
        log.info("LibreOffice not available, using POI fallback for PDF->Excel");
        String outputName = UUID.randomUUID() + ".xlsx";
        Path outputPath = Paths.get(fileUploadService.getTempDir(), outputName);

        File inputFile = new File(job.getInputFilePath());
        try (PDDocument pdfDocument = Loader.loadPDF(inputFile)) {
            PDFTextStripper stripper = new PDFTextStripper();
            String fullText = stripper.getText(pdfDocument);

            jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 50);

            try (Workbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
                Sheet sheet = workbook.createSheet("Extracted Data");
                String[] lines = fullText.split("\\n");

                for (int i = 0; i < lines.length; i++) {
                    Row row = sheet.createRow(i);
                    // Try to split by common delimiters (tab, multiple spaces, pipe)
                    String line = lines[i].trim();
                    String[] cells;
                    if (line.contains("\t")) {
                        cells = line.split("\t");
                    } else if (line.contains("|")) {
                        cells = line.split("\\|");
                    } else if (line.contains("  ")) {
                        cells = line.split("\\s{2,}");
                    } else {
                        cells = new String[] { line };
                    }

                    for (int j = 0; j < cells.length; j++) {
                        Cell cell = row.createCell(j);
                        String value = cells[j].trim();
                        // Try to parse as number
                        try {
                            double num = Double.parseDouble(value);
                            cell.setCellValue(num);
                        } catch (NumberFormatException e) {
                            cell.setCellValue(value);
                        }
                    }
                }

                // Auto-size columns (up to 10 columns)
                for (int i = 0; i < Math.min(10, sheet.getRow(0) != null ? sheet.getRow(0).getLastCellNum() : 0); i++) {
                    sheet.autoSizeColumn(i);
                }

                try (FileOutputStream fos = new FileOutputStream(outputPath.toFile())) {
                    workbook.write(fos);
                }
            }
        }

        jobService.updateJobStatus(job.getId(), JobStatus.PROCESSING, 80);
        return outputPath.toString();
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
