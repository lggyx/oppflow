use axum::{
    extract::State,
    Json,
};
use chrono::{Duration, Utc};
use serde_json::json;
use shared::dto::*;
use sqlx::SqlitePool;
use crate::error::{AppError, Result};

pub async fn register(
    State(pool): State<SqlitePool>,
    Json(req): Json<RegisterRequest>,
) -> Result<Json<ApiResponse<LoginResponse>>> {
    // Validate
    req.validate()?;

    // Check if email exists
    let existing = sqlx::query!("SELECT id FROM users WHERE email = ?", req.email)
        .fetch_optional(&pool)
        .await?;

    if existing.is_some() {
        return Err(AppError::Conflict("Email already registered".to_string()));
    }

    // Hash password
    let password_hash = bcrypt::hash(&req.password, bcrypt::DEFAULT_COST)?;

    // Create user
    let user_id = uuid::Uuid::new_v4();
    sqlx::query!(
        r#"
        INSERT INTO users (id, email, password_hash, display_name, current_tier, role, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        user_id,
        req.email,
        password_hash,
        req.display_name,
        UserTier::Participant as i32,
        UserRole::User as i32,
        UserStatus::Active as i32,
        Utc::now(),
        Utc::now(),
    )
    .execute(&pool)
    .await?;

    // Generate tokens
    let access_token = generate_jwt(user_id, req.email.clone(), "user".to_string(), "participant".to_string())?;
    let refresh_token = generate_refresh_token(user_id)?;

    Ok(Json(ApiResponse::success(LoginResponse {
        access_token,
        refresh_token,
        user_id,
        display_name: req.display_name,
        role: UserRole::User,
        tier: UserTier::Participant,
    })))
}

pub async fn login(
    State(pool): State<SqlitePool>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<ApiResponse<LoginResponse>>> {
    req.validate()?;

    let user = sqlx::query_as!(
        User,
        r#"SELECT * FROM users WHERE email = ? AND status = 'active'"#,
        req.email
    )
    .fetch_optional(&pool)
    .await?;

    let user = user.ok_or_else(|| AppError::Unauthorized("Invalid email or password".to_string()))?;

    // Verify password
    let valid = bcrypt::verify(&req.password, &user.password_hash)?;
    if !valid {
        return Err(AppError::Unauthorized("Invalid email or password".to_string()));
    }

    let access_token = generate_jwt(user.id, user.email.clone(), format!("{:?}", user.role).to_lowercase(), format!("{:?}", user.current_tier).to_lowercase())?;
    let refresh_token = generate_refresh_token(user.id)?;

    Ok(Json(ApiResponse::success(LoginResponse {
        access_token,
        refresh_token,
        user_id: user.id,
        display_name: user.display_name,
        role: user.role,
        tier: user.current_tier,
    })))
}

pub async fn refresh_token(
    Json(_req): Json<RefreshTokenRequest>,
) -> Result<Json<ApiResponse<LoginResponse>>> {
    // TODO: Validate refresh token and issue new access token
    Err(AppError::BadRequest("Not implemented".to_string()))
}

// JWT helpers
fn generate_jwt(user_id: uuid::Uuid, email: String, role: String, tier: String) -> Result<String> {
    use jsonwebtoken::{encode, Header, EncodingKey};
    use shared::dto::LoginResponse;

    #[derive(Serialize)]
    struct Claims {
        sub: String,
        email: String,
        role: String,
        tier: String,
        exp: i64,
    }

    let expiration = Utc::now() + Duration::seconds(7200);
    let claims = Claims {
        sub: user_id.to_string(),
        email,
        role,
        tier,
        exp: expiration.timestamp(),
    };

    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "secret".to_string());
    Ok(encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_ref()))?)
}

fn generate_refresh_token(_user_id: uuid::Uuid) -> Result<String> {
    Ok(uuid::Uuid::new_v4().to_string())
}
