-- OAuth Platform Connections Table
-- Migration: 20250620_create_connections_table

CREATE TABLE IF NOT EXISTS connections (
    id SERIAL PRIMARY KEY,
    user_phone VARCHAR(12) UNIQUE NOT NULL,
    platform VARCHAR(20) NOT NULL,
    platform_user_id VARCHAR(50),
    access_token VARCHAR(255) NOT NULL,
    refresh_token VARCHAR(255),
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_phone, platform)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_connections_user_phone ON connections(user_phone);
CREATE INDEX IF NOT EXISTS idx_connections_platform ON connections(platform);
CREATE INDEX IF NOT EXISTS idx_connections_active ON connections(is_active);
CREATE INDEX IF NOT EXISTS idx_connections_expires ON connections(expires_at);

-- Comments for documentation
COMMENT ON TABLE connections IS 'OAuth platform connections linked to user phone numbers';
COMMENT ON COLUMN connections.user_phone IS 'User phone number as unique identifier';
COMMENT ON COLUMN connections.platform IS 'Social media platform (facebook, linkedin, x, youtube, instagram)';
COMMENT ON COLUMN connections.access_token IS 'OAuth access token for API calls';
COMMENT ON COLUMN connections.refresh_token IS 'OAuth refresh token for token renewal';
COMMENT ON COLUMN connections.expires_at IS 'Token expiration timestamp';
COMMENT ON COLUMN connections.is_active IS 'Connection status flag';