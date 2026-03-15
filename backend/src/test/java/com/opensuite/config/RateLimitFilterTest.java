package com.opensuite.config;

import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RateLimitFilterTest {

    private RateLimitFilter rateLimitFilter;
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        rateLimitFilter = new RateLimitFilter();
        ReflectionTestUtils.setField(rateLimitFilter, "requestsPerMinute", 5);
        ReflectionTestUtils.setField(rateLimitFilter, "burstCapacity", 3);
        filterChain = mock(FilterChain.class);
    }

    @Test
    void doFilter_apiEndpoint_allowsUnderLimit() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/status/123");
        request.setRemoteAddr("192.168.1.1");
        MockHttpServletResponse response = new MockHttpServletResponse();

        rateLimitFilter.doFilter(request, response, filterChain);

        assertEquals(200, response.getStatus());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilter_apiEndpoint_rejectsOverLimit() throws Exception {
        String clientIp = "10.0.0.1";

        // Exhaust the rate limit (burst = 3, so 4th should fail)
        for (int i = 0; i < 3; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/convert/pdf-to-word");
            request.setRemoteAddr(clientIp);
            MockHttpServletResponse response = new MockHttpServletResponse();
            rateLimitFilter.doFilter(request, response, filterChain);
            assertEquals(200, response.getStatus());
        }

        // This one should be rate limited
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/convert/pdf-to-word");
        request.setRemoteAddr(clientIp);
        MockHttpServletResponse response = new MockHttpServletResponse();
        rateLimitFilter.doFilter(request, response, filterChain);

        assertEquals(429, response.getStatus());
        assertTrue(response.getContentAsString().contains("Too Many Requests"));
    }

    @Test
    void doFilter_nonApiEndpoint_passesThrough() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/index.html");
        request.setRemoteAddr("192.168.1.1");
        MockHttpServletResponse response = new MockHttpServletResponse();

        rateLimitFilter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertEquals(200, response.getStatus());
    }

    @Test
    void getClientIp_withXForwardedFor_usesFirstIp() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/health");
        request.addHeader("X-Forwarded-For", "203.0.113.50, 70.41.3.18");
        request.setRemoteAddr("127.0.0.1");
        MockHttpServletResponse response = new MockHttpServletResponse();

        // First request should pass
        rateLimitFilter.doFilter(request, response, filterChain);
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void getClientIp_withXRealIp_usesIt() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/health");
        request.addHeader("X-Real-IP", "198.51.100.24");
        request.setRemoteAddr("127.0.0.1");
        MockHttpServletResponse response = new MockHttpServletResponse();

        rateLimitFilter.doFilter(request, response, filterChain);
        verify(filterChain).doFilter(request, response);
    }
}
