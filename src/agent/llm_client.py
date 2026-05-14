from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

from src.config import LLM_DEVICE, LLM_MAX_NEW_TOKENS, LLM_TEMPERATURE, LLM_TOP_P
from src.memory.long_term import RetrievedMemory
from src.memory.short_term import ShortTermTurn


@dataclass
class LLMConfig:
    model_path: Path
    device: str = LLM_DEVICE
    max_new_tokens: int = LLM_MAX_NEW_TOKENS
    temperature: float = LLM_TEMPERATURE
    top_p: float = LLM_TOP_P


class LocalLLM:
    def __init__(self, config: LLMConfig):
        self.config = config
        self.device = self._resolve_device(config.device)
        self.tokenizer = AutoTokenizer.from_pretrained(config.model_path, trust_remote_code=True)
        dtype = torch.float16 if self.device.startswith("cuda") else torch.float32
        self.model = AutoModelForCausalLM.from_pretrained(
            config.model_path,
            torch_dtype=dtype,
            trust_remote_code=True,
        )
        self.model.to(self.device)
        self.model.eval()

    def generate(
        self,
        user_message: str,
        profile: Dict[str, str],
        short_term: List[ShortTermTurn],
        memories: List[RetrievedMemory],
    ) -> str:
        system_prompt = self._build_system_prompt(profile, short_term, memories)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ]
        prompt = self._format_messages(messages)
        inputs = self.tokenizer(prompt, return_tensors="pt")
        inputs = {key: value.to(self.model.device) for key, value in inputs.items()}
        with torch.inference_mode():
            output_ids = self.model.generate(
                **inputs,
                max_new_tokens=self.config.max_new_tokens,
                do_sample=True,
                temperature=self.config.temperature,
                top_p=self.config.top_p,
            )
        generated = output_ids[0][inputs["input_ids"].shape[-1] :]
        return self.tokenizer.decode(generated, skip_special_tokens=True).strip()

    def _format_messages(self, messages: List[Dict[str, str]]) -> str:
        if hasattr(self.tokenizer, "apply_chat_template"):
            return self.tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        parts = []
        for item in messages:
            parts.append(f"[{item['role']}] {item['content']}")
        parts.append("[assistant]")
        return "\n".join(parts)

    @staticmethod
    def _resolve_device(device: str) -> str:
        if device == "auto":
            return "cuda" if torch.cuda.is_available() else "cpu"
        if device.startswith("cuda") and not torch.cuda.is_available():
            return "cpu"
        return device

    @staticmethod
    def _build_system_prompt(
        profile: Dict[str, str],
        short_term: List[ShortTermTurn],
        memories: List[RetrievedMemory],
    ) -> str:
        profile_text = "；".join(f"{key}={value}" for key, value in profile.items()) or "无"
        memory_text = " / ".join(item.text for item in memories[:3]) or "无"
        short_text = " / ".join(f"U:{turn.user_msg} A:{turn.agent_msg}" for turn in short_term[-3:]) or "无"
        return (
            "你是一名长期陪伴的私人健身教练，请根据用户画像和历史记忆给出简洁、具体、可执行的建议。\n"
            f"用户画像: {profile_text}\n"
            f"长期记忆: {memory_text}\n"
            f"最近对话: {short_text}\n"
            "回答必须使用中文，且不超过 6 句。"
        )

