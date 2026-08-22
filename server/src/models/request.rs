use serde::Deserialize;
use validator::Validate;
use shared::entities::*;
use chrono::{DateTime, Utc};

#[derive(Debug, Deserialize, Validate)]
pub struct CreateOpportunityRequest {
    #[validate(length(min = 1, max = 120))]
    pub title: String,
    pub opp_type: OpportunityType,
    pub tags: Vec<String>,
    pub visibility: Visibility,
    #[validate(length(min = 1, max = 500))]
    pub summary: String,
    pub description: String,
    pub requirements: Vec<String>,
    pub deliverables: Vec<String>,
    pub compensation: CompensationInfo,
    pub max_participants: Option<i32>,
    pub application_method: ApplicationMethod,
    pub screening_questions: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Validate, Serialize)]
pub struct CompensationInfo {
    pub comp_type: CompensationType,
    pub range: Option<String>,
    pub currency: Option<String>,
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

#[derive(Debug, Deserialize)]
pub struct UpdateOpportunityStatusRequest {
    pub status: OpportunityStatus,
}

#[derive(Debug, Deserialize)]
pub struct ApplyOpportunityRequest {
    pub message: Option<String>,
    pub answers: Option<Vec<String>>,
}
