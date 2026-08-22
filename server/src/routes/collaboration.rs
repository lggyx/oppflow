use axum::{routing::{post, get}, Router};
use sqlx::SqlitePool;
use crate::handlers::collaboration::{
    create_coffee_chat, accept_coffee_chat, submit_chat_summary, submit_feedback,
    list_forum_posts, create_forum_post, create_reply,
};

pub fn routes(pool: SqlitePool) -> Router {
    Router::new()
        .route("/coffee-chat", post(create_coffee_chat))
        .route("/coffee-chat/:id/accept", post(accept_coffee_chat))
        .route("/coffee-chat/:id/summary", post(submit_chat_summary))
        .route("/coffee-chat/:id/feedback", post(submit_feedback))
        .route("/forum/posts", get(list_forum_posts).post(create_forum_post))
        .route("/forum/posts/:id/replies", post(create_reply))
        .with_state(pool)
}
