-- V1__create_jobs_table.sql
-- Creates the jobs table for tracking file conversion/edit operations

CREATE TABLE jobs (
    id VARCHAR(36) PRIMARY KEY,
    status VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
    job_type VARCHAR(255),
    operation_type VARCHAR(255),
    input_file_name VARCHAR(255),
    input_file_path VARCHAR(1024),
    output_file_path VARCHAR(1024),
    original_file_name VARCHAR(255),
    error_message VARCHAR(2048),
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    progress INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    completed_at TIMESTAMP
);
