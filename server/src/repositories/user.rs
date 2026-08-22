use sqlx::SqlitePool;
use shared::entities::User;
use uuid::Uuid;
use crate::error::Result;

#[derive(Clone)]
pub struct UserRepository {
    pool: SqlitePool,
}

impl UserRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<User>> {
        let user = sqlx::query_as!(User, "SELECT * FROM users WHERE id = ?", id.to_string())
            .fetch_optional(&self.pool)
            .await?;
        Ok(user)
    }

    pub async fn find_by_email(&self, email: &str) -> Result<Option<User>> {
        let user = sqlx::query_as!(User, "SELECT * FROM users WHERE email = ?", email)
            .fetch_optional(&self.pool)
            .await?;
        Ok(user)
    }

    pub async fn create(&self, user: &User) -> Result<()> {
        sqlx::query!(
            r#"
            INSERT INTO users (id, email, password_hash, display_name, current_tier, role, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            user.id.to_string(),
            user.email,
            user.password_hash,
            user.display_name,
            user.current_tier as i32,
            user.role as i32,
            user.status as i32,
            user.created_at,
            user.updated_at,
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn update(&self, user: &User) -> Result<()> {
        sqlx::query!(
            r#"
            UPDATE users SET display_name = ?, avatar_url = ?, current_tier = ?, updated_at = ?
            WHERE id = ?
            "#,
            user.display_name,
            user.avatar_url,
            user.current_tier as i32,
            user.updated_at,
            user.id.to_string(),
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }
}
