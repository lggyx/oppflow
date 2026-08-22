use axum::{extract::State, Json};
use reqwest::Client;
use shared::dto::*;
use sqlx::SqlitePool;
use crate::config::AppConfig;
use crate::error::{AppError, Result};

#[derive(Clone)]
pub struct AiService {
    client: Client,
    config: AppConfig,
}

impl AiService {
    pub fn new(config: AppConfig) -> Self {
        Self {
            client: Client::new(),
            config,
        }
    }

    pub async fn generate_opportunity_summary(&self, description: &str) -> Result<GenerateOpportunitySummaryResponse> {
        let prompt = format!(
            "Generate a concise summary (max 500 Chinese characters) and suggested tags for the following opportunity description:\n\n{}",
            description
        );

        let response = self.client
            .post(format!("{}/chat/completions", self.config.ai_api_base_url))
            .header("Authorization", format!("Bearer {}", self.config.ai_api_key))
            .json(&serde_json::json!({
                "model": self.config.ai_model,
                "messages": [
                    {"role": "system", "content": "You are an AI assistant that summarizes AI opportunity descriptions and suggests tags."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 500,
            }))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(AppError::AiService(format!("AI API error: {}", response.status())));
        }

        let result: serde_json::Value = response.json().await?;
        let content = result["choices"][0]["message"]["content"]
            .as_str()
            .ok_or_else(|| AppError::AiService("Invalid AI response".to_string()))?;

        // Parse summary and tags from AI response
        // Simplified: assume AI returns JSON with summary and tags
        Ok(GenerateOpportunitySummaryResponse {
            summary: content.to_string(),
            suggested_tags: vec![],
        })
    }

    pub async fn generate_identity_profile(&self, platforms_data: &str) -> Result<serde_json::Value> {
        // TODO: Generate capability profile from platform data
        Ok(serde_json::json!({"technical_depth": "", "collaboration_style": ""}))
    }

    pub async fn generate_chat_summary(&self, transcript: &str) -> Result<GenerateChatSummaryResponse> {
        let prompt = format!(
            "Summarize the following conversation in Chinese, extracting key topics, decisions, and action items:\n\n{}",
            transcript
        );

        // Similar to generate_opportunity_summary
        Ok(GenerateChatSummaryResponse {
            summary: "".to_string(),
            topics: vec![],
            key_decisions: vec![],
        })
    }

    pub async fn content_precheck(&self, content: &str) -> Result<Vec<String>> {
        // TODO: AI-powered content risk check
        Ok(vec![])
    }
}

// Handler functions
pub async fn generate_opportunity_summary(
    State(pool): State<SqlitePool>,
    State(ai_service): State<std::sync::Arc<AiService>>,
    Json(req): Json<GenerateOpportunitySummaryRequest>,
) -> Result<Json<ApiResponse<GenerateOpportunitySummaryResponse>>> {
    let opportunity = sqlx::query_as!(shared::entities::Opportunity, "SELECT * FROM opportunities WHERE id = ?", req.opportunity_id)
        .fetch_optional(&pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Opportunity not found".to_string()))?;

    let result = ai_service.generate_opportunity_summary(&opportunity.description).await?;

    Ok(Json(ApiResponse::success(result)))
}

pub async fn generate_identity_profile(
    State(_pool): State<SqlitePool>,
    State(ai_service): State<std::sync::Arc<AiService>>,
    Json(_req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<serde_json::Value>>> {
    // TODO: Fetch platform data and generate profile
    let profile = ai_service.generate_identity_profile("{}").await?;
    Ok(Json(ApiResponse::success(profile)))
}

pub async fn generate_chat_summary(
    State(_pool): State<SqlitePool>,
    State(ai_service): State<std::sync::Arc<AiService>>,
    Json(req): Json<GenerateChatSummaryRequest>,
) -> Result<Json<ApiResponse<GenerateChatSummaryResponse>>> {
    let transcript = req.transcript.unwrap_or_default();
    let result = ai_service.generate_chat_summary(&transcript).await?;
    Ok(Json(ApiResponse::success(result)))
}

pub async fn content_precheck(
    State(_pool): State<SqlitePool>,
    State(ai_service): State<std::sync::Arc<AiService>>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<Vec<String>>>> {
    let content = req.get("content").and_then(|v| v.as_str()).unwrap_or("");
    let risks = ai_service.content_precheck(content).await?;
    Ok(Json(ApiResponse::success(risks)))
}
