package com.opensuite.controller;

import com.opensuite.dto.UploadResponse;
import com.opensuite.model.ConversionType;
import com.opensuite.model.Job;
import com.opensuite.service.ConversionService;
import com.opensuite.service.FileUploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/convert")
@Tag(name = "Conversion", description = "Document conversion operations")
public class ConversionController {

    private final FileUploadService fileUploadService;
    private final ConversionService conversionService;

    public ConversionController(FileUploadService fileUploadService, ConversionService conversionService) {
        this.fileUploadService = fileUploadService;
        this.conversionService = conversionService;
    }

    @PostMapping("/{type}")
    @Operation(summary = "Convert a document to the specified format")
    public ResponseEntity<UploadResponse> convert(
            @PathVariable String type,
            @RequestParam("file") MultipartFile file) {

        ConversionType conversionType = parseConversionType(type);
        Job job = fileUploadService.uploadFile(file, "convert:" + type);

        // Start async processing
        conversionService.processConversion(job.getId(), conversionType);

        return ResponseEntity.accepted().body(new UploadResponse(
                job.getId(),
                "QUEUED",
                "Conversion started. Check status at /api/status/" + job.getId()));
    }

    private ConversionType parseConversionType(String type) {
        return switch (type.toLowerCase().replace("-", "_")) {
            case "pdf_to_word", "pdf-to-word" -> ConversionType.PDF_TO_WORD;
            case "word_to_pdf", "word-to-pdf" -> ConversionType.WORD_TO_PDF;
            case "pdf_to_excel", "pdf-to-excel" -> ConversionType.PDF_TO_EXCEL;
            case "excel_to_pdf", "excel-to-pdf" -> ConversionType.EXCEL_TO_PDF;
            case "pdf_to_pptx", "pdf-to-pptx" -> ConversionType.PDF_TO_PPTX;
            case "pptx_to_pdf", "pptx-to-pdf" -> ConversionType.PPTX_TO_PDF;
            case "pdf_to_jpg", "pdf-to-jpg" -> ConversionType.PDF_TO_JPG;
            case "jpg_to_pdf", "jpg-to-pdf" -> ConversionType.JPG_TO_PDF;
            case "pdf_to_png", "pdf-to-png" -> ConversionType.PDF_TO_PNG;
            case "png_to_pdf", "png-to-pdf" -> ConversionType.PNG_TO_PDF;
            case "pdf_to_html", "pdf-to-html" -> ConversionType.PDF_TO_HTML;
            case "html_to_pdf", "html-to-pdf" -> ConversionType.HTML_TO_PDF;
            case "pdf_to_txt", "pdf-to-txt" -> ConversionType.PDF_TO_TXT;
            case "txt_to_pdf", "txt-to-pdf" -> ConversionType.TXT_TO_PDF;
            case "pdf_to_epub", "pdf-to-epub" -> ConversionType.PDF_TO_EPUB;
            case "epub_to_pdf", "epub-to-pdf" -> ConversionType.EPUB_TO_PDF;
            case "pdf_to_pdfa", "pdf-to-pdfa" -> ConversionType.PDF_TO_PDFA;
            default -> throw new IllegalArgumentException("Unknown conversion type: " + type);
        };
    }
}
