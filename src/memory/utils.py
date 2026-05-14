from src.config import DB_PATH, VECTOR_STORE_PATH


def reset_memory_files() -> None:
    if DB_PATH.exists():
        DB_PATH.unlink()
    if VECTOR_STORE_PATH.exists():
        VECTOR_STORE_PATH.unlink()

