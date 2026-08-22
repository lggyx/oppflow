use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use validator::Validate;
use crate::entities::*;

// ============================
// API Response
// ============================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub code: i32,
    pub message: String,
    pub data: Option<T>,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            code: 0,
            message: "success".to_string(),
            data: Some(data),
        }
    }

    pub fn error(code: i32, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
            data: None,
        }
    }
}

// ============================
// Auth DTOs
// ============================

#[derive(Debug, Deserialize, Validate)]
pub struct RegisterRequest {
    #[validate(email(message = "Invalid email format"))]
    pub email: String,
    #[validate(length(min = 8, message = "Password must be at least 8 characters"))]
    pub password: String,
    #[validate(length(min = 2, max = 50, message = "Display name must be 2-50 characters"))]
    pub display_name: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct LoginRequest {
    #[validate(email(message = "Invalid email format"))]
    pub email: String,
    #[validate(length(min = 1, message = "Password is required"))]
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub user_id: Uuid,
    pub display_name: String,
    pub role: UserRole,
    pub tier: UserTier,
}

#[derive(Debug, Deserialize)]
pub struct RefreshTokenRequest {
    pub refresh_token: String,
}

// ============================
// Opportunity DTOs
// ============================

#[derive(Debug, Deserialize, Validate)]
pub struct CreateOpportunityRequest {
    #[validate(length(min = 1, max = 120, message = "Title must be 1-120 characters"))]
    pub title: String,
    pub opp_type: OpportunityType,
    pub tags: Vec<String>,
    pub visibility: Visibility,
    #[validate(length(min = 1, max = 500, message = "Summary must be 1-500 characters"))]
    pub summary: String,
    pub description: String,
    pub requirements: Vec<String>,
    pub deliverables: Vec<String>,
    pub compensation: CompensationInfo,
    pub max_participants: Option<i32>,
    pub application_method: ApplicationMethod,
    pub screening_questions: Option<Vec<String>>,
    pub timeline: TimelineInfo,
    pub apply_deadline: Option<DateTime<Utc>>,
    pub start_at: Option<DateTime<Utc>>,
    pub end_at: Option<DateTime<Utc>>,
    pub expected_duration: Option<String>,
}

#[derive(Debug, Deserialize, Validate, Serialize)]
pub struct CompensationInfo {
    pub comp_type: CompensationType,
    pub range: Option<String>,
    pub currency: Option<String>,
}

#[derive(Debug, Deserialize, Validate, Serialize)]
pub struct TimelineInfo {
    pub publish_at: DateTime<Utc>,
    pub apply_deadline: Option<DateTime<Utc>>,
    pub start_at: Option<DateTime<Utc>>,
    pub end_at: Option<DateTime<Utc>>,
    pub expected_duration: String,
}

#[derive(Debug, Serialize)]
pub struct OpportunityResponse {
    pub id: Uuid,
    pub title: String,
    pub opp_type: OpportunityType,
    pub tags: Vec<String>,
    pub status: OpportunityStatus,
    pub visibility: Visibility,
    pub summary: String,
    pub description: String,
    pub publisher: PublisherInfo,
    pub compensation: CompensationInfo,
    pub application_method: ApplicationMethod,
    pub max_participants: Option<i32>,
    pub metrics: OpportunityMetrics,
    pub created_at: DateTime<Utc>,
    pub published_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
pub struct PublisherInfo {
    pub user_id: Uuid,
    pub display_name: String,
    pub tier: UserTier,
}

#[derive(Debug, Serialize)]
pub struct OpportunityMetrics {
    pub view_count: i32,
    pub apply_count: i32,
    pub participant_count: i32,
}

#[derive(Debug, Deserialize)]
pub struct OpportunityListQuery {
    pub page: Option<u32>,
    pub page_size: Option<u32>,
    pub opp_type: Option<OpportunityType>,
    pub status: Option<OpportunityStatus>,
    pub tags: Option<Vec<String>>,
    pub keyword: Option<String>,
}

// ============================
// Identity DTOs
// ============================

#[derive(Debug, Deserialize, Validate)]
pub struct ImportIdentityRequest {
    pub card_data: serde_json::Value, // Digital Identity Card JSON
    pub signature: String,
    pub checksum: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct AddPlatformLinkRequest {
    pub platform: PlatformType,
    pub url: String,
}

#[derive(Debug, Deserialize)]
pub struct VerifyPlatformRequest {
    pub method: VerificationMethod,
    pub verification_data: Option<serde_json::Value>,
}

// ============================
// Collaboration DTOs
// ============================

#[derive(Debug, Deserialize, Validate)]
pub struct CreateCoffeeChatRequest {
    pub target_user_id: Uuid,
    pub message: Option<String>,
    pub proposed_times: Vec<DateTime<Utc>>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CoffeeChatFeedbackRequest {
    pub collaboration_id: Uuid,
    pub to_user_id: Uuid,
    pub communication_quality: String,
    pub technical_depth: String,
    pub collaboration_willingness: String,
    pub topics_discussed: Vec<String>,
    pub agreed_next_steps: Option<String>,
    pub would_collaborate_again: bool,
    pub evidence_links: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateForumPostRequest {
    pub title: String,
    pub content: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateReplyRequest {
    pub content: String,
    pub parent_reply_id: Option<Uuid>,
}

// ============================
// Trust DTOs
// ============================

#[derive(Debug, Deserialize, Validate)]
pub struct CreateEvidenceRequest {
    pub subject_type: SubjectType,
    pub subject_id: Uuid,
    pub evidence_type: EvidenceType,
    pub evidence_data: serde_json::Value,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ChallengeEvidenceRequest {
    pub target_evidence_id: Uuid,
    pub challenge_reason: String,
    pub challenge_type: ChallengeType,
    pub supporting_materials: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(rename_all = "snake_case")]
pub enum ChallengeType {
    SourceUnavailable,
    FactuallyIncorrect,
    Outdated,
    ConflictOfInterest,
    Other,
}

// ============================
// AI DTOs
// ============================

#[derive(Debug, Deserialize, Validate)]
pub struct GenerateOpportunitySummaryRequest {
    pub opportunity_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct GenerateOpportunitySummaryResponse {
    pub summary: String,
    pub suggested_tags: Vec<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct GenerateChatSummaryRequest {
    pub collaboration_id: Uuid,
    pub transcript: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct GenerateChatSummaryResponse {
    pub summary: String,
    pub topics: Vec<String>,
    pub key_decisions: Vec<String>,
}
