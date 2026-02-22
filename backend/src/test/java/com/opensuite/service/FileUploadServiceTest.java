package com.opensuite.service;

import com.opensuite.model.Job;
import com.opensuite.model.JobStatus;
import com.opensuite.repository.JobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FileUploadServiceTest {

    @Mock
    private JobRepository jobRepository;

    private FileUploadService fileUploadService;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        fileUploadService = new FileUploadService(jobRepository);
        ReflectionTestUtils.setField(fileUploadService, "tempDir", tempDir.toString());
        ReflectionTestUtils.setField(fileUploadService, "maxFileSizeMb", 50);
    }

    @Test
    void uploadFile_validPdf_savesFileAndCreatesJob() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.pdf", "application/pdf", "fake pdf content".getBytes());

        when(jobRepository.save(any(Job.class))).thenAnswer(invocation -> {
            Job job = invocation.getArgument(0);
            job.setId("generated-id");
            return job;
        });

        Job result = fileUploadService.uploadFile(file, "convert:pdf_to_word");

        assertNotNull(result);
        assertEquals("convert:pdf_to_word", result.getJobType());
        assertEquals("test.pdf", result.getOriginalFileName());
        assertEquals(JobStatus.QUEUED, result.getStatus());
        assertTrue(result.getInputFilePath().contains(tempDir.toString()));

        ArgumentCaptor<Job> captor = ArgumentCaptor.forClass(Job.class);
        verify(jobRepository).save(captor.capture());
        assertTrue(captor.getValue().getFileSizeBytes() > 0);
    }

    @Test
    void uploadFile_emptyFile_throwsIllegalArgument() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "empty.pdf", "application/pdf", new byte[0]);

        assertThrows(IllegalArgumentException.class,
                () -> fileUploadService.uploadFile(file, "general"));
    }

    @Test
    void uploadFile_nullFile_throwsIllegalArgument() {
        assertThrows(IllegalArgumentException.class,
                () -> fileUploadService.uploadFile(null, "general"));
    }

    @Test
    void uploadFile_oversizedFile_throwsIllegalArgument() {
        // Set max to 1 MB for this test
        ReflectionTestUtils.setField(fileUploadService, "maxFileSizeMb", 1);

        byte[] oversizedContent = new byte[2 * 1024 * 1024]; // 2 MB
        MockMultipartFile file = new MockMultipartFile(
                "file", "big.pdf", "application/pdf", oversizedContent);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> fileUploadService.uploadFile(file, "general"));
        assertTrue(ex.getMessage().contains("exceeds maximum"));
    }

    @Test
    void uploadFile_unsupportedMimeType_throwsIllegalArgument() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.exe", "application/x-msdownload", "binary data".getBytes());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> fileUploadService.uploadFile(file, "general"));
        assertTrue(ex.getMessage().contains("not supported"));
    }

    @Test
    void uploadFiles_multipleFiles_createsBatchJob() {
        MockMultipartFile file1 = new MockMultipartFile(
                "files", "doc1.pdf", "application/pdf", "pdf1".getBytes());
        MockMultipartFile file2 = new MockMultipartFile(
                "files", "doc2.pdf", "application/pdf", "pdf2".getBytes());

        when(jobRepository.save(any(Job.class))).thenAnswer(invocation -> {
            Job job = invocation.getArgument(0);
            job.setId("batch-id");
            return job;
        });

        Job result = fileUploadService.uploadFiles(
                new MockMultipartFile[] { file1, file2 }, "edit:merge");

        assertNotNull(result);
        assertEquals("edit:merge", result.getJobType());
        assertEquals(JobStatus.QUEUED, result.getStatus());
        // Input file path should be a batch directory
        assertTrue(result.getInputFilePath().contains(tempDir.toString()));
    }

    @Test
    void uploadFiles_emptyArray_throwsIllegalArgument() {
        assertThrows(IllegalArgumentException.class,
                () -> fileUploadService.uploadFiles(new MockMultipartFile[0], "edit:merge"));
    }

    @Test
    void uploadFiles_nullArray_throwsIllegalArgument() {
        assertThrows(IllegalArgumentException.class,
                () -> fileUploadService.uploadFiles(null, "edit:merge"));
    }

    @Test
    void getTempDir_returnsConfiguredPath() {
        assertEquals(tempDir.toString(), fileUploadService.getTempDir());
    }
}
