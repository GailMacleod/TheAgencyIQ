-- Create OAuth Tables for Secure Token Management
-- These tables handle OAuth states, tokens, and security features

-- OAuth States table for CSRF protection and PKCE
CREATE TABLE IF NOT EXISTS oauth_states (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    platform VARCHAR(50) NOT NULL,
    state VARCHAR(255) NOT NULL,
    code_verifier VARCHAR(255) NOT NULL,
    csrf_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '1 hour'),
    
    -- Unique constraint to prevent duplicate states
    UNIQUE KEY unique_user_platform_state (user_id, platform, state),
    
    -- Indexes for performance
    INDEX idx_oauth_states_user_platform (user_id, platform),
    INDEX idx_oauth_states_state (state),
    INDEX idx_oauth_states_expires (expires_at),
    
    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Platform Tokens table for secure encrypted token storage
CREATE TABLE IF NOT EXISTS platform_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    platform VARCHAR(50) NOT NULL,
    access_token TEXT NOT NULL, -- Encrypted in application layer
    refresh_token TEXT, -- Encrypted in application layer
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expires_in INTEGER DEFAULT 3600,
    expires_at TIMESTAMP,
    scope TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Unique constraint per user per platform
    UNIQUE KEY unique_user_platform (user_id, platform),
    
    -- Indexes
    INDEX idx_platform_tokens_user (user_id),
    INDEX idx_platform_tokens_platform (platform),
    INDEX idx_platform_tokens_expires (expires_at),
    INDEX idx_platform_tokens_user_platform (user_id, platform),
    
    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- OAuth Audit Log for security monitoring
CREATE TABLE IF NOT EXISTS oauth_audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    platform VARCHAR(50),
    event_type VARCHAR(100) NOT NULL,
    event_data JSON,
    client_ip VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_oauth_audit_user (user_id),
    INDEX idx_oauth_audit_platform (platform),
    INDEX idx_oauth_audit_event_type (event_type),
    INDEX idx_oauth_audit_created (created_at),
    INDEX idx_oauth_audit_ip (client_ip),
    
    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- OAuth Rate Limits table for abuse protection
CREATE TABLE IF NOT EXISTS oauth_rate_limits (
    id SERIAL PRIMARY KEY,
    client_ip VARCHAR(45) NOT NULL,
    user_id INTEGER,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP DEFAULT NOW(),
    window_end TIMESTAMP DEFAULT (NOW() + INTERVAL '15 minutes'),
    last_request TIMESTAMP DEFAULT NOW(),
    
    -- Unique constraint per IP per window
    UNIQUE KEY unique_ip_window (client_ip, window_start),
    
    -- Indexes
    INDEX idx_oauth_rate_limits_ip (client_ip),
    INDEX idx_oauth_rate_limits_user (user_id),
    INDEX idx_oauth_rate_limits_window (window_start, window_end),
    
    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Platform Configuration table for dynamic OAuth settings
CREATE TABLE IF NOT EXISTS oauth_platform_config (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(50) NOT NULL,
    client_id VARCHAR(255) NOT NULL,
    client_secret_encrypted TEXT NOT NULL, -- Encrypted
    auth_url VARCHAR(500) NOT NULL,
    token_url VARCHAR(500) NOT NULL,
    refresh_url VARCHAR(500),
    scope TEXT NOT NULL,
    use_pkce BOOLEAN DEFAULT TRUE,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Unique constraint per platform
    UNIQUE KEY unique_platform (platform),
    
    -- Indexes
    INDEX idx_oauth_platform_config_platform (platform),
    INDEX idx_oauth_platform_config_enabled (enabled)
);

-- Create triggers for automatic timestamp updates
DELIMITER $$

CREATE TRIGGER update_platform_tokens_timestamp
    BEFORE UPDATE ON platform_tokens
    FOR EACH ROW
BEGIN
    SET NEW.updated_at = NOW();
END$$

CREATE TRIGGER update_oauth_platform_config_timestamp
    BEFORE UPDATE ON oauth_platform_config
    FOR EACH ROW
BEGIN
    SET NEW.updated_at = NOW();
END$$

DELIMITER ;

-- Create indexes for performance optimization
CREATE INDEX idx_oauth_states_composite ON oauth_states (user_id, platform, expires_at);
CREATE INDEX idx_platform_tokens_composite ON platform_tokens (user_id, platform, expires_at);
CREATE INDEX idx_oauth_audit_composite ON oauth_audit_log (user_id, platform, event_type, created_at);

-- Create views for monitoring and analytics
CREATE VIEW oauth_connection_status AS
SELECT 
    u.id as user_id,
    u.email,
    pt.platform,
    CASE 
        WHEN pt.expires_at > NOW() THEN 'active'
        WHEN pt.expires_at <= NOW() AND pt.refresh_token IS NOT NULL THEN 'expired_refreshable'
        WHEN pt.expires_at <= NOW() AND pt.refresh_token IS NULL THEN 'expired_non_refreshable'
        ELSE 'disconnected'
    END as connection_status,
    pt.expires_at,
    pt.created_at as connected_at,
    pt.updated_at as last_updated
FROM users u
LEFT JOIN platform_tokens pt ON u.id = pt.user_id
ORDER BY u.id, pt.platform;

CREATE VIEW oauth_security_events AS
SELECT 
    oal.created_at,
    oal.event_type,
    oal.platform,
    oal.client_ip,
    oal.user_agent,
    u.email as user_email,
    oal.event_data
FROM oauth_audit_log oal
LEFT JOIN users u ON oal.user_id = u.id
WHERE oal.event_type IN (
    'RATE_LIMIT_EXCEEDED',
    'CSRF_MISSING_STATE',
    'CSRF_INVALID_ORIGIN',
    'STATE_NOT_FOUND',
    'STATE_MISMATCH',
    'INVALID_CALLBACK_PARAMS'
)
ORDER BY oal.created_at DESC;

CREATE VIEW oauth_usage_stats AS
SELECT 
    platform,
    COUNT(DISTINCT user_id) as connected_users,
    COUNT(*) as total_connections,
    AVG(TIMESTAMPDIFF(DAY, created_at, COALESCE(updated_at, NOW()))) as avg_connection_age_days,
    SUM(CASE WHEN expires_at > NOW() THEN 1 ELSE 0 END) as active_connections,
    SUM(CASE WHEN expires_at <= NOW() THEN 1 ELSE 0 END) as expired_connections
FROM platform_tokens
GROUP BY platform;

-- Create stored procedures for common operations
DELIMITER $$

CREATE PROCEDURE CleanupExpiredOAuthStates()
BEGIN
    DELETE FROM oauth_states 
    WHERE expires_at < NOW();
    
    SELECT ROW_COUNT() as deleted_states;
END$$

CREATE PROCEDURE GetUserOAuthStatus(IN user_id_param INT)
BEGIN
    SELECT 
        platform,
        CASE 
            WHEN expires_at > NOW() THEN TRUE
            ELSE FALSE
        END as is_connected,
        expires_at,
        created_at as connected_at
    FROM platform_tokens
    WHERE user_id = user_id_param
    ORDER BY platform;
END$$

CREATE PROCEDURE RevokeUserOAuthConnections(IN user_id_param INT)
BEGIN
    DELETE FROM platform_tokens WHERE user_id = user_id_param;
    DELETE FROM oauth_states WHERE user_id = user_id_param;
    
    INSERT INTO oauth_audit_log (user_id, event_type, event_data)
    VALUES (user_id_param, 'ALL_CONNECTIONS_REVOKED', JSON_OBJECT('revoked_at', NOW()));
    
    SELECT 'All OAuth connections revoked' as message;
END$$

CREATE PROCEDURE LogOAuthEvent(
    IN user_id_param INT,
    IN platform_param VARCHAR(50),
    IN event_type_param VARCHAR(100),
    IN event_data_param JSON,
    IN client_ip_param VARCHAR(45),
    IN user_agent_param TEXT,
    IN session_id_param VARCHAR(255)
)
BEGIN
    INSERT INTO oauth_audit_log (
        user_id, platform, event_type, event_data, 
        client_ip, user_agent, session_id
    ) VALUES (
        user_id_param, platform_param, event_type_param, event_data_param,
        client_ip_param, user_agent_param, session_id_param
    );
END$$

DELIMITER ;

-- Create cleanup job (to be run periodically)
CREATE EVENT IF NOT EXISTS cleanup_oauth_states
ON SCHEDULE EVERY 1 HOUR
DO
  CALL CleanupExpiredOAuthStates();

-- Create cleanup job for old audit logs (keep 90 days)
CREATE EVENT IF NOT EXISTS cleanup_oauth_audit_logs
ON SCHEDULE EVERY 1 DAY
DO
  DELETE FROM oauth_audit_log WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- Create cleanup job for old rate limit entries
CREATE EVENT IF NOT EXISTS cleanup_oauth_rate_limits
ON SCHEDULE EVERY 1 HOUR
DO
  DELETE FROM oauth_rate_limits WHERE window_end < NOW();

-- Add comments for documentation
ALTER TABLE oauth_states COMMENT = 'Stores OAuth state parameters for CSRF protection and PKCE';
ALTER TABLE platform_tokens COMMENT = 'Stores encrypted OAuth tokens for platform connections';
ALTER TABLE oauth_audit_log COMMENT = 'Audit log for OAuth security events and user actions';
ALTER TABLE oauth_rate_limits COMMENT = 'Rate limiting data for OAuth endpoint protection';
ALTER TABLE oauth_platform_config COMMENT = 'Dynamic configuration for OAuth platform settings';

-- Grant permissions (adjust according to your user setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON oauth_states TO 'app_user'@'%';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON platform_tokens TO 'app_user'@'%';
-- GRANT SELECT, INSERT ON oauth_audit_log TO 'app_user'@'%';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON oauth_rate_limits TO 'app_user'@'%';
-- GRANT SELECT ON oauth_platform_config TO 'app_user'@'%';

COMMIT;