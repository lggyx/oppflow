use axum::{
    extract::{Path, Query, State},
    Json,
};
use shared::dto::*;
use sqlx::SqlitePool;
use crate::error::{AppError, Result};

pub async fn create_opportunity(
    State(pool): State<SqlitePool>,
    Json(req): Json<CreateOpportunityRequest>,
) -> Result<Json<ApiResponse<OpportunityResponse>>> {
    req.validate()?;

    // Get current user from extensions (set by auth middleware)
    // In real code, extract user_id from request extensions
    let user_id = uuid::Uuid::new_v4(); // Placeholder

    // Verify user has contributor+ tier
    let user = sqlx::query_as!(User, "SELECT * FROM users WHERE id = ?", user_id)
        .fetch_one(&pool)
        .await?;

    if matches!(user.current_tier, UserTier::Visitor | UserTier::Participant) {
        return Err(AppError::Forbidden("Contributor tier or higher required".to_string()));
    }

    let opportunity_id = uuid::Uuid::new_v4();

    sqlx::query!(
        r#"
        INSERT INTO opportunities (
            id, publisher_id, title, opp_type, tags, status, visibility,
            summary, description, requirements, deliverables,
            compensation_type, compensation_range, compensation_currency,
            max_participants, application_method, screening_questions,
            timeline, trust_data, metrics, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        opportunity_id,
        user_id,
        req.title,
        OpportunityType::from(req.opp_type) as i32,
        serde_json::to_string(&req.tags)?,
        OpportunityStatus::Draft as i32,
        Visibility::from(req.visibility) as i32,
        req.summary,
        req.description,
        serde_json::to_string(&req.requirements)?,
        serde_json::to_string(&req.deliverables)?,
        CompensationType::from(req.compensation.comp_type) as i32,
        req.compensation.range,
        req.compensation.currency,
        req.max_participants,
        ApplicationMethod::from(req.application_method) as i32,
        serde_json::to_string(&req.screening_questions)?,
        serde_json::to_string(&req.timeline)?,
        "{}",
        "{}",
        Utc::now(),
        Utc::now(),
    )
    .execute(&pool)
    .await?;

    // TODO: Trigger AI summary generation

    Ok(Json(ApiResponse::success(OpportunityResponse {
        id: opportunity_id,
        title: req.title,
        opp_type: req.opp_type,
        tags: req.tags,
        status: OpportunityStatus::Draft,
        visibility: req.visibility,
        summary: req.summary,
        description: req.description,
        publisher: PublisherInfo {
            user_id,
            display_name: user.display_name,
            tier: user.current_tier,
        },
        compensation: req.compensation,
        application_method: req.application_method,
        max_participants: req.max_participants,
        metrics: OpportunityMetrics {
            view_count: 0,
            apply_count: 0,
            participant_count: 0,
        },
        created_at: Utc::now(),
        published_at: None,
    })))
}

pub async fn list_opportunities(
    State(pool): State<SqlitePool>,
    Query(params): Query<OpportunityListQuery>,
) -> Result<Json<ApiResponse<Vec<OpportunityResponse>>>> {
    let page = params.page.unwrap_or(1).max(1) as i32;
    let page_size = params.page_size.unwrap_or(20).min(100) as i32;
    let offset = (page - 1) * page_size;

    // Build query with optional filters
    let mut sql = String::from(
        "SELECT o.*, u.display_name as publisher_name, u.current_tier as publisher_tier
         FROM opportunities o
         JOIN users u ON o.publisher_id = u.id
         WHERE o.status IN ('published', 'open', 'active')"
    );

    if let Some(ref tags) = params.tags {
        if !tags.is_empty() {
            sql.push_str(" AND json_extract(o.tags, '$') LIKE ?");
        }
    }

    if let Some(ref keyword) = params.keyword {
        sql.push_str(" AND (o.title LIKE ? OR o.summary LIKE ?)");
    }

    sql.push_str(" ORDER BY o.created_at DESC LIMIT ? OFFSET ?");

    // TODO: Execute query and map to OpportunityResponse

    Ok(Json(ApiResponse::success(vec![])))
}

pub async fn get_opportunity(
    State(pool): State<SqlitePool>,
    Path(id): Path<uuid::Uuid>,
) -> Result<Json<ApiResponse<OpportunityResponse>>> {
    let opportunity = sqlx::query_as!(Opportunity, "SELECT * FROM opportunities WHERE id = ?", id)
        .fetch_optional(&pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Opportunity not found".to_string()))?;

    // Increment view count
    sqlx::query!("UPDATE opportunities SET metrics = json_set(metrics, '$.view_count', view_count + 1) WHERE id = ?", id)
        .execute(&pool)
        .await?;

    // TODO: Map to OpportunityResponse

    Ok(Json(ApiResponse::success(OpportunityResponse {
        id: opportunity.id,
        title: opportunity.title,
        opp_type: opportunity.opp_type,
        tags: serde_json::from_str(&opportunity.tags)?,
        status: opportunity.status,
        visibility: opportunity.visibility,
        summary: opportunity.summary,
        description: opportunity.description,
        publisher: PublisherInfo {
            user_id: opportunity.publisher_id,
            display_name: "".to_string(),
            tier: UserTier::Participant,
        },
        compensation: CompensationInfo {
            comp_type: opportunity.compensation_type,
            range: opportunity.compensation_range,
            currency: opportunity.compensation_currency,
        },
        application_method: opportunity.application_method,
        max_participants: opportunity.max_participants,
        metrics: OpportunityMetrics {
            view_count: 0,
            apply_count: 0,
            participant_count: 0,
        },
        created_at: opportunity.created_at,
        published_at: opportunity.published_at,
    })))
}

pub async fn update_opportunity_status(
    State(pool): State<SqlitePool>,
    Path(id): Path<uuid::Uuid>,
    Json(req): Json<UpdateOpportunityStatusRequest>,
) -> Result<Json<ApiResponse<OpportunityResponse>>> {
    // Verify user is the publisher or admin/moderator
    // Update status
    sqlx::query!(
        "UPDATE opportunities SET status = ?, updated_at = ? WHERE id = ?",
        OpportunityStatus::from(req.status) as i32,
        Utc::now(),
        id
    )
    .execute(&pool)
    .await?;

    // Return updated opportunity
    get_opportunity(State(pool), Path(id)).await
}

pub async fn apply_opportunity(
    State(pool): State<SqlitePool>,
    Path(id): Path<uuid::Uuid>,
    Json(req): Json<ApplyOpportunityRequest>,
) -> Result<Json<ApiResponse<()>>> {
    // Verify opportunity is open for application
    let opportunity = sqlx::query_as!(Opportunity, "SELECT * FROM opportunities WHERE id = ?", id)
        .fetch_optional(&pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Opportunity not found".to_string()))?;

    if !matches!(opportunity.status, OpportunityStatus::Open | OpportunityStatus::Published) {
        return Err(AppError::BadRequest("Opportunity is not open for applications".to_string()));
    }

    // Check if user already applied
    // TODO: Check participant_ids in metrics JSON

    // Add user to participants
    // TODO: Update metrics.participant_ids

    Ok(Json(ApiResponse::success(())))
}

pub async fn archive_opportunity(
    State(pool): State<SqlitePool>,
    Path(id): Path<uuid::Uuid>,
) -> Result<Json<ApiResponse<()>>> {
    sqlx::query!(
        "UPDATE opportunities SET status = ?, archive_data = ?, updated_at = ? WHERE id = ?",
        OpportunityStatus::Archived as i32,
        serde_json::to_string(&serde_json::json!({"archived_at": Utc::now()}))?,
        Utc::now(),
        id
    )
    .execute(&pool)
    .await?;

    Ok(Json(ApiResponse::success(())))
}

// Helper DTOs
#[derive(Debug, Deserialize, Validate)]
pub struct UpdateOpportunityStatusRequest {
    pub status: OpportunityStatus,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ApplyOpportunityRequest {
    pub message: Option<String>,
    pub answers: Option<Vec<String>>,
}
