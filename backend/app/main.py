"""FastAPI 应用入口：路由装配、CORS、启动建表与种子、静态托管。"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app import errors
from app.api import admin, auth, coffee, forum, identity, meta, notifications, opportunities, share
from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.services.ai import gateway

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("oppflow")


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        gateway.seed_channels_from_env(db)
    finally:
        db.close()
    settings = get_settings()
    if settings.scheduler_enabled:
        from app.services import scheduler

        scheduler.start_scheduler()
    yield
    if settings.scheduler_enabled:
        from app.services import scheduler

        scheduler.shutdown_scheduler()


def create_app() -> FastAPI:
    app = FastAPI(title="oppflow", version="0.1.0", lifespan=lifespan)
    settings = get_settings()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    errors.register_error_handlers(app)

    app.include_router(auth.router, prefix="/api")
    app.include_router(identity.router, prefix="/api")
    app.include_router(opportunities.router, prefix="/api")
    app.include_router(notifications.router, prefix="/api")
    app.include_router(coffee.router, prefix="/api")
    app.include_router(forum.router, prefix="/api")
    app.include_router(admin.router, prefix="/api")
    app.include_router(meta.router, prefix="/api")
    app.include_router(share.router)  # /u/{handle} 公开分享页

    _mount_frontend(app, settings.frontend_dist_dir)
    return app


def _mount_frontend(app: FastAPI, dist_dir: str) -> None:
    """生产模式托管前端构建产物；/api、/u 之外的未知路径回退 index.html（SPA）。"""
    if not dist_dir:
        return
    dist = Path(dist_dir)
    if not (dist / "index.html").exists():
        logger.warning("前端构建目录不存在：%s，跳过静态托管", dist)
        return
    app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{spa_path:path}", include_in_schema=False)
    async def spa_fallback(spa_path: str):
        if spa_path.startswith(("api/", "u/")):
            return JSONResponse(
                status_code=404, content={"code": "not_found", "message": "资源不存在"}
            )
        candidate = dist / spa_path
        if spa_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(dist / "index.html")


app = create_app()
