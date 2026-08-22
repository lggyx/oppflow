use serde::Deserialize;
use std::env;

#[derive(Debug, Clone, Deserialize)]
pub struct AppConfig {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub jwt_secret: String,
    pub jwt_access_token_expiry: u64,
    pub jwt_refresh_token_expiry: u64,
    pub ai_api_base_url: String,
    pub ai_api_key: String,
    pub ai_model: String,
    pub upload_dir: String,
}

impl AppConfig {
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Self {
            host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: env::var("PORT").unwrap_or_else(|_| "3000".to_string()).parse()?,
            database_url: env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite:data/app.db".to_string()),
            jwt_secret: env::var("JWT_SECRET").expect("JWT_SECRET must be set"),
            jwt_access_token_expiry: env::var("JWT_ACCESS_TOKEN_EXPIRY")
                .unwrap_or_else(|_| "7200".to_string())
                .parse()?,
            jwt_refresh_token_expiry: env::var("JWT_REFRESH_TOKEN_EXPIRY")
                .unwrap_or_else(|_| "604800".to_string())
                .parse()?,
            ai_api_base_url: env::var("AI_API_BASE_URL")
                .unwrap_or_else(|_| "https://api.openai.com/v1".to_string()),
            ai_api_key: env::var("AI_API_KEY").expect("AI_API_KEY must be set"),
            ai_model: env::var("AI_MODEL").unwrap_or_else(|_| "gpt-4o-mini".to_string()),
            upload_dir: env::var("UPLOAD_DIR").unwrap_or_else(|_| "./uploads".to_string()),
        })
    }
}
