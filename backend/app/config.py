"""应用配置：所有凭据与开关只从环境变量 / .env 读取。"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # 安全
    secret_key: str = "dev-secret-change-me"
    access_token_minutes: int = 60 * 24
    refresh_token_days: int = 30

    # 业务开关（冷启动 / 审核流）
    invite_required: bool = True
    review_required: bool = True

    # 基础设施
    database_url: str = "sqlite:///./data/oppflow.db"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    app_public_base_url: str = "http://localhost:5173"
    frontend_dist_dir: str = ""  # 生产环境指向前端构建产物；为空则不托管静态资源

    # GitHub OAuth（未配置时相关端点返回 501）
    github_client_id: str = ""
    github_client_secret: str = ""
    github_redirect_uri: str = ""

    # AI 渠道种子：JSON 数组 [{name, base_url, api_key, model, priority}]，启动时写入缺失渠道
    ai_channels_json: str = ""

    # 引导管理员：这些邮箱注册即管理员；首位注册用户恒为管理员
    admin_emails: str = ""

    # 后台任务
    scheduler_enabled: bool = True

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def admin_email_list(self) -> list[str]:
        return [e.strip().lower() for e in self.admin_emails.split(",") if e.strip()]

    @property
    def github_configured(self) -> bool:
        return bool(self.github_client_id and self.github_client_secret)


@lru_cache
def get_settings() -> Settings:
    return Settings()
