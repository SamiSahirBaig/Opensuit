package com.opensuite.controller;

import com.opensuite.model.Job;
import com.opensuite.model.JobStatus;
import com.opensuite.service.FileUploadService;
import com.opensuite.service.SecurityService;
import com.opensuite.config.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SecurityController.class)
@Import(SecurityConfig.class)
class SecurityControllerTest {

        @Autowired
        private MockMvc mockMvc;

        @MockitoBean
        private FileUploadService fileUploadService;

        @MockitoBean
        private SecurityService securityService;

        @Test
        void applySecurity_validAction_returns202() throws Exception {
                MockMultipartFile file = new MockMultipartFile(
                                "file", "doc.pdf", "application/pdf", "pdf data".getBytes());

                Job job = new Job();
                job.setId("sec-123");
                job.setStatus(JobStatus.QUEUED);

                when(fileUploadService.uploadFile(any(), anyString())).thenReturn(job);

                mockMvc.perform(multipart("/api/security/protect").file(file)
                                .param("password", "secret123"))
                                .andExpect(status().isAccepted())
                                .andExpect(jsonPath("$.jobId").value("sec-123"))
                                .andExpect(jsonPath("$.status").value("QUEUED"));

                verify(securityService).processSecurityAction(eq("sec-123"), any(), anyMap());
        }

        @Test
        void applySecurity_invalidAction_returns400() throws Exception {
                MockMultipartFile file = new MockMultipartFile(
                                "file", "doc.pdf", "application/pdf", "pdf data".getBytes());

                mockMvc.perform(multipart("/api/security/invalid-action").file(file))
                                .andExpect(status().isBadRequest());
        }
}
