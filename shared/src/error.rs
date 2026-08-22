use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;
use crate::dto::ApiResponse;

pub type Result<T, E = AppError> = std::result::Result<T, E>;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Unauthorized: {0}")]
    Unauthorized(String),

    #[error("Forbidden: {0}")]
    Forbidden(String),

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Conflict: {0}")]
    Conflict(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("AI service error: {0}")]
    AiService(String),
}

impl AppError {
    pub fn status_code(&self) -> StatusCode {
        match self {
            AppError::Database(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::NotFound(_) => StatusCode::NOT_FOUND,
            AppError::Unauthorized(_) => StatusCode::UNAUTHORIZED,
            AppError::Forbidden(_) => StatusCode::FORBIDDEN,
            AppError::BadRequest(_) => StatusCode::BAD_REQUEST,
            AppError::Conflict(_) => StatusCode::CONFLICT,
            AppError::Validation(_) => StatusCode::UNPROCESSABLE_ENTITY,
            AppError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::AiService(_) => StatusCode::BAD_GATEWAY,
        }
    }

    pub fn error_code(&self) -> i32 {
        match self {
            AppError::Database(_) => 50001,
            AppError::NotFound(_) => 40401,
            AppError::Unauthorized(_) => 40101,
            AppError::Forbidden(_) => 40301,
            AppError::BadRequest(_) => 40001,
            AppError::Conflict(_) => 40901,
            AppError::Validation(_) => 42201,
            AppError::Internal(_) => 50001,
            AppError::AiService(_) => 50301,
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = self.status_code();
        let code = self.error_code();
        let message = self.to_string();

        let body = Json(json!({
            "code": code,
            "message": message,
            "errors": null::<Vec<String>>()
        }));

        (status, body).into_response()
    }
}
