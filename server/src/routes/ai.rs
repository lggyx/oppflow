use axum::{routing::post, Router};
use sqlx::SqlitePool;
use crate::handlers::ai::{generate_opportunity_summary, generate_identity_profile, generate_chat_summary, content_precheck};

pub fn routes(pool: SqlitePool) -> Router {
    Router::new()
        .route("/opportunity/summary", post(generate_opportunity_summary))
        .route("/identity/profile", post(generate_identity_profile))
        .route("/coffee-chat/summary", post(generate_chat_summary))
        .route("/content/pre-check", post(content_precheck))
        .with_state(pool)
}
