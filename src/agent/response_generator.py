from typing import Dict, List

from src.memory.long_term import RetrievedMemory
from src.memory.short_term import ShortTermTurn


class ResponseGenerator:
    def __init__(self, llm_client=None):
        self.llm_client = llm_client

    def generate(
        self,
        user_message: str,
        profile: Dict[str, str],
        short_term: List[ShortTermTurn],
        memories: List[RetrievedMemory],
    ) -> str:
        if self.llm_client:
            try:
                return self.llm_client.generate(user_message, profile, short_term, memories)
            except Exception:
                pass
        goal = profile.get("goal", "general_fitness")
        schedule = profile.get("schedule", "flexible")
        injury = profile.get("injury")
        equipment = profile.get("equipment")

        memory_lines = []
        for memory in memories:
            memory_lines.append(memory.text)

        if "饮食" in user_message or "吃" in user_message:
            return self._diet_reply(goal, schedule, injury, memory_lines)
        if "计划" in user_message or "训练" in user_message:
            return self._training_reply(goal, schedule, injury, equipment, memory_lines)
        return self._general_reply(goal, schedule, injury, memory_lines)

    @staticmethod
    def _training_reply(goal: str, schedule: str, injury: str | None, equipment: str | None, memory_lines: List[str]) -> str:
        parts = ["这是为你定制的训练建议："]
        parts.append(f"目标：{goal}，训练时间偏好：{schedule}。")
        if equipment:
            parts.append(f"器械：{equipment}，会加入力量训练。")
        if injury:
            parts.append(f"注意旧伤（{injury}），避免冲击性动作。")
        if memory_lines:
            parts.append("我记得你提到过：" + " / ".join(memory_lines[:2]))
        parts.append("今天建议：热身10分钟 + 主训练30分钟 + 拉伸5分钟。")
        return "\n".join(parts)

    @staticmethod
    def _diet_reply(goal: str, schedule: str, injury: str | None, memory_lines: List[str]) -> str:
        parts = ["饮食上我们遵循稳定和可持续："]
        parts.append(f"目标：{goal}，训练时间：{schedule}。")
        if injury:
            parts.append("保证蛋白质摄入，利于恢复。")
        if memory_lines:
            parts.append("参考你的背景：" + " / ".join(memory_lines[:2]))
        parts.append("建议：三餐规律，增加蔬菜和优质蛋白。")
        return "\n".join(parts)

    @staticmethod
    def _general_reply(goal: str, schedule: str, injury: str | None, memory_lines: List[str]) -> str:
        parts = ["收到，我会根据你的情况调整。"]
        parts.append(f"当前目标：{goal}，时间偏好：{schedule}。")
        if injury:
            parts.append(f"我会注意你的旧伤：{injury}。")
        if memory_lines:
            parts.append("之前的关键点：" + " / ".join(memory_lines[:2]))
        parts.append("随时告诉我新的变化，我会持续更新计划。")
        return "\n".join(parts)

