package com.opensuite.controller;

import com.opensuite.model.Job;
import com.opensuite.model.JobStatus;
import com.opensuite.service.FileUploadService;
import com.opensuite.service.JobService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.FileSystemResource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import com.opensuite.config.SecurityConfig;
import com.opensuite.exception.ResourceNotFoundException;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FileController.class)
@Import(SecurityConfig.class)
class FileControllerTest {

        @Autowired
        private MockMvc mockMvc;

        @MockitoBean
        private FileUploadService fileUploadService;

        @MockitoBean
        private JobService jobService;

        @Test
        void uploadFile_validPdf_returns200WithJobId() throws Exception {
                MockMultipartFile file = new MockMultipartFile(
                                "file", "test.pdf", "application/pdf", "pdf data".getBytes());

                Job job = new Job();
                job.setId("job-123");
                job.setStatus(JobStatus.QUEUED);

                when(fileUploadService.uploadFile(any(), anyString())).thenReturn(job);

                mockMvc.perform(multipart("/api/file/upload").file(file))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.jobId").value("job-123"))
                                .andExpect(jsonPath("$.status").value("QUEUED"));
        }

        @Test
        void uploadFile_noFile_returns400() throws Exception {
                mockMvc.perform(multipart("/api/file/upload"))
                                .andExpect(status().isBadRequest());
        }

        @Test
        void downloadFile_validToken_returnsFile() throws Exception {
                // Create a temp file for the response
                Path tempFile = Files.createTempFile("test-download", ".pdf");
                Files.writeString(tempFile, "fake pdf content");

                Job job = new Job();
                job.setId("dl-job");
                job.setOutputFilePath(tempFile.toString());
                job.setOriginalFileName("result.pdf");

                when(jobService.validateDownloadToken("valid-token")).thenReturn(job);

                mockMvc.perform(get("/api/file/download/valid-token"))
                                .andExpect(status().isOk())
                                .andExpect(header().string("Content-Disposition",
                                                org.hamcrest.Matchers.containsString("result.pdf")));

                Files.deleteIfExists(tempFile);
        }

    @Test
    void downloadFile_invalidToken_returns404() throws Exception {
        when(jobService.validateDownloadToken("bad-token"))
                .thenThrow(new ResourceNotFoundException("Token not found"));

        mockMvc.perform(get("/api/file/download/bad-token"))
                .andExpect(status().isNotFound());
    }

        @Test
        void downloadFile_noOutputFile_returns404() throws Exception {
                Job job = new Job();
                job.setId("no-output");
                job.setOutputFilePath("/nonexistent/file.pdf");

                when(jobService.validateDownloadToken("orphan-token")).thenReturn(job);

                mockMvc.perform(get("/api/file/download/orphan-token"))
                                .andExpect(status().isNotFound());
        }
}
