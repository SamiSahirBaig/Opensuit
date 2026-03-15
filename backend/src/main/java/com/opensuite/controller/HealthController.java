package com.opensuite.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api")
@Tag(name = "Health", description = "Service health check")
public class HealthController {

    @GetMapping("/health")
    @Operation(summary = "Check service health", description = "Returns the current health status, service name, version, and server timestamp. "
            +
            "Use this endpoint for uptime monitoring and load-balancer health probes.")
    @ApiResponse(responseCode = "200", description = "Service is healthy", content = @Content(schema = @Schema(example = "{\"status\":\"UP\",\"service\":\"OpenSuite Backend\",\"timestamp\":\"2025-01-15T10:30:00\",\"version\":\"1.0.0\"}")))
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "OpenSuite Backend",
                "timestamp", LocalDateTime.now().toString(),
                "version", "1.0.0"));
    }
}
