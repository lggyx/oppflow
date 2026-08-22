use axum::{extract::State, Json};
use shared::dto::*;
use sqlx::SqlitePool;
use crate::error::{AppError, Result};

pub async fn get_my_status(
    State(pool): State<SqlitePool>,
) -> Result<Json<ApiResponse<()>>> {
    let user_id = uuid::Uuid::new_v4();
    let user = sqlx::query_as!(User, "SELECT * FROM users WHERE id = ?", user_id)
        .fetch_one(&pool)
        .await?;

    Ok(Json(ApiResponse::success(())))
}

pub async fn get_my_progress(
    State(pool): State<SqlitePool>,
) -> Result<Json<ApiResponse<()>>> {
    // TODO: Calculate progress to next tier based on evidence count
    Ok(Json(ApiResponse::success(())))
}

pub async fn apply_expert(
    State(pool): State<SqlitePool>,
    Json(_req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<()>>> {
    // TODO: Submit domain expert application
    Ok(Json(ApiResponse::success(())))
}
