mod config;
mod error;
mod middleware;
mod routes;
mod handlers;
mod services;
mod repositories;
mod models;

use anyhow::Result;
use axum::Router;
use config::AppConfig;
use routes::api_router;
use sqlx::sqlite::SqlitePool;
use std::net::SocketAddr;
use tracing::{info, error};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> Result<()> {
    // Load environment variables
    dotenvy::dotenv().ok();

    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load config
    let config = AppConfig::from_env()?;
    info!("Configuration loaded: {:?}", config);

    // Initialize database
    let pool = SqlitePool::connect(&config.database_url).await?;
    info!("Database connected: {}", config.database_url);

    // Run migrations
    sqlx::migrate!("./migrations").run(&pool).await?;
    info!("Migrations completed");

    // Build router
    let app = Router::new()
        .merge(api_router(pool.clone()))
        .layer(tower_http::cors::CorsLayer::permissive())
        .layer(tower_http::trace::TraceLayer::new_for_http());

    // Start server
    let addr = SocketAddr::new(config.host.parse()?, config.port);
    info!("Server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app.into_make_service()).await?;

    Ok(())
}
