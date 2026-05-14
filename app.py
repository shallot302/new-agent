import argparse
import json
from pathlib import Path

from src.agent.companion_agent import CompanionAgent
from src.config import DATA_DIR
from src.memory.utils import reset_memory_files


def run_demo(dataset_path: Path, use_llm: bool) -> None:
    agent = CompanionAgent(use_llm=use_llm)
    with dataset_path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            turn = json.loads(line)
            reply = agent.handle_message(
                turn["user_id"],
                turn["user_msg"],
                turn["timestamp"],
                use_memory=True,
            )
            print(f"[{turn['timestamp']}] 用户：{turn['user_msg']}")
            print(f"[{turn['timestamp']}] 助手：{reply}")
            print("-")


def resolve_dataset_path(requested: str | None) -> Path:
    if requested:
        return Path(requested)
    candidate = DATA_DIR / "datal.jsonl"
    if candidate.exists():
        return candidate
    return DATA_DIR / "simulated_dialogues.jsonl"


def main() -> None:
    parser = argparse.ArgumentParser(description="Long-term memory companion agent demo")
    parser.add_argument("--demo", action="store_true", help="Run the scripted dialogue demo")
    parser.add_argument("--reset", action="store_true", help="Clear persisted memory before running")
    parser.add_argument("--use-llm", action="store_true", help="Use the local LLM for responses")
    parser.add_argument("--dataset", help="Path to a JSONL dataset (defaults to data/datal.jsonl if present)")
    args = parser.parse_args()

    if args.demo:
        if args.reset:
            reset_memory_files()
        dataset_path = resolve_dataset_path(args.dataset)
        run_demo(dataset_path, use_llm=args.use_llm)
    else:
        print("Use --demo to run the scripted conversation.")


if __name__ == "__main__":
    main()

