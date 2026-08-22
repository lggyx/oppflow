use axum::{extract::{Path, State}, Json};
use shared::dto::*;
use sqlx::SqlitePool;
use crate::error::{AppError, Result};

pub async fn get_evidence_panel(
    State(pool): State<SqlitePool>,
    Path((subject_type, subject_id)): Path<(String, uuid::Uuid)>,
) -> Result<Json<ApiResponse<Vec<Evidence>>>> {
    let evidence = sqlx::query_as!(
        Evidence,
        "SELECT * FROM evidence WHERE subject_type = ? AND subject_id = ? ORDER BY created_at DESC",
        subject_type,
        subject_id
    )
    .fetch_all(&pool)
    .await?;

    Ok(Json(ApiResponse::success(evidence)))
}

pub async fn create_evidence(
    State(pool): State<SqlitePool>,
    Json(req): Json<CreateEvidenceRequest>,
) -> Result<Json<ApiResponse<Evidence>>> {
    req.validate()?;

    let evidence_id = uuid::Uuid::new_v4();
    let evidence = sqlx::query_as!(
        Evidence,
        r#"
        INSERT INTO evidence (id, evidence_type, created_at, subject_type, subject_id, evidence_data, verifiable_by, status, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING *
        "#,
        evidence_id,
        EvidenceType::from(req.evidence_type) as i32,
        Utc::now(),
        SubjectType::from(req.subject_type) as i32,
        req.subject_id,
        serde_json::to_string(&req.evidence_data)?,
        "[]",
        EvidenceStatus::Active as i32,
        Utc::now(),
    )
    .fetch_one(&pool)
    .await?;

    Ok(Json(ApiResponse::success(evidence)))
}

pub async fn challenge_evidence(
    State(pool): State<SqlitePool>,
    Path(evidence_id): Path<uuid::Uuid>,
    Json(req): Json<ChallengeEvidenceRequest>,
) -> Result<Json<ApiResponse<()>>> {
    req.validate()?;

    sqlx::query!(
        r#"
        UPDATE evidence
        SET challenged_by = json_array(challenged_by, ?),
            status = 'challenged',
            updated_at = ?
        WHERE id = ?
        "#,
        serde_json::to_string(&serde_json::json!({
            "challenger_id": uuid::Uuid::new_v4(),
            "reason": req.challenge_reason,
            "challenge_type": req.challenge_type,
            "created_at": Utc::now(),
        }))?,
        Utc::now(),
        evidence_id,
    )
    .execute(&pool)
    .await?;

    // TODO: Notify evidence owner and trigger review

    Ok(Json(ApiResponse::success(())))
}

pub async fn get_audit_log(
    State(pool): State<SqlitePool>,
    Path(evidence_id): Path<uuid::Uuid>,
) -> Result<Json<ApiResponse<Vec<()>>>> {
    // TODO: Fetch audit log entries
    Ok(Json(ApiResponse::success(vec![])))
}
