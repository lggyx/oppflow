use axum::Router;
use sqlx::SqlitePool;
use crate::routes::{auth, opportunity, identity, collaboration, trust, growth, governance, ai};

pub fn api_router(pool: SqlitePool) -> Router {
    Router::new()
        .nest("/api/v1/auth", auth::routes(pool.clone()))
        .nest("/api/v1/opportunities", opportunity::routes(pool.clone()))
        .nest("/api/v1/identity", identity::routes(pool.clone()))
        .nest("/api/v1/collaboration", collaboration::routes(pool.clone()))
        .nest("/api/v1/trust", trust::routes(pool.clone()))
        .nest("/api/v1/growth", growth::routes(pool.clone()))
        .nest("/api/v1/governance", governance::routes(pool.clone()))
        .nest("/api/v1/ai", ai::routes(pool))
}
