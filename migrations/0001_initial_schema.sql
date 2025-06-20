-- TheAgencyIQ Database Schema - Initial Migration
-- Enterprise-grade social media automation platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Session management table
CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);

-- Core users table with phone-based identification
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(15) NOT NULL UNIQUE, -- Phone number as UID
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    phone TEXT, -- Legacy support
    subscription_plan TEXT, -- 'starter', 'growth', 'professional'
    subscription_start TIMESTAMP,
    remaining_posts INTEGER DEFAULT 0,
    total_posts INTEGER DEFAULT 0,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Post quota ledger for 30-day enforcement
CREATE TABLE IF NOT EXISTS post_ledger (
    user_id TEXT PRIMARY KEY, -- Mobile number UID
    subscription_tier TEXT NOT NULL, -- 'starter', 'growth', 'professional'
    period_start TIMESTAMP NOT NULL,
    quota INTEGER NOT NULL, -- 12, 27, 52
    used_posts INTEGER DEFAULT 0,
    last_posted TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Post schedule for quota tracking
CREATE TABLE IF NOT EXISTS post_schedule (
    post_id TEXT PRIMARY KEY, -- UUID
    user_id TEXT NOT NULL, -- Mobile number UID
    content TEXT NOT NULL,
    platform TEXT NOT NULL, -- 'facebook', 'instagram', 'linkedin', 'youtube', 'x'
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'posted'
    is_counted BOOLEAN NOT NULL DEFAULT false, -- Only true if posted successfully
    scheduled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Main posts table for content management
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    platform TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'approved', 'published', 'failed'
    scheduled_for TIMESTAMP,
    published_at TIMESTAMP,
    error_log TEXT,
    analytics JSONB,
    ai_recommendation TEXT,
    subscription_cycle TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Platform connections with OAuth tokens
CREATE TABLE IF NOT EXISTS platform_connections (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    platform TEXT NOT NULL,
    platform_user_id TEXT NOT NULL,
    platform_username TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    connection_metadata JSONB
);

-- Brand purpose and strategy
CREATE TABLE IF NOT EXISTS brand_purposes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    brand_name TEXT NOT NULL,
    industry TEXT,
    target_audience TEXT,
    unique_value_proposition TEXT,
    brand_voice TEXT,
    content_themes TEXT[],
    business_goals TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Queensland events calendar
CREATE TABLE IF NOT EXISTS queensland_events (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    location TEXT,
    relevance_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Content generation templates
CREATE TABLE IF NOT EXISTS content_templates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    template_name TEXT NOT NULL,
    platform TEXT NOT NULL,
    template_content TEXT NOT NULL,
    variables JSONB,
    usage_count INTEGER DEFAULT 0,
    performance_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Post analytics and performance tracking
CREATE TABLE IF NOT EXISTS post_analytics (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id),
    platform TEXT NOT NULL,
    platform_post_id TEXT,
    impressions INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    engagement INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    conversion_events INTEGER DEFAULT 0,
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- Subscription and billing history
CREATE TABLE IF NOT EXISTS subscription_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    subscription_plan TEXT NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    status TEXT NOT NULL, -- 'active', 'cancelled', 'expired'
    stripe_subscription_id TEXT,
    amount_paid DECIMAL(10,2),
    posts_allocated INTEGER,
    posts_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- AI content generation history
CREATE TABLE IF NOT EXISTS ai_generation_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    prompt TEXT NOT NULL,
    generated_content TEXT NOT NULL,
    platform TEXT,
    ai_model TEXT DEFAULT 'grok-2-1212',
    generation_time_ms INTEGER,
    quality_score DECIMAL(3,2),
    used_in_post BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- System health and monitoring
CREATE TABLE IF NOT EXISTS system_health_logs (
    id SERIAL PRIMARY KEY,
    component TEXT NOT NULL, -- 'bulletproof_publisher', 'oauth_connections', 'ai_generation'
    status TEXT NOT NULL, -- 'healthy', 'degraded', 'unhealthy'
    message TEXT,
    metadata JSONB,
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_for ON posts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_platform_connections_user_platform ON platform_connections(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_post_ledger_user_id ON post_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_post_schedule_user_platform ON post_schedule(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_queensland_events_date ON queensland_events(date);
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id);

-- Insert Queensland business events for 2025
INSERT INTO queensland_events (date, name, description, category, location) VALUES
('2025-06-21', 'Winter Solstice', 'Shortest day of the year - winter marketing themes', 'seasonal', 'Queensland'),
('2025-07-01', 'New Financial Year', 'Business planning and tax preparation season', 'business', 'Queensland'),
('2025-07-15', 'Gold Coast Marathon', 'Major sporting event attracting tourism', 'sports', 'Gold Coast'),
('2025-08-10', 'Brisbane Festival', 'Arts and culture celebration', 'culture', 'Brisbane'),
('2025-09-01', 'Father''s Day Month', 'Gift and retail promotion period', 'retail', 'Queensland'),
('2025-09-21', 'Spring Equinox', 'Spring renewal and growth themes', 'seasonal', 'Queensland'),
('2025-10-01', 'Queensland Tourism Month', 'Promote local tourism businesses', 'tourism', 'Queensland'),
('2025-11-01', 'Melbourne Cup Day', 'Major racing event - hospitality focus', 'events', 'Queensland'),
('2025-12-01', 'Summer Season Start', 'Summer business preparation', 'seasonal', 'Queensland'),
('2025-12-25', 'Christmas Day', 'Peak retail and hospitality season', 'retail', 'Queensland')
ON CONFLICT (date, name) DO NOTHING;

-- Insert default content templates
INSERT INTO content_templates (user_id, template_name, platform, template_content, variables) VALUES
(0, 'Queensland Business Announcement', 'facebook', 'Exciting news from {brand_name}! {announcement} We''re proud to serve the Queensland community. {call_to_action} #QueenslandBusiness', '{"brand_name": "", "announcement": "", "call_to_action": ""}'),
(0, 'Local Event Promotion', 'linkedin', 'Don''t miss {event_name} happening in {location}! {brand_name} is {participation_type}. Join us for {event_details}. #Queensland #LocalBusiness', '{"event_name": "", "location": "", "brand_name": "", "participation_type": "", "event_details": ""}'),
(0, 'Seasonal Marketing', 'instagram', '🌟 {season} is here! Time for {brand_name} to {seasonal_action}. {offer_details} Visit us in {location}! #Queensland{season}', '{"season": "", "brand_name": "", "seasonal_action": "", "offer_details": "", "location": ""}')
ON CONFLICT DO NOTHING;

COMMIT;