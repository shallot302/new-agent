from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    user_id: str
    message: str
    session_id: Optional[str] = None
    timestamp: Optional[str] = None
    use_memory: bool = True
    top_k: Optional[int] = None
    use_llm: Optional[bool] = None


class MemoryUsed(BaseModel):
    id: str
    score: float
    text: str
    metadata: Dict[str, str] = Field(default_factory=dict)


class ChatResponse(BaseModel):
    reply: str
    profile_snapshot: Dict[str, str]
    used_memories: List[MemoryUsed]


class ProfilePatchRequest(BaseModel):
    profile: Dict[str, str]
    timestamp: Optional[str] = None


class ProfileResponse(BaseModel):
    user_id: str
    profile: Dict[str, str]


class ProfileRecord(BaseModel):
    key: str
    value: str
    updated_at: str


class ProfileRecordResponse(BaseModel):
    user_id: str
    records: List[ProfileRecord]


class MemoryItem(BaseModel):
    id: str
    text: str
    timestamp: str
    metadata: Dict[str, str] = Field(default_factory=dict)


class MemoryListResponse(BaseModel):
    items: List[MemoryItem]


class MemoryCreateRequest(BaseModel):
    text: str
    metadata: Dict[str, str] = Field(default_factory=dict)
    created_at: Optional[str] = None


class MemoryUpdateRequest(BaseModel):
    text: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None


class OkResponse(BaseModel):
    ok: bool



class OnboardingQuestionRequest(BaseModel):
    user_id: str
    round: int = 1
    profile: Dict[str, str] = Field(default_factory=dict)


class OnboardingQuestionResponse(BaseModel):
    round: int
    title: str
    reasoning: str
    questions: List[str]
    complete: bool = False
