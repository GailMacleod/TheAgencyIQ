-- Create Job Tables for Resilient Auto-Posting System
-- These tables provide persistence for background jobs across Replit restarts

-- Job Queue table for persistent job storage
CREATE TABLE IF NOT EXISTS post_jobs (
    id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    platform VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    scheduled_time TIMESTAMP NOT NULL,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    last_error TEXT,
    next_retry TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_post_jobs_status (status),
    INDEX idx_post_jobs_scheduled (scheduled_time),
    INDEX idx_post_jobs_user (user_id),
    INDEX idx_post_jobs_platform (platform),
    INDEX idx_post_jobs_retry (next_retry),
    
    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Job Execution Log for audit and debugging
CREATE TABLE IF NOT EXISTS job_execution_log (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR(255) NOT NULL,
    user_id INTEGER NOT NULL,
    platform VARCHAR(50) NOT NULL,
    attempt_number INTEGER NOT NULL,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    success BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    platform_response TEXT,
    platform_post_id VARCHAR(255),
    quota_used INTEGER DEFAULT 0,
    
    -- Indexes
    INDEX idx_job_log_job_id (job_id),
    INDEX idx_job_log_user (user_id),
    INDEX idx_job_log_platform (platform),
    INDEX idx_job_log_started (started_at),
    INDEX idx_job_log_success (success),
    
    -- Foreign key constraints
    FOREIGN KEY (job_id) REFERENCES post_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Platform Quota Tracking for rate limiting
CREATE TABLE IF NOT EXISTS platform_quota_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    platform VARCHAR(50) NOT NULL,
    quota_period VARCHAR(20) NOT NULL, -- 'hourly', 'daily', 'monthly'
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    posts_count INTEGER DEFAULT 0,
    quota_limit INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate quota records
    UNIQUE KEY unique_user_platform_period (user_id, platform, quota_period, period_start),
    
    -- Indexes
    INDEX idx_quota_user_platform (user_id, platform),
    INDEX idx_quota_period (period_start, period_end),
    INDEX idx_quota_platform (platform),
    
    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Job Retry Configuration table
CREATE TABLE IF NOT EXISTS job_retry_config (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(50) NOT NULL,
    error_type VARCHAR(100) NOT NULL,
    max_attempts INTEGER DEFAULT 5,
    base_delay INTEGER DEFAULT 60, -- seconds
    max_delay INTEGER DEFAULT 3600, -- seconds
    backoff_multiplier DECIMAL(3,2) DEFAULT 2.0,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE KEY unique_platform_error (platform, error_type),
    
    -- Indexes
    INDEX idx_retry_config_platform (platform),
    INDEX idx_retry_config_enabled (enabled)
);

-- Insert default retry configurations
INSERT INTO job_retry_config (platform, error_type, max_attempts, base_delay, max_delay, backoff_multiplier) VALUES
('facebook', 'auth_error', 3, 300, 3600, 2.0),
('facebook', 'quota_exceeded', 5, 900, 7200, 1.5),
('facebook', 'rate_limit', 8, 60, 1800, 2.0),
('facebook', 'network_error', 5, 30, 300, 2.0),

('instagram', 'auth_error', 3, 300, 3600, 2.0),
('instagram', 'quota_exceeded', 5, 1800, 7200, 1.5),
('instagram', 'rate_limit', 8, 120, 1800, 2.0),
('instagram', 'network_error', 5, 30, 300, 2.0),

('linkedin', 'auth_error', 3, 300, 3600, 2.0),
('linkedin', 'quota_exceeded', 3, 1800, 7200, 1.5),
('linkedin', 'rate_limit', 5, 300, 1800, 2.0),
('linkedin', 'network_error', 5, 30, 300, 2.0),

('twitter', 'auth_error', 3, 300, 3600, 2.0),
('twitter', 'quota_exceeded', 5, 900, 7200, 1.5),
('twitter', 'rate_limit', 8, 60, 1800, 2.0),
('twitter', 'network_error', 5, 30, 300, 2.0),

('youtube', 'auth_error', 3, 300, 3600, 2.0),
('youtube', 'quota_exceeded', 3, 3600, 21600, 1.5),
('youtube', 'rate_limit', 5, 300, 1800, 2.0),
('youtube', 'network_error', 5, 30, 300, 2.0)
ON DUPLICATE KEY UPDATE
    max_attempts = VALUES(max_attempts),
    base_delay = VALUES(base_delay),
    max_delay = VALUES(max_delay),
    backoff_multiplier = VALUES(backoff_multiplier),
    updated_at = NOW();

-- Create triggers for automatic timestamp updates
DELIMITER $$

CREATE TRIGGER update_post_jobs_timestamp
    BEFORE UPDATE ON post_jobs
    FOR EACH ROW
BEGIN
    SET NEW.updated_at = NOW();
END$$

CREATE TRIGGER update_platform_quota_timestamp
    BEFORE UPDATE ON platform_quota_usage
    FOR EACH ROW
BEGIN
    SET NEW.updated_at = NOW();
END$$

CREATE TRIGGER update_retry_config_timestamp
    BEFORE UPDATE ON job_retry_config
    FOR EACH ROW
BEGIN
    SET NEW.updated_at = NOW();
END$$

DELIMITER ;

-- Create views for easy monitoring
CREATE VIEW job_status_summary AS
SELECT 
    status,
    platform,
    COUNT(*) as job_count,
    MIN(created_at) as oldest_job,
    MAX(created_at) as newest_job,
    AVG(attempts) as avg_attempts
FROM post_jobs
GROUP BY status, platform;

CREATE VIEW quota_usage_summary AS
SELECT 
    user_id,
    platform,
    quota_period,
    posts_count,
    quota_limit,
    (posts_count / quota_limit * 100) as usage_percentage,
    period_start,
    period_end
FROM platform_quota_usage
WHERE period_end > NOW();

CREATE VIEW failed_jobs_analysis AS
SELECT 
    pj.platform,
    pj.last_error,
    COUNT(*) as failure_count,
    AVG(pj.attempts) as avg_attempts_before_failure,
    MAX(pj.updated_at) as last_failure
FROM post_jobs pj
WHERE pj.status = 'failed'
GROUP BY pj.platform, pj.last_error
ORDER BY failure_count DESC;

-- Create stored procedures for job management
DELIMITER $$

CREATE PROCEDURE GetNextJobsBatch(IN batch_size INT)
BEGIN
    SELECT * FROM post_jobs 
    WHERE status = 'pending' 
      AND scheduled_time <= NOW()
      AND (next_retry IS NULL OR next_retry <= NOW())
    ORDER BY scheduled_time ASC
    LIMIT batch_size;
END$$

CREATE PROCEDURE UpdateJobStatus(
    IN job_id VARCHAR(255),
    IN new_status VARCHAR(20),
    IN error_msg TEXT,
    IN retry_time TIMESTAMP
)
BEGIN
    UPDATE post_jobs 
    SET status = new_status,
        last_error = error_msg,
        next_retry = retry_time,
        updated_at = NOW()
    WHERE id = job_id;
END$$

CREATE PROCEDURE CleanupOldJobs(IN days_old INT)
BEGIN
    DELETE FROM post_jobs 
    WHERE status IN ('completed', 'failed') 
      AND updated_at < DATE_SUB(NOW(), INTERVAL days_old DAY);
    
    DELETE FROM job_execution_log 
    WHERE started_at < DATE_SUB(NOW(), INTERVAL days_old DAY);
END$$

DELIMITER ;

-- Create indexes for performance optimization
CREATE INDEX idx_post_jobs_composite_ready ON post_jobs (status, scheduled_time, next_retry);
CREATE INDEX idx_job_execution_log_composite ON job_execution_log (user_id, platform, started_at);
CREATE INDEX idx_platform_quota_active ON platform_quota_usage (user_id, platform, period_end);

-- Add comments for documentation
ALTER TABLE post_jobs COMMENT = 'Persistent storage for background posting jobs with retry logic';
ALTER TABLE job_execution_log COMMENT = 'Audit log for job execution attempts and results';
ALTER TABLE platform_quota_usage COMMENT = 'Tracks API quota usage per platform per user';
ALTER TABLE job_retry_config COMMENT = 'Configuration for retry logic per platform and error type';

-- Grant permissions (adjust according to your user setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON post_jobs TO 'app_user'@'%';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON job_execution_log TO 'app_user'@'%';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON platform_quota_usage TO 'app_user'@'%';
-- GRANT SELECT ON job_retry_config TO 'app_user'@'%';

COMMIT;