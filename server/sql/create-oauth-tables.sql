-- Create OAuth security tables for enhanced token management
-- Run this script to add the required tables for the OAuth refresh system

-- OAuth States table for CSRF protection and PKCE
CREATE TABLE IF NOT EXISTS oauth_states (
    state TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    code_verifier TEXT NOT NULL,
    csrf_token TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

-- Platform Tokens table for secure encrypted token storage
CREATE TABLE IF NOT EXISTS platform_tokens (
    user_id INTEGER NOT NULL REFERENCES users(id),
    platform TEXT NOT NULL,
    access_token TEXT NOT NULL, -- Encrypted
    refresh_token TEXT, -- Encrypted
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, platform)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_states_user_id ON oauth_states(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_tokens_expires_at ON platform_tokens(expires_at);

-- Add comments for documentation
COMMENT ON TABLE oauth_states IS 'Stores OAuth state parameters for CSRF protection and PKCE';
COMMENT ON TABLE platform_tokens IS 'Stores encrypted OAuth tokens with refresh capabilities';
COMMENT ON COLUMN platform_tokens.access_token IS 'Encrypted access token';
COMMENT ON COLUMN platform_tokens.refresh_token IS 'Encrypted refresh token';

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL ON oauth_states TO your_app_user;
-- GRANT ALL ON platform_tokens TO your_app_user;