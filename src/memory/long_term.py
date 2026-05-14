import sqlite3
from dataclasses import dataclass
from typing import Dict, List

from src.config import DB_PATH, RETRIEVAL_TOP_K, VECTOR_STORE_PATH
from src.memory.vector_store import LocalVectorStore, VectorRecord


@dataclass
class RetrievedMemory:
    record_id: str
    text: str
    score: float
    metadata: Dict[str, str]


class LongTermMemory:
    def __init__(self, db_path=DB_PATH, vector_path=VECTOR_STORE_PATH):
        self.db_path = db_path
        self.vector_store = LocalVectorStore(vector_path)
        self._init_db()

    def _init_db(self) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS user_profile (
                    user_id TEXT NOT NULL,
                    key TEXT NOT NULL,
                    value TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (user_id, key)
                )
                """
            )

    def update_profile(self, user_id: str, key: str, value: str, updated_at: str) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                INSERT INTO user_profile (user_id, key, value, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(user_id, key)
                DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
                """,
                (user_id, key, value, updated_at),
            )
            conn.commit()

    def upsert_profile_map(self, user_id: str, profile: Dict[str, str], updated_at: str) -> None:
        if not profile:
            return
        with sqlite3.connect(self.db_path) as conn:
            conn.executemany(
                """
                INSERT INTO user_profile (user_id, key, value, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(user_id, key)
                DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
                """,
                [(user_id, key, value, updated_at) for key, value in profile.items()],
            )
            conn.commit()

    def get_profile(self, user_id: str) -> Dict[str, str]:
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute(
                "SELECT key, value FROM user_profile WHERE user_id=?", (user_id,)
            ).fetchall()
        return {key: value for key, value in rows}

    def get_profile_records(self, user_id: str) -> List[Dict[str, str]]:
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute(
                "SELECT key, value, updated_at FROM user_profile WHERE user_id=? ORDER BY key", (user_id,)
            ).fetchall()
        return [{"key": key, "value": value, "updated_at": updated_at} for key, value, updated_at in rows]

    def add_snippet(self, record_id: str, user_id: str, text: str, created_at: str, metadata: Dict[str, str]) -> None:
        self.vector_store.add_text(record_id, user_id, text, created_at, metadata)

    def list_snippets(self, user_id: str, limit: int = 50, offset: int = 0) -> List[VectorRecord]:
        return self.vector_store.list_records(user_id, limit=limit, offset=offset)

    def update_snippet(self, record_id: str, text: str | None = None, metadata: Dict[str, str] | None = None) -> bool:
        return self.vector_store.update_record(record_id, text=text, metadata=metadata)

    def delete_snippet(self, record_id: str) -> bool:
        return self.vector_store.delete_record(record_id)

    def retrieve(self, user_id: str, query: str, top_k: int = RETRIEVAL_TOP_K) -> List[RetrievedMemory]:
        results = self.vector_store.query(user_id, query, top_k=top_k)
        memories: List[RetrievedMemory] = []
        for record, score in results:
            memories.append(
                RetrievedMemory(
                    record_id=record.record_id,
                    text=record.text,
                    score=score,
                    metadata=record.metadata,
                )
            )
        return memories
