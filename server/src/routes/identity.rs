use axum::{routing::{get, post, put}, Router};
use sqlx::SqlitePool;
use crate::handlers::identity::{import_identity, get_my_identity, update_identity, add_platform_link, verify_platform, get_identity_by_id};

pub fn routes(pool: SqlitePool) -> Router {
    Router::new()
        .route("/import", post(import_identity))
        .route("/me", get(get_my_identity).put(update_identity))
        .route("/me/platforms", post(add_platform_link))
        .route("/me/platforms/:id/verify", post(verify_platform))
        .route("/:id", get(get_identity_by_id))
        .with_state(pool)
}
