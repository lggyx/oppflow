use reqwest::Client;
use serde_json::Value;
use std::sync::Arc;
use crate::config::AppConfig;

#[derive(Clone)]
pub struct AiService {
    client: Client,
    config: Arc<AppConfig>,
}

impl AiService {
    pub fn new(config: Arc<AppConfig>) -> Self {
        Self {
            client: Client::new(),
            config,
        }
    }

    pub async fn generate_summary(&self, content: &str, max_length: usize) -> Result<String, AiError> {
        let prompt = format!(
            "Summarize the following content in Chinese, maximum {} characters:\n\n{}",
            max_length, content
        );

        let response = self
            .client
            .post(format!("{}/chat/completions", self.config.ai_api_base_url))
            .header("Authorization", format!("Bearer {}", self.config.ai_api_key))
            .json(&serde_json::json!({
                "model": self.config.ai_model,
                "messages": [
                    {"role": "system", "content": "You are a helpful assistant that summarizes content concisely."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "max_tokens": max_length,
            }))
            .send()
            .await
            .map_err(|e| AiError::RequestError(e.to_string()))?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(AiError::ApiError(status, text));
        }

        let result: Value = response
            .json()
            .await
            .map_err(|e| AiError::ParseError(e.to_string()))?;

        let content = result["choices"][0]["message"]["content"]
            .as_str()
            .ok_or_else(|| AiError::InvalidResponse("Missing content in response".to_string()))?;

        Ok(content.to_string())
    }

    pub async fn generate_opportunity_summary(&self, description: &str) -> Result<(String, Vec<String>), AiError> {
        let summary = self.generate_summary(description, 500).await?;
        // TODO: Extract tags from summary
        Ok((summary, vec![]))
    }

    pub async fn generate_chat_summary(&self, transcript: &str) -> Result<(String, Vec<String>, Vec<String>), AiError> {
        let prompt = format!(
            "Summarize this conversation in Chinese. Extract key topics and decisions.\n\n{}",
            transcript
        );
        let response = self
            .client
            .post(format!("{}/chat/completions", self.config.ai_api_base_url))
            .header("Authorization", format!("Bearer {}", self.config.ai_api_key))
            .json(&serde_json::json!({
                "model": self.config.ai_model,
                "messages": [
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": prompt}
                ],
            }))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(AiError::ApiError(response.status(), "".to_string()));
        }

        let result: Value = response.json().await?;
        let content = result["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();

        // Simplified: parse topics and decisions from content
        Ok((content, vec![], vec![]))
    }

    pub async fn content_precheck(&self, content: &str) -> Result<Vec<String>, AiError> {
        let prompt = format!(
            "Analyze the following content for potential risks (spam, inappropriate, misleading, etc.). Return a list of risk tags or empty list if safe:\n\n{}",
            content
        );

        let response = self
            .client
            .post(format!("{}/chat/completions", self.config.ai_api_base_url))
            .header("Authorization", format!("Bearer {}", self.config.ai_api_key))
            .json(&serde_json::json!({
                "model": self.config.ai_model,
                "messages": [
                    {"role": "system", "content": "You are a content safety analyzer."},
                    {"role": "user", "content": prompt}
                ],
            }))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(AiError::ApiError(response.status(), "".to_string()));
        }

        let result: Value = response.json().await?;
        let content = result["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("");

        // Simplified: split by newline
        let risks: Vec<String> = content.lines().map(|s| s.trim().to_string()).collect();
        Ok(risks)
    }
}

#[derive(Debug, thiserror::Error)]
pub enum AiError {
    #[error("Request error: {0}")]
    RequestError(String),
    #[error("API error: {0}")]
    ApiError(reqwest::StatusCode, String),
    #[error("Parse error: {0}")]
    ParseError(String),
    #[error("Invalid response: {0}")]
    InvalidResponse(String),
}
