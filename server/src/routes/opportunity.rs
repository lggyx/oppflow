use axum::{
    routing::{get, post, put},
    Router,
};
use sqlx::SqlitePool;
use crate::handlers::opportunity::{
    create_opportunity, list_opportunities, get_opportunity, update_opportunity_status,
    apply_opportunity, archive_opportunity,
};

pub fn routes(pool: SqlitePool) -> Router {
    Router::new()
        .route("/", post(create_opportunity).get(list_opportunities))
        .route("/:id", get(get_opportunity))
        .route("/:id/apply", post(apply_opportunity))
        .route("/:id/status", put(update_opportunity_status))
        .route("/:id/archive", post(archive_opportunity))
        .with_state(pool)
}
