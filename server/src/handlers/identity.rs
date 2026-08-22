use axum::{extract::{Path, State}, Json};
use shared::dto::*;
use sqlx::SqlitePool;
use crate::error::{AppError, Result};

pub async fn import_identity(
    State(pool): State<SqlitePool>,
    Json(req): Json<ImportIdentityRequest>,
) -> Result<Json<ApiResponse<()>>> {
    req.validate()?;

    let user_id = uuid::Uuid::new_v4(); // From auth middleware in real code

    // Validate card data structure
    let card: serde_json::Value = req.card_data;
    if card.get("protocol_version").is_none() {
        return Err(AppError::BadRequest("Invalid identity card format".to_string()));
    }

    let identity_id = uuid::Uuid::new_v4();

    sqlx::query!(
        r#"
        INSERT INTO digital_identities (id, user_id, protocol_version, generated_at, generated_by, bio, primary_skills, capability_profile, platform_growth, signature, checksum, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        identity_id,
        user_id,
        card.get("protocol_version").and_then(|v| v.as_str()).unwrap_or("0.1"),
        Utc::now(),
        card.get("generated_by").and_then(|v| v.as_str()).unwrap_or(""),
        card.get("subject").and_then(|s| s.get("bio")).and_then(|v| v.as_str()).unwrap_or(""),
        serde_json::to_string(
            &card.get("subject").and_then(|s| s.get("primary_skills"))
        )?,
        serde_json::to_string(&card.get("capability_profile"))?,
        serde_json::to_string(&card.get("platform_growth"))?,
        req.signature,
        req.checksum,
        shared::entities::IdentityStatus::Active as i32,
        Utc::now(),
        Utc::now(),
    )
    .execute(&pool)
    .await?;

    // TODO: Trigger AI profile generation

    Ok(Json(ApiResponse::success(())))
}

pub async fn get_my_identity(
    State(pool): State<SqlitePool>,
) -> Result<Json<ApiResponse<shared::entities::DigitalIdentity>>> {
    let user_id = uuid::Uuid::new_v4(); // From auth middleware

    let identity = sqlx::query_as!(
        shared::entities::DigitalIdentity,
        "SELECT * FROM digital_identities WHERE user_id = ? AND status = 'active'",
        user_id
    )
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Identity not found".to_string()))?;

    Ok(Json(ApiResponse::success(identity)))
}

pub async fn get_identity_by_id(
    State(pool): State<SqlitePool>,
    Path(id): Path<uuid::Uuid>,
) -> Result<Json<ApiResponse<shared::entities::DigitalIdentity>>> {
    let identity = sqlx::query_as!(
        shared::entities::DigitalIdentity,
        "SELECT * FROM digital_identities WHERE id = ? AND status = 'active'",
        id
    )
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Identity not found".to_string()))?;

    Ok(Json(ApiResponse::success(identity)))
}

pub async fn add_platform_link(
    State(pool): State<SqlitePool>,
    Json(req): Json<AddPlatformLinkRequest>,
) -> Result<Json<ApiResponse<()>>> {
    let user_id = uuid::Uuid::new_v4();

    let identity = sqlx::query_as!(
        shared::entities::DigitalIdentity,
        "SELECT id FROM digital_identities WHERE user_id = ? AND status = 'active'",
        user_id
    )
    .fetch_one(&pool)
    .await?;

    let link_id = uuid::Uuid::new_v4();
    sqlx::query!(
        r#"
        INSERT INTO platform_links (id, identity_id, platform, url, verified, verification_method, data_summary, last_synced_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        link_id,
        identity.id,
        PlatformType::from(req.platform) as i32,
        req.url,
        false,
        VerificationMethod::Manual as i32,
        "{}",
        Utc::now(),
        LinkStatus::Active as i32,
    )
    .execute(&pool)
    .await?;

    Ok(Json(ApiResponse::success(())))
}

pub async fn update_identity(
    State(pool): State<SqlitePool>,
    Json(_req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<()>>> {
    // TODO: Update identity fields
    Ok(Json(ApiResponse::success(())))
}

pub async fn verify_platform(
    State(pool): State<SqlitePool>,
    Path(_id): Path<uuid::Uuid>,
    Json(_req): Json<VerifyPlatformRequest>,
) -> Result<Json<ApiResponse<()>>> {
    // TODO: Implement OAuth or file verification
    Ok(Json(ApiResponse::success(())))
}
