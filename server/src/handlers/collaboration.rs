use axum::{extract::{Path, State}, Json};
use shared::dto::*;
use sqlx::SqlitePool;
use crate::error::{AppError, Result};

pub async fn create_coffee_chat(
    State(pool): State<SqlitePool>,
    Json(req): Json<CreateCoffeeChatRequest>,
) -> Result<Json<ApiResponse<()>>> {
    req.validate()?;

    let user_id = uuid::Uuid::new_v4(); // From auth middleware

    let collab_id = uuid::Uuid::new_v4();
    sqlx::query!(
        r#"
        INSERT INTO collaboration_records (id, collab_type, participants, status, created_at)
        VALUES (?, ?, ?, ?, ?)
        "#,
        collab_id,
        CollaborationType::CoffeeChat as i32,
        serde_json::to_string(&vec![user_id, req.target_user_id])?,
        CollaborationStatus::Pending as i32,
        Utc::now(),
    )
    .execute(&pool)
    .await?;

    // TODO: Send notification to target user

    Ok(Json(ApiResponse::success(())))
}

pub async fn accept_coffee_chat(
    State(pool): State<SqlitePool>,
    Path(id): Path<uuid::Uuid>,
) -> Result<Json<ApiResponse<()>>> {
    sqlx::query!(
        "UPDATE collaboration_records SET status = ? WHERE id = ?",
        CollaborationStatus::Active as i32,
        id
    )
    .execute(&pool)
    .await?;

    Ok(Json(ApiResponse::success(())))
}

pub async fn submit_chat_summary(
    State(pool): State<SqlitePool>,
    Path(id): Path<uuid::Uuid>,
    Json(_req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<()>>> {
    // TODO: AI summary generation and confirmation flow
    Ok(Json(ApiResponse::success(())))
}

pub async fn submit_feedback(
    State(pool): State<SqlitePool>,
    Json(req): Json<CoffeeChatFeedbackRequest>,
) -> Result<Json<ApiResponse<()>>> {
    req.validate()?;

    sqlx::query!(
        r#"
        UPDATE collaboration_records
        SET feedback_data = ?, status = 'completed', completed_at = ?
        WHERE id = ?
        "#,
        serde_json::to_string(&req)?,
        Utc::now(),
        req.collaboration_id,
    )
    .execute(&pool)
    .await?;

    Ok(Json(ApiResponse::success(())))
}

pub async fn list_forum_posts(
    State(pool): State<SqlitePool>,
) -> Result<Json<ApiResponse<Vec<()>>>> {
    // TODO: List forum posts
    Ok(Json(ApiResponse::success(vec![])))
}

pub async fn create_forum_post(
    State(pool): State<SqlitePool>,
    Json(req): Json<CreateForumPostRequest>,
) -> Result<Json<ApiResponse<()>>> {
    req.validate()?;

    let post_id = uuid::Uuid::new_v4();
    sqlx::query!(
        r#"
        INSERT INTO collaboration_records (id, collab_type, participants, status, summary, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        "#,
        post_id,
        CollaborationType::ForumDiscussion as i32,
        "[]",
        CollaborationStatus::Active as i32,
        req.content,
        Utc::now(),
    )
    .execute(&pool)
    .await?;

    // TODO: AI generate summary and tags

    Ok(Json(ApiResponse::success(())))
}

pub async fn create_reply(
    State(pool): State<SqlitePool>,
    Path(_post_id): Path<uuid::Uuid>,
    Json(req): Json<CreateReplyRequest>,
) -> Result<Json<ApiResponse<()>>> {
    req.validate()?;
    // TODO: Insert reply
    Ok(Json(ApiResponse::success(())))
}
