use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};

#[derive(Debug, Clone, Copy)]
pub enum Permission {
    OpportunityCreate,
    OpportunityUpdateStatus,
    OpportunityReview,
    IdentityManage,
    CollaborationCreate,
    GovernanceReview,
    AdminAccess,
}

impl Permission {
    pub fn as_str(&self) -> &'static str {
        match self {
            Permission::OpportunityCreate => "opportunity:create",
            Permission::OpportunityUpdateStatus => "opportunity:update_status",
            Permission::OpportunityReview => "opportunity:review",
            Permission::IdentityManage => "identity:manage",
            Permission::CollaborationCreate => "collaboration:create",
            Permission::GovernanceReview => "governance:review",
            Permission::AdminAccess => "admin:access",
        }
    }
}

pub async fn require_permission(
    required: Permission,
) -> impl axum::middleware::Next<axum::body::Body> {
    move |req: axum::http::Request<axum::body::Body>, next: axum::middleware::Next<axum::body::Body>| async move {
        let claims = req.extensions().get::<Claims>();
        
        if claims.is_none() {
            return Response::builder()
                .status(StatusCode::UNAUTHORIZED)
                .body(axum::body::Body::from("Unauthorized"))
                .unwrap();
        }

        let claims = claims.unwrap();
        let user_role = std::str::from_utf8(&claims.role.as_bytes()).unwrap_or("user");

        // Simple role-based check (MVP simplified)
        let has_permission = match required {
            Permission::OpportunityCreate => matches!(user_role, "user" | "moderator" | "admin"),
            Permission::OpportunityUpdateStatus => matches!(user_role, "moderator" | "admin"),
            Permission::OpportunityReview => matches!(user_role, "moderator" | "admin"),
            Permission::IdentityManage => matches!(user_role, "user" | "moderator" | "admin"),
            Permission::CollaborationCreate => matches!(user_role, "user" | "moderator" | "admin"),
            Permission::GovernanceReview => matches!(user_role, "moderator" | "admin"),
            Permission::AdminAccess => matches!(user_role, "admin"),
        };

        if !has_permission {
            return Response::builder()
                .status(StatusCode::FORBIDDEN)
                .body(axum::body::Body::from("Forbidden"))
                .unwrap();
        }

        next.run(req).await
    }
}
