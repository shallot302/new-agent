// 共享类型定义

type ProfileData = Record<string, string>;

interface ChatRequest {
  user_id: string;
  message: string;
  session_id?: string;
  timestamp?: string;
  use_memory?: boolean;
  top_k?: number;
  use_llm?: boolean;
}

interface MemoryUsed {
  id: string;
  score: number;
  text: string;
  metadata: Record<string, string>;
}

interface ChatResponse {
  reply: string;
  profile_snapshot: ProfileData;
  used_memories: MemoryUsed[];
}

interface SSEComplete {
  done: true;
  profile_snapshot: ProfileData;
  used_memories: MemoryUsed[];
}

interface ProfileRecord {
  key: string;
  value: string;
  updated_at: string;
}

interface MemoryItem {
  id: string;
  text: string;
  timestamp: string;
  metadata: Record<string, string>;
}

interface SessionInfo {
  session_id: string;
  user_id: string;
  created_at: string;
}

interface OnboardingQuestion {
  round: number;
  title: string;
  reasoning: string;
  questions: string[];
  complete: boolean;
}

interface ModelConfig {
  model_name: string;
  device: string;
  temperature: number;
  top_p: number;
  max_new_tokens: number;
  use_llm: boolean;
}

const PROFILE_FIELD_LABELS: Record<string, string> = {
  age: '年龄', height_cm: '身高(cm)', weight_kg: '体重(kg)',
  target_weight_kg: '目标体重(kg)', gender: '性别', body_type: '体型',
  body_fat_percent: '体脂率(%)', bmi: 'BMI', exercise_habits: '运动习惯',
  diet_habits: '饮食习惯', injuries: '伤病', chronic_conditions: '慢性病',
  surgery_history: '手术史', health_status: '健康状态',
  training_years: '训练年限', movement_skill_level: '动作技能水平',
  past_sports: '过往运动', available_place: '训练场地',
  available_equipment: '可用器械', available_days_per_week: '每周天数',
  session_duration_minutes: '每次时长(分钟)', preferred_training_time: '偏好训练时间',
  occupation: '职业', workload_level: '工作强度', sleep_hours: '睡眠时长',
  sleep_quality: '睡眠质量', stress_level: '压力水平',
  diet_structure: '饮食结构', motivation: '最大驱动力',
  biggest_barrier: '最大障碍', personality_and_motivation: '教练风格偏好',
};

export { PROFILE_FIELD_LABELS };
export type {
  ProfileData, ChatRequest, ChatResponse, MemoryUsed, SSEComplete,
  ProfileRecord, MemoryItem, SessionInfo, OnboardingQuestion, ModelConfig,
};
