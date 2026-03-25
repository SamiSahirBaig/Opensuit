package com.opensuite.service;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.opensuite.model.Job;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Files;

@Service
public class WebToPdfService {

    private static final Logger log = LoggerFactory.getLogger(WebToPdfService.class);
    private final JobService jobService;
    private final FileUploadService fileUploadService;

    public WebToPdfService(JobService jobService, FileUploadService fileUploadService) {
        this.jobService = jobService;
        this.fileUploadService = fileUploadService;
    }

    @Async
    public void convertUrlToPdf(String jobId, String url, String pageSize, boolean includeImages) {
        Job job = jobService.getJob(jobId);
        jobService.updateJobStatus(jobId, com.opensuite.model.JobStatus.PROCESSING, 10);
        jobService.setJobMessage(jobId, "Launching browser for conversion...");

        try (Playwright playwright = Playwright.create()) {
            Browser browser = playwright.chromium().launch(new BrowserType.LaunchOptions().setHeadless(true));
            Page page = browser.newPage();
            
            jobService.updateJobStatus(jobId, com.opensuite.model.JobStatus.PROCESSING, 30);
            jobService.setJobMessage(jobId, "Loading URL: " + url);
            page.navigate(url);
            
            // Wait for network to be idle to ensure dynamic content loads
            page.waitForLoadState(com.microsoft.playwright.options.LoadState.NETWORKIDLE);
            
            Page.PdfOptions pdfOptions = new Page.PdfOptions()
                .setFormat(pageSize)
                .setPrintBackground(includeImages)
                .setDisplayHeaderFooter(false);
                
            jobService.updateJobStatus(jobId, com.opensuite.model.JobStatus.PROCESSING, 70);
            jobService.setJobMessage(jobId, "Generating PDF...");
            byte[] pdfBytes = page.pdf(pdfOptions);
            
            browser.close();
            
            // Save to temp file
            File outputFile = new File(fileUploadService.getTempDir(), "web_converted_" + System.currentTimeMillis() + ".pdf");
            Files.write(outputFile.toPath(), pdfBytes);
            
            jobService.setOutputFile(jobId, outputFile.getAbsolutePath());
            jobService.updateJobStatus(jobId, com.opensuite.model.JobStatus.COMPLETED, 100);
            jobService.setJobMessage(jobId, "Web to PDF conversion successful.");
        } catch (Exception e) {
            log.error("Failed to convert URL to PDF", e);
            jobService.updateJobStatus(jobId, com.opensuite.model.JobStatus.FAILED, 0);
            jobService.setJobMessage(jobId, "Conversion failed: " + e.getMessage());
        }
    }
}
