use sqlx::SqlitePool;
use shared::entities::Opportunity;
use uuid::Uuid;
use crate::error::Result;

#[derive(Clone)]
pub struct OpportunityRepository {
    pool: SqlitePool,
}

impl OpportunityRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Opportunity>> {
        let opp = sqlx::query_as!(Opportunity, "SELECT * FROM opportunities WHERE id = ?", id.to_string())
            .fetch_optional(&self.pool)
            .await?;
        Ok(opp)
    }

    pub async fn find_published(&self, page: u32, page_size: u32) -> Result<Vec<Opportunity>> {
        let offset = ((page - 1) * page_size) as i32;
        let opps = sqlx::query_as!(
            Opportunity,
            r#"
            SELECT * FROM opportunities
            WHERE status IN ('published', 'open', 'active')
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            "#,
            page_size as i32,
            offset,
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(opps)
    }

    pub async fn create(&self, opp: &Opportunity) -> Result<()> {
        sqlx::query!(
            r#"
            INSERT INTO opportunities (id, publisher_id, title, opp_type, tags, status, visibility, summary, description, requirements, deliverables, compensation_type, compensation_range, compensation_currency, max_participants, application_method, screening_questions, timeline, trust_data, metrics, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            opp.id.to_string(),
            opp.publisher_id.to_string(),
            opp.title,
            opp.opp_type as i32,
            opp.tags,
            opp.status as i32,
            opp.visibility as i32,
            opp.summary,
            opp.description,
            opp.requirements,
            opp.deliverables,
            opp.compensation_type as i32,
            opp.compensation_range,
            opp.compensation_currency,
            opp.max_participants,
            opp.application_method as i32,
            opp.screening_questions,
            opp.timeline,
            opp.trust_data,
            opp.metrics,
            opp.created_at,
            opp.updated_at,
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn update_status(&self, id: Uuid, status: shared::entities::OpportunityStatus) -> Result<()> {
        sqlx::query!(
            "UPDATE opportunities SET status = ?, updated_at = ? WHERE id = ?",
            status as i32,
            chrono::Utc::now(),
            id.to_string(),
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }
}
