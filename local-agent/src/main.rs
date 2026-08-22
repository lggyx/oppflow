use clap::Parser;
use serde::Serialize;
use sha2::{Sha256, Digest};
use std::fs;

#[derive(Parser, Debug)]
#[command(name = "local-agent")]
#[command(about = "AI Opportunity Platform - Local Identity Agent", long_about = None)]
struct Args {
    /// Platform to fetch data from (github, csdn, bilibili)
    #[arg(short, long)]
    platform: Option<String>,

    /// Username on the platform
    #[arg(short, long)]
    username: Option<String>,

    /// API token for authenticated requests
    #[arg(short, long)]
    token: Option<String>,

    /// JSON config file with multiple platforms
    #[arg(short, long)]
    config: Option<String>,

    /// User bio
    #[arg(short, long)]
    bio: Option<String>,

    /// Comma-separated skills
    #[arg(short, long)]
    skills: Option<String>,

    /// Output JSON file path
    #[arg(short, long, default_value = "identity_card.json")]
    output: String,
}

#[derive(Serialize)]
struct DigitalIdentityCard {
    protocol_version: &'static str,
    generated_at: String,
    generated_by: String,
    subject: Subject,
    platforms: Vec<PlatformData>,
    capability_profile: serde_json::Value,
    platform_growth: PlatformGrowth,
    signature: String,
    checksum: String,
}

#[derive(Serialize)]
struct Subject {
    display_name: String,
    bio: String,
    avatar_url: Option<String>,
    primary_skills: Vec<String>,
    skill_evidence: Vec<SkillEvidence>,
}

#[derive(Serialize)]
struct SkillEvidence {
    skill: String,
    evidence_url: String,
    evidence_type: String,
}

#[derive(Serialize)]
struct PlatformData {
    platform: String,
    url: String,
    verified: bool,
    verification_method: String,
    data_summary: serde_json::Value,
}

#[derive(Serialize)]
struct PlatformGrowth {
    current_tier: &'static str,
    evidence_chain: Vec<serde_json::Value>,
    domain_tags: Vec<String>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::init();

    let args = Args::parse();

    let agent_name = "ai-identity-agent";
    let version = "0.1.0";

    let subject = Subject {
        display_name: args.username.unwrap_or_else(|| "User".to_string()),
        bio: args.bio.unwrap_or_default(),
        avatar_url: None,
        primary_skills: args.skills
            .unwrap_or_default()
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect(),
        skill_evidence: vec![],
    };

    let mut platforms = Vec::new();

    if let Some(ref config_path) = args.config {
        let content = fs::read_to_string(config_path)?;
        let config: serde_json::Value = serde_json::from_str(&content)?;
        if let Some(arr) = config.get("platforms").and_then(|v| v.as_array()) {
            for platform in arr {
                platforms.push(PlatformData {
                    platform: platform["platform"].as_str().unwrap_or("other").to_string(),
                    url: platform["url"].as_str().unwrap_or("").to_string(),
                    verified: platform["verified"].as_bool().unwrap_or(false),
                    verification_method: platform["verification_method"].as_str().unwrap_or("manual").to_string(),
                    data_summary: platform["data_summary"].clone().unwrap_or(serde_json::json!({})),
                });
            }
        }
    } else if let (Some(platform), Some(username)) = (&args.platform, &args.username) {
        let platform_data = match platform.as_str() {
            "github" => fetch_github(username, args.token.as_deref()).await?,
            _ => PlatformData {
                platform: platform.clone(),
                url: format!("https://{}.com/{}", platform, username),
                verified: false,
                verification_method: "manual".to_string(),
                data_summary: serde_json::json!({}),
            },
        };
        platforms.push(platform_data);
    }

    let capability_profile = serde_json::json!({
        "technical_depth": "",
        "collaboration_style": "",
        "communication_evidence": []
    });

    let platform_growth = PlatformGrowth {
        current_tier: "Visitor",
        evidence_chain: vec![],
        domain_tags: vec![],
    };

    // Build card
    let mut card = DigitalIdentityCard {
        protocol_version: "0.1",
        generated_at: chrono::Utc::now().to_rfc3339(),
        generated_by: format!("{}/{}", agent_name, version),
        subject,
        platforms,
        capability_profile,
        platform_growth,
        signature: "placeholder".to_string(),
        checksum: String::new(),
    };

    // Calculate checksum
    let json_str = serde_json::to_string(&card)?;
    let mut hasher = Sha256::new();
    hasher.update(json_str.as_bytes());
    card.checksum = format!("{:x}", hasher.finalize());

    // Save
    fs::write(&args.output, serde_json::to_string_pretty(&card)?)?;
    println!("Card saved to {}", args.output);
    println!("Checksum: {}", &card.checksum[..32]);

    Ok(())
}

async fn fetch_github(username: &str, _token: Option<&str>) -> anyhow::Result<PlatformData> {
    let client = reqwest::Client::new();
    let url = format!("https://api.github.com/users/{}", username);

    let resp = client.get(&url).send().await?;
    let user: serde_json::Value = resp.json().await?;

    let repos_url = user["repos_url"].as_str().unwrap_or("");
    let repos_resp = client.get(repos_url).send().await?;
    let repos: Vec<serde_json::Value> = repos_resp.json().await?;

    let total_stars: i32 = repos.iter().map(|r| r["stargazers_count"].as_i32().unwrap_or(0)).sum();
    let languages: std::collections::HashMap<&str, i32> = repos.iter().filter_map(|r| {
        r.get("language").and_then(|v| v.as_str()).map(|l| (l, 1))
    }).fold(std::collections::HashMap::new(), |mut acc, (lang, count)| {
        *acc.entry(lang).or_insert(0) += count;
        acc
    });

    let mut top_languages: Vec<_> = languages.into_iter().collect();
    top_languages.sort_by(|a, b| b.1.cmp(&a.1));
    let top_languages: Vec<&str> = top_languages.into_iter().take(5).map(|(lang, _)| lang).collect();

    Ok(PlatformData {
        platform: "github".to_string(),
        url: format!("https://github.com/{}", username),
        verified: false,
        verification_method: "manual".to_string(),
        data_summary: serde_json::json!({
            "repos_count": repos.len(),
            "stars_count": total_stars,
            "top_languages": top_languages,
            "recent_activity": format!("{} repositories", repos.len()),
        }),
    })
}
