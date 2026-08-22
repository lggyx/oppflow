use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillEvidence {
    pub skill: String,
    pub evidence_url: String,
    pub evidence_type: String, // "repo", "article", "project"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub total: u64,
    pub page: u32,
    pub page_size: u32,
    pub total_pages: u32,
}

impl<T> PaginatedResponse<T> {
    pub fn new(items: Vec<T>, total: u64, page: u32, page_size: u32) -> Self {
        let total_pages = ((total as f64) / (page_size as f64)).ceil() as u32;
        Self {
            items,
            total,
            page,
            page_size,
            total_pages,
        }
    }
}

pub fn json_array_to_vec(json_str: &str) -> Vec<String> {
    serde_json::from_str(json_str).unwrap_or_default()
}

pub fn json_to_map(json_str: &str) -> HashMap<String, serde_json::Value> {
    serde_json::from_str(json_str).unwrap_or_default()
}

#[macro_export]
macro_rules! into_response {
    ($result:expr) => {
        match $result {
            Ok(data) => ($crate::dto::ApiResponse::success(data)).into_response(),
            Err(e) => e.into_response(),
        }
    };
}
