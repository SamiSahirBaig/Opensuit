package com.opensuite.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.TimeUnit;

/**
 * Wraps LibreOffice CLI (soffice --headless --convert-to) for
 * high-fidelity document conversions.
 */
@Service
public class LibreOfficeConverter {

    private static final Logger log = LoggerFactory.getLogger(LibreOfficeConverter.class);

    @Value("${opensuite.libreoffice.path:soffice}")
    private String libreOfficePath;

    @Value("${opensuite.libreoffice.timeout-seconds:120}")
    private int timeoutSeconds;

    private boolean available = false;

    @PostConstruct
    public void init() {
        try {
            ProcessBuilder pb = new ProcessBuilder(libreOfficePath, "--headless", "--version");
            pb.redirectErrorStream(true);
            Process process = pb.start();
            boolean finished = process.waitFor(10, TimeUnit.SECONDS);
            if (finished && process.exitValue() == 0) {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                    String version = reader.readLine();
                    log.info("LibreOffice detected: {}", version);
                }
                available = true;
            } else {
                log.warn("LibreOffice not responding at path: {}", libreOfficePath);
            }
        } catch (Exception e) {
            log.warn("LibreOffice not available at '{}': {}", libreOfficePath, e.getMessage());
        }
    }

    /**
     * Check if LibreOffice is available on this system.
     */
    public boolean isAvailable() {
        return available;
    }

    /**
     * Convert a file using LibreOffice CLI.
     *
     * @param inputPath    Absolute path to the input file
     * @param outputFormat Target format (e.g. "pdf", "docx", "xlsx", "html",
     *                     "epub")
     * @param outputDir    Directory to place the converted file
     * @return Path to the converted output file
     * @throws IOException if conversion fails
     */
    public Path convert(String inputPath, String outputFormat, String outputDir) throws IOException {
        if (!available) {
            throw new IOException("LibreOffice is not available on this system");
        }

        Path input = Paths.get(inputPath);
        if (!Files.exists(input)) {
            throw new IOException("Input file does not exist: " + inputPath);
        }

        // Ensure output directory exists
        Files.createDirectories(Paths.get(outputDir));

        // Build the LibreOffice command
        // soffice --headless --convert-to <format> --outdir <dir> <input>
        ProcessBuilder pb = new ProcessBuilder(
                libreOfficePath,
                "--headless",
                "--norestore",
                "--convert-to", outputFormat,
                "--outdir", outputDir,
                inputPath);
        pb.redirectErrorStream(true);

        log.info("Starting LibreOffice conversion: {} -> {} (output dir: {})", inputPath, outputFormat, outputDir);

        try {
            Process process = pb.start();

            // Capture output for logging
            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
            }

            boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                throw new IOException("LibreOffice conversion timed out after " + timeoutSeconds + " seconds");
            }

            int exitCode = process.exitValue();
            if (exitCode != 0) {
                log.error("LibreOffice conversion failed (exit code {}): {}", exitCode, output);
                throw new IOException("LibreOffice conversion failed with exit code " + exitCode + ": " + output);
            }

            log.debug("LibreOffice output: {}", output);

            // Determine output file path
            // LibreOffice names the output file as <input-basename>.<outputFormat>
            String rawName = input.getFileName().toString();
            int dotIdx = rawName.lastIndexOf('.');
            final String inputBaseName = dotIdx > 0 ? rawName.substring(0, dotIdx) : rawName;
            Path outputPath = Paths.get(outputDir, inputBaseName + "." + outputFormat);

            if (!Files.exists(outputPath)) {
                // Sometimes LibreOffice uses slightly different naming, try to find it
                log.warn("Expected output not found at {}. Searching output directory...", outputPath);
                try (var files = Files.list(Paths.get(outputDir))) {
                    Path found = files
                            .filter(p -> p.getFileName().toString().startsWith(inputBaseName + "."))
                            .filter(p -> !p.equals(input))
                            .findFirst()
                            .orElse(null);
                    if (found != null) {
                        outputPath = found;
                        log.info("Found converted file at: {}", outputPath);
                    } else {
                        throw new IOException(
                                "LibreOffice conversion produced no output file. Command output: " + output);
                    }
                }
            }

            log.info("LibreOffice conversion completed: {} -> {}", inputPath, outputPath);
            return outputPath;

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("LibreOffice conversion was interrupted", e);
        }
    }
}
