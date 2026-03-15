-- V3__add_indexes.sql
-- Performance indexes based on repository query patterns

-- JobRepository queries
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_jobs_status_created_at ON jobs(status, created_at);

-- DownloadTokenRepository queries
CREATE INDEX idx_download_tokens_token ON download_tokens(token);
CREATE INDEX idx_download_tokens_expires_at ON download_tokens(expires_at);
