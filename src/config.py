from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
REPORTS_DIR = BASE_DIR / "reports"
DB_PATH = BASE_DIR / "memory_profile.sqlite3"
VECTOR_STORE_PATH = BASE_DIR / "vector_store.json"

SHORT_TERM_WINDOW = 6
RETRIEVAL_TOP_K = 3

MODEL_PATH = BASE_DIR / "GLM-4-main"
LLM_DEVICE = "auto"
LLM_MAX_NEW_TOKENS = 256
LLM_TEMPERATURE = 0.7
LLM_TOP_P = 0.9

PROFILE_FIELDS = [
    "age",
    "gender",
    "height_cm",
    "weight_kg",
    "target_weight_kg",
    "body_type",
    "body_fat_percent",
    "bmi",
    "exercise_habits",
    "diet_habits",
    "injuries",
    "chronic_conditions",
    "surgery_history",
    "health_status",
    "training_years",
    "movement_skill_level",
    "past_sports",
    "available_place",
    "available_equipment",
    "available_days_per_week",
    "session_duration_minutes",
    "preferred_training_time",
    "occupation",
    "workload_level",
    "sleep_hours",
    "sleep_quality",
    "stress_level",
    "diet_structure",
    "motivation",
    "biggest_barrier",
    "personality_and_motivation",
]
