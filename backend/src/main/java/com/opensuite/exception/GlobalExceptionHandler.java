package com.opensuite.exception;

import com.opensuite.dto.ErrorResponse;
import io.sentry.Sentry;
import io.sentry.SentryLevel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import jakarta.servlet.http.HttpServletRequest;

@ControllerAdvice(basePackages = "com.opensuite.controller")
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(FileProcessingException.class)
    public ResponseEntity<ErrorResponse> handleFileProcessing(FileProcessingException ex, HttpServletRequest request) {
        log.error("File processing error: {}", ex.getMessage());
        captureException(ex, request, SentryLevel.ERROR);
        return buildResponse(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage(), request);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex, HttpServletRequest request) {
        log.warn("Resource not found: {}", ex.getMessage());
        // Not sent to Sentry — expected user error (404)
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage(), request);
    }

    @ExceptionHandler(InvalidTokenException.class)
    public ResponseEntity<ErrorResponse> handleInvalidToken(InvalidTokenException ex, HttpServletRequest request) {
        log.warn("Invalid or expired token: {}", ex.getMessage());
        // Not sent to Sentry — expected user error (403)
        return buildResponse(HttpStatus.FORBIDDEN, ex.getMessage(), request);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUploadSize(MaxUploadSizeExceededException ex,
            HttpServletRequest request) {
        log.warn("File too large: {}", ex.getMessage());
        // Not sent to Sentry — expected user error (413)
        return buildResponse(HttpStatus.PAYLOAD_TOO_LARGE, "File size exceeds the maximum allowed limit of 50MB",
                request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex,
            HttpServletRequest request) {
        log.warn("Bad request: {}", ex.getMessage());
        // Not sent to Sentry — expected user error (400)
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception ex, HttpServletRequest request) {
        log.error("Unexpected error", ex);
        captureException(ex, request, SentryLevel.FATAL);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred. Please try again.",
                request);
    }

    /**
     * Capture an exception to Sentry with request context.
     * Safe to call even when Sentry is not configured (DSN is empty).
     */
    private void captureException(Exception ex, HttpServletRequest request, SentryLevel level) {
        Sentry.withScope(scope -> {
            scope.setLevel(level);
            scope.setTag("request.uri", request.getRequestURI());
            scope.setTag("request.method", request.getMethod());
            String contentType = request.getContentType();
            if (contentType != null) {
                scope.setTag("request.content_type", contentType);
            }
            Sentry.captureException(ex);
        });
    }

    private ResponseEntity<ErrorResponse> buildResponse(HttpStatus status, String message, HttpServletRequest request) {
        ErrorResponse error = new ErrorResponse(
                status.value(),
                status.getReasonPhrase(),
                message,
                request.getRequestURI());
        return new ResponseEntity<>(error, status);
    }
}
