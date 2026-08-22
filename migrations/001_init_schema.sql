-- Migration 001: Initial Schema
-- AI Opportunity Platform - Core Tables

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- ============================
-- Users
-- ============================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    current_tier TEXT NOT NULL DEFAULT 'visitor',
    role TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_active_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(current_tier);

-- ============================
-- Digital Identities
-- ============================
CREATE TABLE IF NOT EXISTS digital_identities (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    protocol_version TEXT NOT NULL DEFAULT '0.1',
    generated_at TEXT NOT NULL,
    generated_by TEXT NOT NULL,
    bio TEXT NOT NULL DEFAULT '',
    primary_skills TEXT NOT NULL DEFAULT '[]',
    capability_profile TEXT NOT NULL DEFAULT '{}',
    platform_growth TEXT NOT NULL DEFAULT '{}',
    signature TEXT NOT NULL,
    checksum TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_identities_user_id ON digital_identities(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_identities_user_active ON digital_identities(user_id) WHERE status = 'active';

-- ============================
-- Platform Links
-- ============================
CREATE TABLE IF NOT EXISTS platform_links (
    id TEXT PRIMARY KEY,
    identity_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    url TEXT NOT NULL,
    verified INTEGER NOT NULL DEFAULT 0,
    verification_method TEXT NOT NULL DEFAULT 'manual',
    verification_data TEXT,
    data_summary TEXT NOT NULL DEFAULT '{}',
    last_synced_at TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    FOREIGN KEY (identity_id) REFERENCES digital_identities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_platform_links_identity_id ON platform_links(identity_id);
CREATE INDEX IF NOT EXISTS idx_platform_links_platform ON platform_links(platform);

-- ============================
-- Opportunities
-- ============================
CREATE TABLE IF NOT EXISTS opportunities (
    id TEXT PRIMARY KEY,
    publisher_id TEXT NOT NULL,
    title TEXT NOT NULL,
    opp_type TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'draft',
    visibility TEXT NOT NULL DEFAULT 'public',
    summary TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    requirements TEXT NOT NULL DEFAULT '[]',
    deliverables TEXT NOT NULL DEFAULT '[]',
    compensation_type TEXT NOT NULL DEFAULT 'none',
    compensation_range TEXT,
    compensation_currency TEXT,
    max_participants INTEGER,
    application_method TEXT NOT NULL DEFAULT 'direct_apply',
    screening_questions TEXT,
    timeline TEXT NOT NULL DEFAULT '{}',
    trust_data TEXT NOT NULL DEFAULT '{}',
    metrics TEXT NOT NULL DEFAULT '{}',
    archive_data TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    published_at TEXT,
    expired_at TEXT,
    FOREIGN KEY (publisher_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_opportunities_publisher_id ON opportunities(publisher_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_type ON opportunities(opp_type);
CREATE INDEX IF NOT EXISTS idx_opportunities_created_at ON opportunities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_published_at ON opportunities(published_at DESC);

-- ============================
-- Evidence
-- ============================
CREATE TABLE IF NOT EXISTS evidence (
    id TEXT PRIMARY KEY,
    evidence_type TEXT NOT NULL,
    created_at TEXT NOT NULL,
    subject_type TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    evidence_data TEXT NOT NULL DEFAULT '{}',
    verifiable_by TEXT NOT NULL DEFAULT '[]',
    challenged_by TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_evidence_subject ON evidence(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_evidence_status ON evidence(status);
CREATE INDEX IF NOT EXISTS idx_evidence_created_at ON evidence(created_at DESC);

-- ============================
-- Collaboration Records
-- ============================
CREATE TABLE IF NOT EXISTS collaboration_records (
    id TEXT PRIMARY KEY,
    collab_type TEXT NOT NULL,
    opportunity_id TEXT,
    participants TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'pending',
    summary TEXT,
    feedback_data TEXT,
    ai_generated_content TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_collaboration_opportunity_id ON collaboration_records(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_status ON collaboration_records(status);
CREATE INDEX IF NOT EXISTS idx_collaboration_type ON collaboration_records(collab_type);

-- ============================
-- Refresh Tokens
-- ============================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);

-- ============================
-- Audit Log
-- ============================
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    changes TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================
-- Knowledge Nodes (Forum)
-- ============================
CREATE TABLE IF NOT EXISTS knowledge_nodes (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    verified_by TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    FOREIGN KEY (post_id) REFERENCES collaboration_records(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_status ON knowledge_nodes(status);
