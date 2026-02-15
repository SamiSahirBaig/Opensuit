package com.opensuite.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "download_tokens")
public class DownloadToken {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(unique = true, nullable = false)
    private String token;

    @Column(nullable = false)
    private String jobId;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    private boolean used = false;
    private LocalDateTime createdAt;

    public DownloadToken() {
    }

    public DownloadToken(String token, String jobId, LocalDateTime expiresAt) {
        this.token = token;
        this.jobId = jobId;
        this.expiresAt = expiresAt;
        this.createdAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null)
            createdAt = LocalDateTime.now();
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getJobId() {
        return jobId;
    }

    public void setJobId(String jobId) {
        this.jobId = jobId;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(LocalDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }

    public boolean isUsed() {
        return used;
    }

    public void setUsed(boolean used) {
        this.used = used;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
