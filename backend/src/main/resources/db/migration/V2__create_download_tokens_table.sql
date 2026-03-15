-- V2__create_download_tokens_table.sql
-- Creates the download_tokens table for secure, time-limited file downloads

CREATE TABLE download_tokens (
    id VARCHAR(36) PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE,
    job_id VARCHAR(36) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP
);
