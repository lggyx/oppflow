use axum::{routing::{get, post}, Router};
use sqlx::SqlitePool;
use crate::handlers::governance::{
    get_review_queue, review_content, process_challenge, arbitrate,
};

pub fn routes(pool: SqlitePool) -> Router {
    Router::new()
        .route("/admin/review-queue", get(get_review_queue))
        .route("/admin/review/:id", post(review_content))
        .route("/admin/challenge/:id", post(process_challenge))
        .route("/admin/arbitration", post(arbitrate))
        .with_state(pool)
}
