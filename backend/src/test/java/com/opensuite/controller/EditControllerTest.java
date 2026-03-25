package com.opensuite.controller;

import com.opensuite.config.RateLimitFilter;
import com.opensuite.model.Job;
import com.opensuite.model.JobStatus;
import com.opensuite.service.EditingService;
import com.opensuite.service.FileUploadService;
import com.opensuite.config.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(value = EditController.class, excludeFilters = @ComponentScan.Filter(
        type = FilterType.ASSIGNABLE_TYPE, classes = RateLimitFilter.class))
@Import(SecurityConfig.class)
class EditControllerTest {

        @Autowired
        private MockMvc mockMvc;

        @MockitoBean
        private FileUploadService fileUploadService;

        @MockitoBean
        private EditingService editingService;

        @Test
        void edit_validType_returns202() throws Exception {
                MockMultipartFile file = new MockMultipartFile(
                                "file", "doc.pdf", "application/pdf", "pdf data".getBytes());

                Job job = new Job();
                job.setId("edit-123");
                job.setStatus(JobStatus.QUEUED);

                when(fileUploadService.uploadFile(any(), anyString())).thenReturn(job);

                mockMvc.perform(multipart("/api/edit/rotate").file(file)
                                .param("angle", "90"))
                                .andExpect(status().isAccepted())
                                .andExpect(jsonPath("$.jobId").value("edit-123"))
                                .andExpect(jsonPath("$.status").value("QUEUED"));

                verify(editingService).processEdit(eq("edit-123"), any(), anyMap());
        }

        @Test
        void edit_invalidType_returns400() throws Exception {
                MockMultipartFile file = new MockMultipartFile(
                                "file", "doc.pdf", "application/pdf", "pdf data".getBytes());

                mockMvc.perform(multipart("/api/edit/invalid-type").file(file))
                                .andExpect(status().isBadRequest());
        }

        @Test
        void merge_multipleFiles_returns202() throws Exception {
                MockMultipartFile file1 = new MockMultipartFile(
                                "files", "doc1.pdf", "application/pdf", "pdf1".getBytes());
                MockMultipartFile file2 = new MockMultipartFile(
                                "files", "doc2.pdf", "application/pdf", "pdf2".getBytes());

                Job job = new Job();
                job.setId("merge-123");
                job.setStatus(JobStatus.QUEUED);

                when(fileUploadService.uploadFiles(any(), anyString())).thenReturn(job);

                mockMvc.perform(multipart("/api/edit/merge").file(file1).file(file2))
                                .andExpect(status().isAccepted())
                                .andExpect(jsonPath("$.jobId").value("merge-123"));

                verify(editingService).processEdit(eq("merge-123"), any(), isNull());
        }
}
