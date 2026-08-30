# ===== 前端构建 =====
FROM oven/bun:1 AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/bun.lock frontend/bunfig.toml ./
RUN bun install --frozen-lockfile
COPY frontend/ ./
RUN bun run build

# ===== 后端运行镜像 =====
FROM python:3.12-slim
WORKDIR /app

# 安装 uv 并同步后端依赖（锁文件保证可复现）
COPY backend/pyproject.toml backend/uv.lock backend/.python-version ./
RUN pip install --no-cache-dir uv && uv sync --frozen --no-dev --no-install-project

COPY backend/app ./app
COPY --from=frontend /app/frontend/dist ./frontend/dist

ENV FRONTEND_DIST_DIR=/app/frontend/dist
EXPOSE 8000

# SQLite 数据库放 /app/data（compose 挂载卷）
CMD ["/app/.venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
