"""
FastAPI 后端服务 —— 健身陪练型长时记忆智能体

提供 REST API 接口，对接前端交互。
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sympy import true

from src.agent.companion_agent import CompanionAgent
from src.config import RETRIEVAL_TOP_K
from src.memory.long_term import LongTermMemory

# ---------------------------------------------------------------------------
# FastAPI 应用
# ---------------------------------------------------------------------------
app = FastAPI(title="Fitness Companion Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# 全局实例
# ---------------------------------------------------------------------------
long_term = LongTermMemory()
companion = CompanionAgent(long_term=long_term, use_llm=True)
sessions: dict[str, dict] = {}  # session_id -> {user_id, created_at, ...}


# ---------------------------------------------------------------------------
# 请求/响应模型
# ---------------------------------------------------------------------------
class ChatRequest(BaseModel):
    user_id: str = Field(..., description="用户ID")
    session_id: str = Field(default_factory=lambda: f"s_{uuid.uuid4().hex[:8]}")
    message: str = Field(..., description="用户消息")
    timestamp: Optional[str] = Field(default=None, description="消息时间戳")
    use_memory: bool = Field(default=True, description="是否启用长时记忆")
    top_k: int = Field(default=RETRIEVAL_TOP_K, ge=1, le=20)


class ChatResponse(BaseModel):
    reply: str
    profile_snapshot: dict
    used_memories: list[dict]
    tokens: dict


class ProfileUpdate(BaseModel):
    profile: dict = Field(..., description="要更新的 profile 键值对")


class SessionCreate(BaseModel):
    user_id: str = Field(...)


# ---------------------------------------------------------------------------
# API 端点
# ---------------------------------------------------------------------------

@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> dict:
    timestamp = req.timestamp or datetime.now(timezone.utc).isoformat()

    # 确认为会话创建记录
    session_id = req.session_id
    if session_id not in sessions:
        sessions[session_id] = {
            "user_id": req.user_id,
            "created_at": timestamp,
        }

    profile = long_term.get_profile(req.user_id) if req.use_memory else {}
    memories = long_term.retrieve(req.user_id, req.message, top_k=req.top_k) if req.use_memory else []

    reply = companion.handle_message(
        req.user_id,
        req.message,
        timestamp,
        use_memory=req.use_memory,
    )

    # 重新获取更新后的 profile
    updated_profile = long_term.get_profile(req.user_id) if req.use_memory else {}

    return {
        "reply": reply,
        "profile_snapshot": updated_profile,
        "used_memories": [
            {"id": f"m_{i}", "score": round(m.score, 3), "text": m.text}
            for i, m in enumerate(memories)
        ],
        "tokens": {"prompt": len(req.message), "completion": len(reply)},
    }


@app.get("/api/users/{user_id}/profile")
async def get_profile(user_id: str) -> dict:
    profile = long_term.get_profile(user_id)
    if not profile:
        return {"user_id": user_id, "profile": {}}
    return {"user_id": user_id, "profile": profile}


@app.patch("/api/users/{user_id}/profile")
async def update_profile(user_id: str, body: ProfileUpdate) -> dict:
    timestamp = datetime.now(timezone.utc).isoformat()
    for key, value in body.profile.items():
        long_term.update_profile(user_id, key, str(value), timestamp)
    return {"ok": True}


@app.get("/api/users/{user_id}/memories")
async def get_memories(user_id: str, scope: str = "long", limit: int = 10) -> dict:
    records = long_term.vector_store.records
    user_records = [r for r in records if r.user_id == user_id]
    user_records.sort(key=lambda r: r.created_at, reverse=True)
    items = [
        {"id": r.record_id, "text": r.text, "timestamp": r.created_at}
        for r in user_records[:limit]
    ]
    return {"items": items}


@app.post("/api/sessions")
async def create_session(body: SessionCreate) -> dict:
    session_id = f"s_{uuid.uuid4().hex[:8]}"
    sessions[session_id] = {
        "user_id": body.user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    return {"session_id": session_id}


@app.get("/api/sessions")
async def list_sessions(user_id: Optional[str] = None) -> dict:
    result = []
    for sid, info in sessions.items():
        if user_id and info["user_id"] != user_id:
            continue
        result.append({"session_id": sid, **info})
    return {"sessions": result}


# ---------------------------------------------------------------------------
# 静态文件服务 (前端)
# ---------------------------------------------------------------------------
FRONTEND_DIR = Path(__file__).parent / "frontend"


@app.get("/")
async def serve_index():
    index_path = FRONTEND_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return JSONResponse({"message": "Frontend not built yet. API is available at /api/"}, status_code=404)


if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="static")


# ---------------------------------------------------------------------------
# 启动入口
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app_api:app", host="127.0.0.1", port=8000, reload=True)
