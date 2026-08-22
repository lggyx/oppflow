use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ============================
// User & Auth
// ============================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub phone: Option<String>,
    pub password_hash: String,
    pub display_name: String,
    pub avatar_url: Option<String>,
    pub current_tier: UserTier,
    pub role: UserRole,
    pub status: UserStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_active_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(rename_all = "snake_case")]
pub enum UserTier {
    Visitor,
    Participant,
    Contributor,
    TrustedContributor,
    DomainExpert,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(rename_all = "snake_case")]
pub enum UserRole {
    User,
    Moderator,
    Admin,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(rename_all = "snake_case")]
pub enum UserStatus {
    Active,
    Suspended,
    Deactivated,
}

// ============================
// Digital Identity
// ============================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DigitalIdentity {
    pub id: Uuid,
    pub user_id: Uuid,
    pub protocol_version: String,
    pub generated_at: DateTime<Utc>,
    pub generated_by: String,
    pub bio: String,
    pub primary_skills: String, // JSON array
    pub capability_profile: String, // JSON
    pub platform_growth: String, // JSON
    pub signature: String,
    pub checksum: String,
    pub status: IdentityStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(rename_all = "snake_case")]
pub enum IdentityStatus {
    Active,
    Outdated,
    Revoked,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PlatformLink {
    pub id: Uuid,
    pub identity_id: Uuid,
    pub platform: PlatformType,
    pub url: String,
    pub verified: bool,
    pub verification_method: VerificationMethod,
    pub verification_data: Option<String>, // JSON
    pub data_summary: String, // JSON
    pub last_synced_at: Option<DateTime<Utc>>,
    pub status: LinkStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(rename_all = "snake_case")]
pub enum PlatformType {
    GitHub,
    Csdn,
    Bilibili,
    Xiaohongshu,
    Douyin,
    Tiktok,
    Steam,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(rename_all = "snake_case")]
pub enum VerificationMethod {
    OAuth,
    FileUpload,
    BioSignature,
    Manual,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(rename_all = "snake_case")]
pub enum LinkStatus {
    Active,
    Invalid,
    Removed,
}

// ============================
// Opportunity
// ============================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Opportunity {
    pub id: Uuid,
    pub publisher_id: Uuid,
    pub title: String,
    pub opp_type: OpportunityType,
    pub tags: String, // JSON array
    pub status: OpportunityStatus,
    pub visibility: Visibility,
    pub summary: String,
    pub description: String,
    pub requirements: String, // JSON array
    pub deliverables: String, // JSON array
    pub compensation_type: CompensationType,
    pub compensation_range: Option<String>,
    pub compensation_currency: Option<String>,
    pub max_participants: Option<i32>,
    pub application_method: ApplicationMethod,
    pub screening_questions: Option<String>, // JSON array
    pub timeline: String, // JSON
    pub trust_data: String, // JSON
    pub metrics: String, // JSON
    pub archive_data: Option<String>, // JSON
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub published_at: Option<DateTime<Utc>>,
    pub expired_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(rename_all = "snake_case")]
pub enum OpportunityType {
    Project,
    Competition,
    OpenSource,
    Knowledge,
    Connection,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(rename_all = "snake_case")]
pub enum OpportunityStatus {
    Draft,
    PendingReview,
    Published,
    Open,
    Active,
    Closed,
    Archived,
    Expired,
    Disputed,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(rename_all = "snake_case")]
pub enum Visibility {
    Public,
    RegisteredOnly,
    InviteOnly,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(rename_all = "snake_case")]
pub enum CompensationType {
    Fixed,
    Hourly,
    Equity,
    RevenueShare,
    Honorarium,
    None,
    Negotiable,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(rename_all = "snake_case")]
pub enum ApplicationMethod {
    DirectApply,
    Screening,
    Interview,
    InviteOnly,
}

// ============================
// Evidence
// ============================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Evidence {
    pub id: Uuid,
    pub evidence_type: EvidenceType,
    pub created_at: DateTime<Utc>,
    pub subject_type: SubjectType,
    pub subject_id: Uuid,
    pub evidence_data: String, // JSON
    pub verifiable_by: String, // JSON array of UUIDs
    pub challenged_by: Option<String>, // JSON array of ChallengeRef
    pub status: EvidenceStatus,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(rename_all = "snake_case")]
pub enum EvidenceType {
    Source,
    AiVerification,
    ManualReview,
    CommunityVerification,
    Outcome,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(rename_all = "snake_case")]
pub enum SubjectType {
    User,
    Opportunity,
    Information,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(rename_all = "snake_case")]
pub enum EvidenceStatus {
    Active,
    Challenged,
    Overridden,
    Confirmed,
}

// ============================
// Collaboration
// ============================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CollaborationRecord {
    pub id: Uuid,
    pub collab_type: CollaborationType,
    pub opportunity_id: Option<Uuid>,
    pub participants: String, // JSON array
    pub status: CollaborationStatus,
    pub summary: Option<String>,
    pub feedback_data: Option<String>, // JSON
    pub ai_generated_content: Option<String>, // JSON
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(rename_all = "snake_case")]
pub enum CollaborationType {
    CoffeeChat,
    ForumDiscussion,
    ProjectDiscussion,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(rename_all = "snake_case")]
pub enum CollaborationStatus {
    Pending,
    Active,
    Completed,
    Cancelled,
}
