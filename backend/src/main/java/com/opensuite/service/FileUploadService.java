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
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;

@Service
public class FileUploadService {

    private static final Logger log = LoggerFactory.getLogger(FileUploadService.class);

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
        job.setOriginalFileName(file.getOriginalFilename());
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
        job.setOriginalFileName(files[0].getOriginalFilename());
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
            throw new IllegalArgumentException(
                    String.format("File size (%d MB) exceeds maximum allowed size (%d MB)",
                            file.getSize() / (1024 * 1024), maxFileSizeMb));
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("File type not supported: " + contentType);
        }
    }

    private String getExtension(String filename) {
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
