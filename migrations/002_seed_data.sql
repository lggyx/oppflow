-- Migration 002: Seed Data
-- AI Opportunity Platform - Test Data

-- Seed Admin User
-- Password: admin123 (bcrypt hashed)
INSERT OR IGNORE INTO users (id, email, password_hash, display_name, current_tier, role, status, created_at, updated_at)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'admin@example.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYNeKx6K1O',
    'Admin User',
    'trusted_contributor',
    'admin',
    'active',
    datetime('now'),
    datetime('now')
);

-- Seed Test Contributor
-- Password: contributor123
INSERT OR IGNORE INTO users (id, email, password_hash, display_name, current_tier, role, status, created_at, updated_at)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'contributor@example.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYNeKx6K1O',
    'Test Contributor',
    'contributor',
    'user',
    'active',
    datetime('now'),
    datetime('now')
);

-- Seed Test Participant
-- Password: participant123
INSERT OR IGNORE INTO users (id, email, password_hash, display_name, current_tier, role, status, created_at, updated_at)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    'participant@example.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYNeKx6K1O',
    'Test Participant',
    'participant',
    'user',
    'active',
    datetime('now'),
    datetime('now')
);

-- Seed Test Opportunity
INSERT OR IGNORE INTO opportunities (
    id, publisher_id, title, opp_type, tags, status, visibility,
    summary, description, requirements, deliverables,
    compensation_type, compensation_range, compensation_currency,
    max_participants, application_method, screening_questions,
    timeline, trust_data, metrics, created_at, updated_at, published_at
)
VALUES (
    '44444444-4444-4444-4444-444444444444',
    '22222222-2222-2222-2222-222222222222',
    '寻找AI模型优化合作伙伴',
    'project',
    '["PyTorch", "模型压缩", "推理优化"]',
    'published',
    'public',
    '寻找有PyTorch模型优化经验的开发者，共同优化大模型推理性能',
    '项目目标：将现有大模型推理速度提升2-3倍，同时保持精度。要求熟悉TensorRT、ONNX Runtime等推理框架。',
    '["PyTorch", "TensorRT", "C++", "CUDA"]',
    '["优化后的模型文件", "性能对比报告", "技术文档"]',
    'fixed',
    '5000-10000',
    'CNY',
    2,
    'screening',
    '["请描述你最近的模型优化项目", "你对推理加速的理解"]',
    '{"expected_duration": "2个月"}',
    '{}',
    '{"view_count": 0, "apply_count": 0, "participant_ids": []}',
    datetime('now'),
    datetime('now'),
    datetime('now')
);

-- Seed Test Digital Identity
INSERT OR IGNORE INTO digital_identities (
    id, user_id, protocol_version, generated_at, generated_by, bio, primary_skills,
    capability_profile, platform_growth, signature, checksum, status, created_at, updated_at
)
VALUES (
    '55555555-5555-5555-5555-555555555555',
    '22222222-2222-2222-2222-222222222222',
    '0.1',
    datetime('now'),
    'ai-identity-agent/0.1.0',
    'AI 领域全栈开发者，专注于大模型应用开发和系统优化',
    '["Python", "Rust", "PyTorch", "LLM", "系统架构"]',
    '{"technical_depth": "在大模型应用开发方面有丰富实践经验", "collaboration_style": "倾向于开源协作和技术分享"}',
    '{"current_tier": "contributor", "evidence_chain": [], "domain_tags": ["AI", "LLM"]}',
    'base64_signature_placeholder',
    'sha256_checksum_placeholder',
    'active',
    datetime('now'),
    datetime('now')
);

-- Seed Platform Links
INSERT OR IGNORE INTO platform_links (id, identity_id, platform, url, verified, verification_method, data_summary, last_synced_at, status)
VALUES
    ('66666666-6666-6666-6666-666666666666', '55555555-5555-5555-5555-555555555555', 'github', 'https://github.com/testuser', 1, 'oauth', '{"repos_count": 25, "stars_count": 150, "top_languages": ["Python", "Rust"]}', datetime('now'), 'active'),
    ('77777777-7777-7777-7777-777777777777', '55555555-5555-5555-5555-555555555555', 'csdn', 'https://blog.csdn.net/testuser', 0, 'manual', '{"articles_count": 10, "total_views": 5000}', datetime('now'), 'active');
