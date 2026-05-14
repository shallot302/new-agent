from datetime import datetime
from typing import Dict, List

from src.agent.response_generator import ResponseGenerator
from src.config import MODEL_PATH, SHORT_TERM_WINDOW, RETRIEVAL_TOP_K
from src.memory.long_term import LongTermMemory, RetrievedMemory
from src.memory.short_term import ShortTermMemory


PREFERENCE_RULES = {
    "早上": ("schedule", "morning"),
    "晚上": ("schedule", "evening"),
    "减脂": ("goal", "lose_weight"),
    "力量": ("goal", "strength"),
    "耐力": ("goal", "endurance"),
    "哑铃": ("equipment", "dumbbell"),
    "膝盖": ("injury", "knee"),
}


class CompanionAgent:
    def __init__(self, long_term: LongTermMemory | None = None, use_llm: bool = False):
        self.long_term = long_term or LongTermMemory()
        self.short_term = ShortTermMemory(window=SHORT_TERM_WINDOW)
        llm_client = None
        if use_llm and MODEL_PATH.exists():
            from src.agent.llm_client import LLMConfig, LocalLLM

            llm_client = LocalLLM(LLMConfig(model_path=MODEL_PATH))
        self.generator = ResponseGenerator(llm_client=llm_client)

    def _extract_preferences(self, message: str) -> Dict[str, str]:
        found: Dict[str, str] = {}
        for keyword, (key, value) in PREFERENCE_RULES.items():
            if keyword in message:
                found[key] = value
        return found

    def _store_preferences(self, user_id: str, preferences: Dict[str, str], timestamp: str) -> None:
        for key, value in preferences.items():
            self.long_term.update_profile(user_id, key, value, timestamp)

    def handle_message(
        self,
        user_id: str,
        message: str,
        timestamp: str | None = None,
        use_memory: bool = True,
        top_k: int | None = None,
    ) -> str:
        timestamp = timestamp or datetime.utcnow().isoformat()
        preferences = self._extract_preferences(message)
        if preferences:
            self._store_preferences(user_id, preferences, timestamp)

        profile = self.long_term.get_profile(user_id) if use_memory else {}
        memories: List[RetrievedMemory] = []
        if use_memory:
            memories = self.long_term.retrieve(user_id, message, top_k=top_k or RETRIEVAL_TOP_K)

        response = self.generator.generate(message, profile, self.short_term.context(), memories)
        self.short_term.add_turn(timestamp, message, response)
        self.long_term.add_snippet(
            record_id=f"{user_id}-{timestamp}",
            user_id=user_id,
            text=message,
            created_at=timestamp,
            metadata={"source": "user"},
        )
        return response
