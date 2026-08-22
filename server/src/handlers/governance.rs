use axum::{extract::{Path, State}, Json};
use sqlx::SqlitePool;
use crate::error::{AppError, Result};

pub async fn get_review_queue(
    State(pool): State<SqlitePool>,
) -> Result<Json<ApiResponse<Vec<()>>>> {
    let items = sqlx::query!(
        "SELECT * FROM opportunities WHERE status = 'pending_review' ORDER BY created_at ASC"
    )
    .fetch_all(&pool)
    .await?;

    Ok(Json(ApiResponse::success(vec![])))
}

pub async fn review_content(
    State(pool): State<SqlitePool>,
    Path(id): Path<uuid::Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<()>>> {
    let action = req.get("action").and_then(|v| v.as_str()).unwrap_or("approve");

    let new_status = match action {
        "approve" => OpportunityStatus::Published,
        "reject" => OpportunityStatus::Draft,
        _ => return Err(AppError::BadRequest("Invalid action".to_string())),
    };

    sqlx::query!(
        "UPDATE opportunities SET status = ?, updated_at = ? WHERE id = ?",
        new_status as i32,
        Utc::now(),
        id
    )
    .execute(&pool)
    .await?;

    // TODO: Create manual review evidence

    Ok(Json(ApiResponse::success(())))
}

pub async fn process_challenge(
    State(pool): State<SqlitePool>,
    Path(challenge_id): Path<uuid::Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<()>>> {
    // TODO: Update challenge status and evidence accordingly
    Ok(Json(ApiResponse::success(())))
}

pub async fn arbitrate(
    State(pool): State<SqlitePool>,
    Json(_req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<()>>> {
    // TODO: Arbitration committee vote and outcome
    Ok(Json(ApiResponse::success(())))
}
