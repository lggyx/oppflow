use axum::{routing::{get, post}, Router};
use sqlx::SqlitePool;
use crate::handlers::trust::{get_evidence_panel, create_evidence, challenge_evidence, get_audit_log};

pub fn routes(pool: SqlitePool) -> Router {
    Router::new()
        .route("/:subject_type/:subject_id", get(get_evidence_panel))
        .route("/evidence", post(create_evidence))
        .route("/evidence/:id/challenge", post(challenge_evidence))
        .route("/evidence/:id/audit-log", get(get_audit_log))
        .with_state(pool)
}
