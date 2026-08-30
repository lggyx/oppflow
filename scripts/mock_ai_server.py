"""极简 OpenAI 兼容 mock 服务：/v1/chat/completions 返回与场景匹配的固定内容。
仅用于本地/浏览器验证 AI 全链路（计量落库走真实路径），不含任何真实调用。
"""

import json
from http.server import BaseHTTPRequestHandler, HTTPServer


def fake_reply(messages):
    user = ""
    for m in messages:
        if m.get("role") == "user":
            user = m.get("content", "")
    if "能力画像" in user or "数字名片" in user:
        return "画像：全栈开发者，擅长 Python 后端与 AI 应用工程化，近期在做 RAG 与 Agent 项目。\n标签：Python、FastAPI、RAG、AI 应用、后端"
    if "500 字" in user or "机会" in user:
        return "一句话定位：这是一个面向 AI 开发者的 RAG 知识库组队项目。\n做什么：搭建可私有化部署的知识库，包含文档解析、向量检索与问答编排。\n适合谁：有 Python 基础、想完整跑通 LLM 应用链路的开发者；前端同学也有发挥空间。\n需要什么：每周可投入 6 小时以上，熟悉 Git 协作。\n参与方式：点击报名并留下你的技术栈与可投入时间。"
    if "议程" in user or "Coffee" in user:
        return "- 各自介绍最近在做的项目\n- 聊聊 RAG 检索效果优化的实践\n- 讨论可能的合作方式\n- 交换各自的资源与需求\n- 约定后续跟进方式"
    if "纪要" in user or "摘要" in user:
        return "要点：\n- 双方都在做 RAG 相关项目\n- 检索质量是共同痛点\n下一步：\n- 交换评测数据集\n- 两周后再约一次跟进"
    if "论坛" in user or "讨论串" in user:
        return "讨论围绕向量库选型展开：多数观点倾向 FAISS 起步、数据量大再迁移 Milvus；结论是先满足需求再优化。"
    return "这是来自 mock AI 的回复。"


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length) or b"{}")
        content = fake_reply(body.get("messages", []))
        resp = {
            "id": "mock-1",
            "object": "chat.completion",
            "choices": [{"index": 0, "message": {"role": "assistant", "content": content}, "finish_reason": "stop"}],
            "usage": {"prompt_tokens": 120, "completion_tokens": 90, "total_tokens": 210},
        }
        data = json.dumps(resp, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 8902), Handler).serve_forever()
