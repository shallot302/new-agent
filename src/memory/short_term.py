from collections import deque
from dataclasses import dataclass
from typing import Deque, List


@dataclass
class ShortTermTurn:
    timestamp: str
    user_msg: str
    agent_msg: str


class ShortTermMemory:
    def __init__(self, window: int = 6):
        self.window = window
        self._buffer: Deque[ShortTermTurn] = deque(maxlen=window)

    def add_turn(self, timestamp: str, user_msg: str, agent_msg: str) -> None:
        self._buffer.append(ShortTermTurn(timestamp, user_msg, agent_msg))

    def context(self) -> List[ShortTermTurn]:
        return list(self._buffer)

