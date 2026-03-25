package com.opensuite.controller;

import com.opensuite.config.RateLimitFilter;
import com.opensuite.model.Job;
import com.opensuite.model.JobStatus;
import com.opensuite.service.ConversionService;
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

@WebMvcTest(value = ConversionController.class, excludeFilters = @ComponentScan.Filter(
        type = FilterType.ASSIGNABLE_TYPE, classes = RateLimitFilter.class))
@Import(SecurityConfig.class)
class ConversionControllerTest {

        @Autowired
        private MockMvc mockMvc;

        @MockitoBean
        private FileUploadService fileUploadService;

        @MockitoBean
        private ConversionService conversionService;

        @Test
        void convert_validType_returns202() throws Exception {
                MockMultipartFile file = new MockMultipartFile(
                                "file", "doc.pdf", "application/pdf", "pdf data".getBytes());

                Job job = new Job();
                job.setId("conv-123");
                job.setStatus(JobStatus.QUEUED);

                when(fileUploadService.uploadFile(any(), anyString())).thenReturn(job);

                mockMvc.perform(multipart("/api/convert/pdf-to-word").file(file))
                                .andExpect(status().isAccepted())
                                .andExpect(jsonPath("$.jobId").value("conv-123"))
                                .andExpect(jsonPath("$.status").value("QUEUED"));

                verify(conversionService).processConversion(eq("conv-123"), any(), any(java.util.Map.class));
        }

        @Test
        void convert_invalidType_returns400() throws Exception {
                MockMultipartFile file = new MockMultipartFile(
                                "file", "doc.pdf", "application/pdf", "pdf data".getBytes());

                mockMvc.perform(multipart("/api/convert/invalid-type").file(file))
                                .andExpect(status().isBadRequest());
        }

        @Test
        void convert_allValidTypes_parsedCorrectly() throws Exception {
                String[] validTypes = {
                                "pdf-to-word", "word-to-pdf", "pdf-to-excel", "excel-to-pdf",
                                "pdf-to-pptx", "pptx-to-pdf", "pdf-to-jpg", "jpg-to-pdf",
                                "pdf-to-png", "png-to-pdf", "pdf-to-html", "html-to-pdf",
                                "pdf-to-txt", "txt-to-pdf", "pdf-to-epub", "epub-to-pdf",
                                "pdf-to-pdfa", "csv-to-pdf",
                                "ocr-pdf", "bmp-to-pdf", "tiff-to-pdf", "gif-to-pdf"
                };

                Job job = new Job();
                job.setId("type-test");
                job.setStatus(JobStatus.QUEUED);
                when(fileUploadService.uploadFile(any(), anyString())).thenReturn(job);

                for (String type : validTypes) {
                        MockMultipartFile file = new MockMultipartFile(
                                        "file", "test.pdf", "application/pdf", "data".getBytes());

                        mockMvc.perform(multipart("/api/convert/" + type).file(file))
                                        .andExpect(status().isAccepted());
                }
        }
}
