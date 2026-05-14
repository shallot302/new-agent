from dataclasses import dataclass
from typing import Dict


@dataclass
class ConversationTurn:
    user_id: str
    timestamp: str
    user_msg: str
    agent_msg: str
    annotations: Dict[str, str]

