
from __future__ import annotations

import asyncio
import json
import os
from datetime import datetime
from typing import AsyncGenerator, Dict, List

from pathlib import Path
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from src.agent.companion_agent import CompanionAgent
from src.api.schemas import (
    OnboardingQuestionRequest,
    OnboardingQuestionResponse,
    ChatRequest,
    ChatResponse,
    MemoryCreateRequest,
    MemoryListResponse,
    MemoryUpdateRequest,
    OkResponse,
    ProfilePatchRequest,
    ProfileRecordResponse,
    ProfileResponse,
)
from src.config import PROFILE_FIELDS, RETRIEVAL_TOP_K
from src.memory.long_term import LongTermMemory

app = FastAPI(title="Long-Term Memory Fitness Companion API")

_agent_cache: Dict[str, CompanionAgent] = {}
_default_use_llm = os.getenv("API_USE_LLM", "false").lower() in {"1", "true", "yes"}


def _get_agent(use_llm: bool) -> CompanionAgent:
    key = "llm" if use_llm else "base"
    if key not in _agent_cache:
        _agent_cache[key] = CompanionAgent(use_llm=use_llm)
    return _agent_cache[key]


def _get_long_term() -> LongTermMemory:
    return _get_agent(False).long_term


@app.get("/api/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "time": datetime.utcnow().isoformat()}


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    use_llm = request.use_llm if request.use_llm is not None else _default_use_llm
    agent = _get_agent(use_llm=use_llm)

    used_memories = []
    if request.use_memory:
        used_memories = agent.long_term.retrieve(
            request.user_id,
            request.message,
            top_k=request.top_k or RETRIEVAL_TOP_K,
        )

    reply = agent.handle_message(
        request.user_id,
        request.message,
        timestamp=request.timestamp,
        use_memory=request.use_memory,
        top_k=request.top_k or RETRIEVAL_TOP_K,
    )
    profile = agent.long_term.get_profile(request.user_id)

    return ChatResponse(
        reply=reply,
        profile_snapshot=profile,
        used_memories=[
            {
                "id": item.record_id,
                "score": item.score,
                "text": item.text,
                "metadata": item.metadata,
            }
            for item in used_memories
        ],
    )


@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    use_llm = request.use_llm if request.use_llm is not None else _default_use_llm
    agent = _get_agent(use_llm=use_llm)
    llm_client = agent.generator.llm_client

    used_memories = []
    if request.use_memory:
        used_memories = agent.long_term.retrieve(
            request.user_id,
            request.message,
            top_k=request.top_k or RETRIEVAL_TOP_K,
        )

    async def generate() -> AsyncGenerator[str, None]:
        timestamp = request.timestamp or datetime.utcnow().isoformat()

        # Extract preferences first
        preferences = agent._extract_preferences(request.message)
        if preferences:
            agent._store_preferences(request.user_id, preferences, timestamp)

        profile = agent.long_term.get_profile(request.user_id) if request.use_memory else {}
        memories = agent.long_term.retrieve(
            request.user_id, request.message, top_k=request.top_k or RETRIEVAL_TOP_K
        ) if request.use_memory else []

        # Generate response - LLM or template
        if llm_client:
            try:
                import threading
                from queue import Queue
                from transformers import TextIteratorStreamer

                short_term_ctx = agent.short_term.context()
                streamer = TextIteratorStreamer(
                    llm_client.tokenizer, skip_prompt=True, skip_special_tokens=True
                )

                system_prompt = llm_client._build_system_prompt(profile, short_term_ctx, memories)
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": request.message},
                ]
                prompt = llm_client._format_messages(messages)
                inputs = llm_client.tokenizer(prompt, return_tensors="pt")
                inputs = {key: value.to(llm_client.model.device) for key, value in inputs.items()}

                generation_kwargs = {
                    **inputs,
                    "max_new_tokens": llm_client.config.max_new_tokens,
                    "do_sample": True,
                    "temperature": llm_client.config.temperature,
                    "top_p": llm_client.config.top_p,
                    "streamer": streamer,
                }

                full_reply = ""
                thread = threading.Thread(target=llm_client.model.generate, kwargs=generation_kwargs)
                thread.start()

                for token in streamer:
                    full_reply += token
                    yield f"data: {json.dumps({'token': token})}\n\n"

                thread.join()
                reply = full_reply.strip()

            except Exception as e:
                # LLM streaming failed, fall back to template
                reply = agent.generator.generate(request.message, profile, short_term_ctx, memories)
                for i in range(0, len(reply), 3):
                    chunk = reply[i:i+3]
                    yield f"data: {json.dumps({'token': chunk})}\n\n"
                    await asyncio.sleep(0.02)
        else:
            # Template mode: simulate streaming
            reply = agent.generator.generate(
                request.message, profile, agent.short_term.context(), memories
            )
            for i in range(0, len(reply), 3):
                chunk = reply[i:i+3]
                yield f"data: {json.dumps({'token': chunk})}\n\n"
                await asyncio.sleep(0.02)

        # Update short-term memory
        agent.short_term.add_turn(timestamp, request.message, reply)
        agent.long_term.add_snippet(
            record_id=f"{request.user_id}-{timestamp}",
            user_id=request.user_id,
            text=request.message,
            created_at=timestamp,
            metadata={"source": "user"},
        )

        # Final message with metadata
        profile_snapshot = agent.long_term.get_profile(request.user_id)
        final_data = {
            "done": True,
            "profile_snapshot": profile_snapshot,
            "used_memories": [
                {"id": m.record_id, "score": m.score, "text": m.text, "metadata": m.metadata}
                for m in (used_memories or [])
            ],
        }
        yield f"data: {json.dumps(final_data, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/users/{user_id}/profile", response_model=ProfileResponse)
def get_profile(user_id: str) -> ProfileResponse:
    memory = LongTermMemory()
    return ProfileResponse(user_id=user_id, profile=memory.get_profile(user_id))


@app.get("/api/users/{user_id}/profile/records", response_model=ProfileRecordResponse)
def get_profile_records(user_id: str) -> ProfileRecordResponse:
    memory = LongTermMemory()
    return ProfileRecordResponse(user_id=user_id, records=memory.get_profile_records(user_id))


@app.patch("/api/users/{user_id}/profile", response_model=OkResponse)
def patch_profile(user_id: str, request: ProfilePatchRequest) -> OkResponse:
    memory = LongTermMemory()
    timestamp = request.timestamp or datetime.utcnow().isoformat()
    memory.upsert_profile_map(user_id, request.profile, timestamp)
    return OkResponse(ok=True)


@app.get("/api/users/{user_id}/profile/schema", response_model=Dict[str, List[str]])
def profile_schema() -> Dict[str, List[str]]:
    return {"fields": PROFILE_FIELDS}


@app.post("/api/chat/onboarding-question", response_model=OnboardingQuestionResponse)
async def onboarding_question(request: OnboardingQuestionRequest) -> OnboardingQuestionResponse:
    user_id = request.user_id
    round_num = request.round
    existing_profile = request.profile

    # Determine which fields are still empty
    missing_safety = not all(k in existing_profile for k in ["height_cm", "weight_kg", "injuries"])
    missing_training = not all(k in existing_profile for k in ["training_years", "available_place", "available_days_per_week"])
    missing_personal = not all(k in existing_profile for k in ["occupation", "motivation", "biggest_barrier"])

    rounds = [
        {
            "round": 1,
            "title": "破冰与安全",
            "reasoning": "在一切开始前，你的健康与安全是我最优先考虑的事",
            "questions": [
                "先告诉我你的身高、体重、年龄，以及你理想中的改变目标吧",
                "你有没有任何伤病、慢性病（如腰膝损伤、高血压）或近期手术史？请一定如实告诉我",
            ],
            "condition": missing_safety,
        },
        {
            "round": 2,
            "title": "摸清家底",
            "reasoning": "了解你的身体基线了，接下来盘盘你的训练条件",
            "questions": [
                "你计划在哪练？手头有哪些器械？每周能抽出几天、每次多长时间？",
                "你算运动新手还是老手？标准俯卧撑大概能做几个？",
            ],
            "condition": missing_training,
        },
        {
            "round": 3,
            "title": "解码动机",
            "reasoning": "你的训练蓝图已经清晰大半，最后聊聊你这个人和坚持的动力",
            "questions": [
                "你平时工作是久坐居多还是体力活动为主？最近的睡眠和压力怎么样？",
                "真正驱使你这次想要改变的'决定性瞬间'是什么？过去是什么阻挡了你？",
                "你希望我扮演温暖鼓励的伙伴，还是严格高效的教官？",
            ],
            "condition": missing_personal,
        },
    ]

    idx = min(round_num - 1, 2)
    selected = rounds[idx]

    if not selected["condition"]:
        return {
            "round": round_num,
            "title": "画像已完备",
            "reasoning": "你的画像信息已经足够详细，可以开始个性化训练了",
            "questions": [],
            "complete": True,
        }

    return {
        "round": selected["round"],
        "title": selected["title"],
        "reasoning": selected["reasoning"],
        "questions": selected["questions"],
        "complete": False,
    }


@app.get("/api/users/{user_id}/memories", response_model=MemoryListResponse)
def list_memories(
    user_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> MemoryListResponse:
    memory = LongTermMemory()
    items = memory.list_snippets(user_id, limit=limit, offset=offset)
    return MemoryListResponse(
        items=[
            {"id": item.record_id, "text": item.text, "timestamp": item.created_at, "metadata": item.metadata}
            for item in items
        ]
    )


@app.post("/api/users/{user_id}/memories", response_model=OkResponse)
def create_memory(user_id: str, request: MemoryCreateRequest) -> OkResponse:
    memory = LongTermMemory()
    timestamp = request.created_at or datetime.utcnow().isoformat()
    record_id = f"{user_id}-{timestamp}"
    memory.add_snippet(record_id, user_id, request.text, timestamp, request.metadata)
    return OkResponse(ok=True)


@app.patch("/api/users/{user_id}/memories/{record_id}", response_model=OkResponse)
def update_memory(user_id: str, record_id: str, request: MemoryUpdateRequest) -> OkResponse:
    memory = LongTermMemory()
    success = memory.update_snippet(record_id, text=request.text, metadata=request.metadata)
    if not success:
        raise HTTPException(status_code=404, detail="Memory not found")
    return OkResponse(ok=True)


@app.delete("/api/users/{user_id}/memories/{record_id}", response_model=OkResponse)
def delete_memory(user_id: str, record_id: str) -> OkResponse:
    memory = LongTermMemory()
    success = memory.delete_snippet(record_id)
    if not success:
        raise HTTPException(status_code=404, detail="Memory not found")
    return OkResponse(ok=True)



# ---------------------------------------------------------------------------
# Static file serving (frontend)
# ---------------------------------------------------------------------------
FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / 'frontend'


@app.get('/')
async def serve_index():
    index_path = FRONTEND_DIR / 'index.html'
    if index_path.exists():
        return FileResponse(index_path)
    return JSONResponse({'message': 'Frontend not found'}, status_code=404)


if FRONTEND_DIR.exists():
    app.mount('/static', StaticFiles(directory=str(FRONTEND_DIR), html=True), name='static')


