use axum::{routing::{get, post}, Router};
use sqlx::SqlitePool;
use crate::handlers::growth::{get_my_status, get_my_progress, apply_expert};

pub fn routes(pool: SqlitePool) -> Router {
    Router::new()
        .route("/me/status", get(get_my_status))
        .route("/me/progress", get(get_my_progress))
        .route("/expert/apply", post(apply_expert))
        .with_state(pool)
}
