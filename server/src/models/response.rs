use chrono::{DateTime, Utc};
use serde::Serialize;
use shared::entities::*;
use uuid::Uuid;

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

#[derive(Debug, Serialize)]
pub struct PaginatedOpportunityResponse {
    pub items: Vec<OpportunityResponse>,
    pub total: u64,
    pub page: u32,
    pub page_size: u32,
}
