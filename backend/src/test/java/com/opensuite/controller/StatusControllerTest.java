package com.opensuite.controller;

import com.opensuite.config.SecurityConfig;
import com.opensuite.dto.JobStatusResponse;
import com.opensuite.exception.ResourceNotFoundException;
import com.opensuite.service.JobService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(StatusController.class)
@Import(SecurityConfig.class)
class StatusControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JobService jobService;

    @Test
    void getStatus_existingJob_returns200() throws Exception {
        JobStatusResponse response = new JobStatusResponse();
        response.setJobId("job-123");
        response.setStatus("PROCESSING");
        response.setProgress(50);
        response.setMessage("Processing in progress...");

        when(jobService.getJobStatus("job-123")).thenReturn(response);

        mockMvc.perform(get("/api/status/job-123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobId").value("job-123"))
                .andExpect(jsonPath("$.status").value("PROCESSING"))
                .andExpect(jsonPath("$.progress").value(50));
    }

    @Test
    void getStatus_nonExistentJob_returns404() throws Exception {
        when(jobService.getJobStatus("missing-id"))
                .thenThrow(new ResourceNotFoundException("Job not found"));

        mockMvc.perform(get("/api/status/missing-id"))
                .andExpect(status().isNotFound());
    }
}
