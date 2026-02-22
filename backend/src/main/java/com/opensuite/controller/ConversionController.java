package com.opensuite.controller;

import com.opensuite.dto.ErrorResponse;
import com.opensuite.dto.UploadResponse;
import com.opensuite.model.ConversionType;
import com.opensuite.model.Job;
import com.opensuite.service.ConversionService;
import com.opensuite.service.FileUploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/convert")
@Tag(name = "Conversion", description = "Document conversion operations — convert between PDF, Word, Excel, PowerPoint, images, HTML, TXT, and EPUB formats")
public class ConversionController {

    private final FileUploadService fileUploadService;
    private final ConversionService conversionService;

    public ConversionController(FileUploadService fileUploadService, ConversionService conversionService) {
        this.fileUploadService = fileUploadService;
        this.conversionService = conversionService;
    }

    @PostMapping("/{type}")
    @Operation(summary = "Convert a document to the specified format", description = "Uploads a file and starts an asynchronous conversion job. "
            +
            "Supported types include: pdf-to-word, word-to-pdf, pdf-to-excel, excel-to-pdf, " +
            "pdf-to-pptx, pptx-to-pdf, pdf-to-jpg, jpg-to-pdf, pdf-to-png, png-to-pdf, " +
            "pdf-to-html, html-to-pdf, pdf-to-txt, txt-to-pdf, pdf-to-epub, epub-to-pdf, pdf-to-pdfa. " +
            "Poll the returned jobId via GET /api/status/{jobId} to track progress.")
    @ApiResponses({
            @ApiResponse(responseCode = "202", description = "Conversion job accepted and queued", content = @Content(schema = @Schema(implementation = UploadResponse.class))),
            @ApiResponse(responseCode = "400", description = "Unknown conversion type", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "413", description = "File exceeds the 50 MB upload limit", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Unexpected server error", content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<UploadResponse> convert(
            @Parameter(description = "Conversion type, e.g. `pdf-to-word`, `excel-to-pdf`", required = true, example = "pdf-to-word") @PathVariable String type,
            @Parameter(description = "The file to convert (max 50 MB)", required = true) @RequestParam("file") MultipartFile file) {

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
