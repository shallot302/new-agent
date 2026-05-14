import argparse
import json
from pathlib import Path
from typing import List

from src.agent.companion_agent import CompanionAgent
from src.config import DATA_DIR, REPORTS_DIR
from src.memory.utils import reset_memory_files


def load_dataset(path: Path) -> List[dict]:
    with path.open("r", encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def run_case_study(turns: List[dict]) -> str:
    agent_with_memory = CompanionAgent()
    agent_without_memory = CompanionAgent()
    lines = ["# 案例分析", ""]
    for turn in turns:
        user_id = turn["user_id"]
        message = turn["user_msg"]
        timestamp = turn["timestamp"]
        reply_no_memory = agent_without_memory.handle_message(user_id, message, timestamp, use_memory=False)
        reply_with_memory = agent_with_memory.handle_message(user_id, message, timestamp, use_memory=True)
        lines.append(f"## {timestamp}")
        lines.append(f"用户：{message}")
        lines.append("无记忆回复：")
        lines.append(reply_no_memory)
        lines.append("有记忆回复：")
        lines.append(reply_with_memory)
        lines.append("")
    return "\n".join(lines)


def resolve_dataset_path(requested: str | None) -> Path:
    if requested:
        return Path(requested)
    candidate = DATA_DIR / "datal.jsonl"
    if candidate.exists():
        return candidate
    return DATA_DIR / "simulated_dialogues.jsonl"


def main() -> None:
    parser = argparse.ArgumentParser(description="Case study evaluation")
    parser.add_argument("--dataset", help="Path to a JSONL dataset (defaults to data/datal.jsonl if present)")
    args = parser.parse_args()

    dataset_path = resolve_dataset_path(args.dataset)
    turns = load_dataset(dataset_path)
    reset_memory_files()
    report = run_case_study(turns)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_path = REPORTS_DIR / "case_study.md"
    report_path.write_text(report, encoding="utf-8")
    print(f"Wrote {report_path}")


if __name__ == "__main__":
    main()

