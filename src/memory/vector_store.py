import json
import math
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Tuple


CJK_RE = re.compile(r"[\u4e00-\u9fff]", re.UNICODE)
TOKEN_RE = re.compile(r"[A-Za-z0-9]+", re.UNICODE)


@dataclass
class VectorRecord:
    record_id: str
    user_id: str
    text: str
    tokens: Dict[str, int]
    created_at: str
    metadata: Dict[str, str]


class LocalVectorStore:
    def __init__(self, path: Path):
        self.path = path
        self.records: List[VectorRecord] = []
        self._load()

    def _load(self) -> None:
        if not self.path.exists():
            return
        with self.path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
        for item in data:
            self.records.append(
                VectorRecord(
                    record_id=item["record_id"],
                    user_id=item["user_id"],
                    text=item["text"],
                    tokens=item["tokens"],
                    created_at=item["created_at"],
                    metadata=item.get("metadata", {}),
                )
            )

    def _save(self) -> None:
        payload = [
            {
                "record_id": record.record_id,
                "user_id": record.user_id,
                "text": record.text,
                "tokens": record.tokens,
                "created_at": record.created_at,
                "metadata": record.metadata,
            }
            for record in self.records
        ]
        with self.path.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)

    @staticmethod
    def _tokenize(text: str) -> Dict[str, int]:
        counts: Dict[str, int] = {}
        matches = TOKEN_RE.findall(text.lower())
        if matches:
            for match in matches:
                counts[match] = counts.get(match, 0) + 1
            return counts
        for match in CJK_RE.findall(text):
            counts[match] = counts.get(match, 0) + 1
        return counts

    @staticmethod
    def _cosine(a: Dict[str, int], b: Dict[str, int]) -> float:
        if not a or not b:
            return 0.0
        dot = sum(a.get(key, 0) * value for key, value in b.items())
        norm_a = math.sqrt(sum(value * value for value in a.values()))
        norm_b = math.sqrt(sum(value * value for value in b.values()))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    def add_text(self, record_id: str, user_id: str, text: str, created_at: str, metadata: Dict[str, str]) -> None:
        tokens = self._tokenize(text)
        self.records.append(VectorRecord(record_id, user_id, text, tokens, created_at, metadata))
        self._save()

    def query(self, user_id: str, text: str, top_k: int = 3) -> List[Tuple[VectorRecord, float]]:
        query_tokens = self._tokenize(text)
        scored: List[Tuple[VectorRecord, float]] = []
        for record in self.records:
            if record.user_id != user_id:
                continue
            score = self._cosine(record.tokens, query_tokens)
            if score > 0:
                scored.append((record, score))
        scored.sort(key=lambda item: item[1], reverse=True)
        return scored[:top_k]

    def list_records(self, user_id: str, limit: int = 50, offset: int = 0) -> List[VectorRecord]:
        items = [record for record in self.records if record.user_id == user_id]
        return items[offset : offset + limit]

    def get_record(self, record_id: str) -> VectorRecord | None:
        for record in self.records:
            if record.record_id == record_id:
                return record
        return None

    def update_record(self, record_id: str, text: str | None = None, metadata: Dict[str, str] | None = None) -> bool:
        record = self.get_record(record_id)
        if not record:
            return False
        if text is not None:
            record.text = text
            record.tokens = self._tokenize(text)
        if metadata is not None:
            record.metadata = metadata
        self._save()
        return True

    def delete_record(self, record_id: str) -> bool:
        before = len(self.records)
        self.records = [record for record in self.records if record.record_id != record_id]
        if len(self.records) == before:
            return False
        self._save()
        return True
