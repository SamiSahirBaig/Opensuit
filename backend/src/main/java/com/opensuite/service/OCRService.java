package com.opensuite.service;

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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * OCR Service using system Tesseract CLI for:
 * - Making scanned PDFs searchable (image + invisible text overlay)
 * - Extracting text from scanned pages
 * - Multi-language support
 */
@Service
public class OCRService {

    private static final Logger log = LoggerFactory.getLogger(OCRService.class);
    private static final int OCR_DPI = 300;
    private static final int TESSERACT_TIMEOUT_SECONDS = 60;

    private boolean available = false;
    private List<String> supportedLanguages = new ArrayList<>();

    @PostConstruct
    public void init() {
        available = checkTesseractAvailable();
        if (available) {
            supportedLanguages = detectSupportedLanguages();
            log.info("Tesseract OCR available. Supported languages: {}", supportedLanguages);
        } else {
            log.warn("Tesseract OCR is not installed. OCR features will be unavailable.");
        }
    }

    public boolean isAvailable() {
        return available;
    }

    public List<String> getSupportedLanguages() {
        return Collections.unmodifiableList(supportedLanguages);
    }

    /**
     * Extract text from a rendered PDF page image using Tesseract OCR.
     */
    public String extractText(BufferedImage image, String language) {
        if (!available) {
            log.warn("Tesseract not available, returning empty text");
            return "";
        }

        Path tempImage = null;
        Path tempOutput = null;
        try {
            tempImage = Files.createTempFile("ocr_page_", ".png");
            tempOutput = Files.createTempFile("ocr_out_", "");
            ImageIO.write(image, "png", tempImage.toFile());

            String lang = (language != null && !language.isBlank()) ? language : "eng";

            ProcessBuilder pb = new ProcessBuilder(
                    "tesseract", tempImage.toString(), tempOutput.toString(),
                    "-l", lang, "--oem", "1", "--psm", "1");
            pb.redirectErrorStream(true);
            Process process = pb.start();

            // Consume output to prevent blocking
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                while (reader.readLine() != null) { /* drain */ }
            }

            boolean finished = process.waitFor(TESSERACT_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                log.warn("Tesseract timed out");
                return "";
            }

            if (process.exitValue() == 0) {
                Path resultFile = Paths.get(tempOutput + ".txt");
                if (Files.exists(resultFile)) {
                    String text = Files.readString(resultFile);
                    Files.deleteIfExists(resultFile);
                    return text;
                }
            }
            log.warn("Tesseract exited with code {}", process.exitValue());
        } catch (Exception e) {
            log.warn("OCR text extraction failed: {}", e.getMessage());
        } finally {
            deleteSilently(tempImage);
            deleteSilently(tempOutput);
        }
        return "";
    }

    /**
     * Create a searchable PDF from a scanned PDF.
     * Each page: renders at 300 DPI → OCR → creates a new page with the original
     * image + invisible text overlay so the PDF becomes searchable.
     */
    public String createSearchablePdf(String inputPdfPath, String language, String outputDir,
            ProgressCallback progressCallback) throws IOException {
        if (!available) {
            throw new IOException("Tesseract OCR is not available. Install tesseract-ocr to use OCR features.");
        }

        String outputName = UUID.randomUUID() + ".pdf";
        Path outputPath = Paths.get(outputDir, outputName);

        File inputFile = new File(inputPdfPath);
        try (PDDocument inputDoc = Loader.loadPDF(inputFile);
                PDDocument outputDoc = new PDDocument()) {

            PDFRenderer renderer = new PDFRenderer(inputDoc);
            int totalPages = inputDoc.getNumberOfPages();

            for (int pageIdx = 0; pageIdx < totalPages; pageIdx++) {
                // Render page as high-DPI image
                BufferedImage pageImage = renderer.renderImageWithDPI(pageIdx, OCR_DPI);

                // OCR the image
                String pageText = extractText(pageImage, language);

                // Create new page with same dimensions as original
                PDPage origPage = inputDoc.getPage(pageIdx);
                PDRectangle mediaBox = origPage.getMediaBox();
                PDPage newPage = new PDPage(mediaBox);
                outputDoc.addPage(newPage);

                // Draw the original page image
                PDImageXObject pdImage = LosslessFactory.createFromImage(outputDoc, pageImage);
                try (PDPageContentStream cs = new PDPageContentStream(outputDoc, newPage)) {
                    cs.drawImage(pdImage, 0, 0, mediaBox.getWidth(), mediaBox.getHeight());
                }

                // Overlay invisible text for searchability
                if (pageText != null && !pageText.isBlank()) {
                    overlayInvisibleText(outputDoc, newPage, pageText, mediaBox);
                }

                if (progressCallback != null) {
                    progressCallback.onProgress(pageIdx + 1, totalPages);
                }
            }

            outputDoc.save(outputPath.toFile());
        }

        return outputPath.toString();
    }

    /**
     * Overlay invisible (transparent, tiny) text on a page so it becomes searchable/selectable.
     */
    private void overlayInvisibleText(PDDocument doc, PDPage page, String text, PDRectangle mediaBox)
            throws IOException {
        PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
        float fontSize = 1; // Tiny — invisible but selectable

        try (PDPageContentStream cs = new PDPageContentStream(doc, page,
                PDPageContentStream.AppendMode.APPEND, true, true)) {
            cs.setFont(font, fontSize);
            // Set fully transparent color — text is invisible but selectable/searchable
            cs.setNonStrokingColor(1f, 1f, 1f);

            String[] lines = text.split("\\n");
            float y = mediaBox.getHeight() - 10;
            float lineSpacing = fontSize + 1;

            for (String line : lines) {
                String safeLine = sanitizeForPdf(line.trim());
                if (safeLine.isEmpty()) continue;

                if (y < 10) break;

                try {
                    cs.beginText();
                    cs.newLineAtOffset(10, y);
                    cs.showText(safeLine);
                    cs.endText();
                    y -= lineSpacing;
                } catch (Exception e) {
                    // Skip lines with encoding issues
                    log.debug("Skipping line due to encoding: {}", e.getMessage());
                }
            }
        }
    }

    /**
     * Sanitize text for PDF embedding (WinAnsiEncoding safe).
     */
    private String sanitizeForPdf(String text) {
        StringBuilder sb = new StringBuilder();
        for (char c : text.toCharArray()) {
            if (c >= 32 && c <= 126) {
                sb.append(c);
            } else if (c >= 160 && c <= 255) {
                sb.append(c);
            } else if (c == '\t') {
                sb.append("    ");
            } else {
                sb.append(' ');
            }
        }
        return sb.toString();
    }

    // ============== Internal Helpers ==============

    private boolean checkTesseractAvailable() {
        try {
            Process p = new ProcessBuilder("tesseract", "--version")
                    .redirectErrorStream(true).start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
                String version = reader.readLine();
                if (version != null) {
                    log.info("Tesseract version: {}", version);
                }
                while (reader.readLine() != null) { /* drain */ }
            }
            boolean finished = p.waitFor(10, TimeUnit.SECONDS);
            return finished && p.exitValue() == 0;
        } catch (Exception e) {
            return false;
        }
    }

    private List<String> detectSupportedLanguages() {
        List<String> langs = new ArrayList<>();
        try {
            Process p = new ProcessBuilder("tesseract", "--list-langs")
                    .redirectErrorStream(true).start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
                String line;
                boolean pastHeader = false;
                while ((line = reader.readLine()) != null) {
                    if (line.contains("List of available languages")) {
                        pastHeader = true;
                        continue;
                    }
                    if (pastHeader) {
                        String lang = line.trim();
                        if (!lang.isEmpty()) {
                            langs.add(lang);
                        }
                    }
                }
            }
            p.waitFor(10, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.debug("Could not list Tesseract languages: {}", e.getMessage());
        }
        if (langs.isEmpty()) {
            langs.add("eng"); // Default fallback
        }
        return langs;
    }

    private void deleteSilently(Path path) {
        if (path != null) {
            try {
                Files.deleteIfExists(path);
            } catch (IOException ignored) {
            }
        }
    }

    @FunctionalInterface
    public interface ProgressCallback {
        void onProgress(int currentPage, int totalPages);
    }
}
