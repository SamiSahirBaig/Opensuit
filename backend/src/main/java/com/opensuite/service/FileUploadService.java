package com.opensuite.service;

import com.opensuite.exception.FileProcessingException;
import com.opensuite.model.Job;
import com.opensuite.model.JobStatus;
import com.opensuite.repository.JobRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class FileUploadService {

    private static final Logger log = LoggerFactory.getLogger(FileUploadService.class);
    private static final Logger securityLog = LoggerFactory.getLogger("SECURITY");

    // Magic byte signatures for file type validation
    private static final byte[] PDF_MAGIC = new byte[] { 0x25, 0x50, 0x44, 0x46 }; // %PDF
    private static final byte[] ZIP_MAGIC = new byte[] { 0x50, 0x4B, 0x03, 0x04 }; // PK (DOCX/XLSX/PPTX/EPUB)
    private static final byte[] JPEG_MAGIC = new byte[] { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF };
    private static final byte[] PNG_MAGIC = new byte[] { (byte) 0x89, 0x50, 0x4E, 0x47 }; // .PNG
    private static final byte[] GIF_MAGIC = new byte[] { 0x47, 0x49, 0x46 }; // GIF

    // Map MIME types to their expected magic bytes
    private static final Map<String, byte[]> MIME_TO_MAGIC = Map.ofEntries(
            Map.entry("application/pdf", PDF_MAGIC),
            Map.entry("application/vnd.openxmlformats-officedocument.wordprocessingml.document", ZIP_MAGIC),
            Map.entry("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ZIP_MAGIC),
            Map.entry("application/vnd.openxmlformats-officedocument.presentationml.presentation", ZIP_MAGIC),
            Map.entry("application/epub+zip", ZIP_MAGIC),
            Map.entry("image/jpeg", JPEG_MAGIC),
            Map.entry("image/png", PNG_MAGIC),
            Map.entry("image/gif", GIF_MAGIC));

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/bmp",
            "image/tiff",
            "text/plain",
            "text/html",
            "application/epub+zip");

    private final JobRepository jobRepository;

    @Value("${opensuite.storage.temp-dir:./temp-files}")
    private String tempDir;

    @Value("${opensuite.storage.max-file-size-mb:50}")
    private int maxFileSizeMb;

    public FileUploadService(JobRepository jobRepository) {
        this.jobRepository = jobRepository;
    }

    @PostConstruct
    public void init() {
        try {
            Path path = Paths.get(tempDir);
            if (!Files.exists(path)) {
                Files.createDirectories(path);
                log.info("Created temp directory: {}", tempDir);
            }
        } catch (IOException e) {
            log.error("Failed to create temp directory", e);
            throw new RuntimeException("Cannot create temp directory", e);
        }
    }

    public Job uploadFile(MultipartFile file, String jobType) {
        validateFile(file);

        String uuid = UUID.randomUUID().toString();
        String extension = getExtension(file.getOriginalFilename());
        String storedFileName = uuid + extension;
        Path filePath = Paths.get(tempDir, storedFileName);

        try {
            Files.copy(file.getInputStream(), filePath);
            log.info("File uploaded: {} -> {}", file.getOriginalFilename(), storedFileName);
        } catch (IOException e) {
            throw new FileProcessingException("Failed to save uploaded file", e);
        }

        Job job = new Job();
        job.setJobType(jobType);
        job.setInputFileName(storedFileName);
        job.setInputFilePath(filePath.toString());
        job.setOriginalFileName(sanitizeFilename(file.getOriginalFilename()));
        job.setFileSizeBytes(file.getSize());
        job.setStatus(JobStatus.QUEUED);

        return jobRepository.save(job);
    }

    public Job uploadFiles(MultipartFile[] files, String jobType) {
        if (files == null || files.length == 0) {
            throw new IllegalArgumentException("No files provided");
        }

        String uuid = UUID.randomUUID().toString();
        Path batchDir = Paths.get(tempDir, uuid);

        try {
            Files.createDirectories(batchDir);
        } catch (IOException e) {
            throw new FileProcessingException("Failed to create batch directory", e);
        }

        StringBuilder fileNames = new StringBuilder();
        for (MultipartFile file : files) {
            validateFile(file);
            String extension = getExtension(file.getOriginalFilename());
            String storedFileName = UUID.randomUUID().toString() + extension;
            Path filePath = batchDir.resolve(storedFileName);
            try {
                Files.copy(file.getInputStream(), filePath);
                fileNames.append(storedFileName).append(",");
            } catch (IOException e) {
                throw new FileProcessingException("Failed to save file: " + file.getOriginalFilename(), e);
            }
        }

        Job job = new Job();
        job.setJobType(jobType);
        job.setInputFileName(fileNames.toString());
        job.setInputFilePath(batchDir.toString());
        job.setOriginalFileName(sanitizeFilename(files[0].getOriginalFilename()));
        job.setFileSizeBytes(calculateTotalSize(files));
        job.setStatus(JobStatus.QUEUED);

        return jobRepository.save(job);
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty or not provided");
        }

        long maxBytes = (long) maxFileSizeMb * 1024 * 1024;
        if (file.getSize() > maxBytes) {
            securityLog.warn("File size limit exceeded: {} bytes from file '{}'",
                    file.getSize(), sanitizeFilename(file.getOriginalFilename()));
            throw new IllegalArgumentException(
                    String.format("File size (%d MB) exceeds maximum allowed size (%d MB)",
                            file.getSize() / (1024 * 1024), maxFileSizeMb));
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType)) {
            securityLog.warn("Rejected unsupported file type: '{}' for file '{}'",
                    contentType, sanitizeFilename(file.getOriginalFilename()));
            throw new IllegalArgumentException("File type not supported: " + contentType);
        }

        // Validate magic bytes match claimed MIME type
        validateMagicBytes(file, contentType);
    }

    /**
     * Validate that the file's magic bytes (header) match the claimed MIME type.
     * Prevents attackers from uploading malicious files with spoofed Content-Type.
     */
    private void validateMagicBytes(MultipartFile file, String contentType) {
        byte[] expectedMagic = MIME_TO_MAGIC.get(contentType);
        if (expectedMagic == null) {
            // No magic bytes check for text/* and legacy Office formats (DOC/XLS/PPT)
            return;
        }

        try (InputStream is = file.getInputStream()) {
            byte[] fileHeader = new byte[expectedMagic.length];
            int bytesRead = is.read(fileHeader);
            if (bytesRead < expectedMagic.length || !Arrays.equals(fileHeader, expectedMagic)) {
                securityLog.warn("Magic byte mismatch: claimed '{}' but header does not match for file '{}'",
                        contentType, sanitizeFilename(file.getOriginalFilename()));
                throw new IllegalArgumentException(
                        "File content does not match its declared type: " + contentType);
            }
        } catch (IOException e) {
            throw new FileProcessingException("Failed to read file for validation", e);
        }
    }

    /**
     * Sanitize a filename to prevent path traversal and injection attacks.
     * Strips ../ sequences, null bytes, and restricts to safe characters.
     */
    static String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "unnamed";
        }

        // Remove path separators and traversal sequences
        String sanitized = filename
                .replace("\0", "") // null bytes
                .replace("..", "") // directory traversal
                .replace("/", "") // Unix path separator
                .replace("\\", ""); // Windows path separator

        // Keep only safe characters: letters, digits, dots, hyphens, underscores,
        // spaces
        sanitized = sanitized.replaceAll("[^a-zA-Z0-9._\\- ]", "_");

        // Ensure the filename is not empty after sanitization
        if (sanitized.isBlank() || sanitized.equals(".")) {
            return "unnamed";
        }

        // Limit filename length
        if (sanitized.length() > 255) {
            String ext = getExtension(sanitized);
            sanitized = sanitized.substring(0, 255 - ext.length()) + ext;
        }

        return sanitized;
    }

    private static String getExtension(String filename) {
        if (filename == null)
            return "";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot) : "";
    }

    private long calculateTotalSize(MultipartFile[] files) {
        long total = 0;
        for (MultipartFile f : files) {
            total += f.getSize();
        }
        return total;
    }

    public String getTempDir() {
        return tempDir;
    }
}
