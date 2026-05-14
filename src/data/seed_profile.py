import argparse
import json
from datetime import datetime
from pathlib import Path

from src.memory.long_term import LongTermMemory


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed user profile into SQLite")
    parser.add_argument("--user-id", required=True, help="User id to seed")
    parser.add_argument("--json", required=True, help="Path to a JSON profile file")
    parser.add_argument("--timestamp", help="ISO timestamp (defaults to now)")
    args = parser.parse_args()

    profile_path = Path(args.json)
    profile = json.loads(profile_path.read_text(encoding="utf-8"))
    timestamp = args.timestamp or datetime.utcnow().isoformat()

    memory = LongTermMemory()
    memory.upsert_profile_map(args.user_id, profile, timestamp)
    print(f"Seeded {len(profile)} fields for {args.user_id} at {timestamp}")


if __name__ == "__main__":
    main()

