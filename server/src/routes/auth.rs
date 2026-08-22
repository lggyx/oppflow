use axum::{
    routing::post,
    Router,
};
use sqlx::SqlitePool;
use crate::handlers::auth::{register, login, refresh_token};

pub fn routes(pool: SqlitePool) -> Router {
    Router::new()
        .route("/register", post(register))
        .route("/login", post(login))
        .route("/refresh", post(refresh_token))
        .with_state(pool)
}
