# 前端接口文档（草案）

> 说明：以下为前端联调用接口草案，默认返回 JSON，编码为 UTF-8。

## 基础信息
- Base URL: `/api`
- Content-Type: `application/json`
- 认证：暂无（如需登录态，可在后续加入 token）

## 1. 健康检查
**GET** `/api/health`

响应示例：
```json
{"status":"ok","time":"2026-05-13T10:00:00Z"}
```

## 2. 发送对话（核心接口）
**POST** `/api/chat`

说明：前端直接调用后端 GLM-4 模型（可通过 `use_llm` 开关），后端负责记忆检索与画像融合。

请求体：
```json
{
  "user_id": "u_001",
  "session_id": "s_001",
  "message": "我最近膝盖有点不舒服，训练要调整吗？",
  "timestamp": "2026-05-13T10:01:00Z",
  "use_memory": true,
  "top_k": 5,
  "use_llm": true
}
```

响应体：
```json
{
  "reply": "如果膝盖不适，建议先降低强度...",
  "profile_snapshot": {
    "goal": "减脂",
    "preferred_training_time": "晚上"
  },
  "used_memories": [
    {"id":"m_102","score":0.82,"text":"用户上周反馈膝盖疼","metadata":{"source":"user"}}
  ]
}
```

## 3. 获取用户画像
**GET** `/api/users/{user_id}/profile`

响应体：
```json
{
  "user_id": "u_001",
  "profile": {
    "age": "26",
    "gender": "female",
    "weight_kg": "62",
    "target_weight_kg": "55"
  }
}
```

## 4. 更新用户画像（导入/覆盖）
**PATCH** `/api/users/{user_id}/profile`

请求体：
```json
{
  "profile": {
    "age": "26",
    "gender": "female",
    "height_cm": "165",
    "weight_kg": "62",
    "target_weight_kg": "55",
    "exercise_habits": "每周3次",
    "injuries": "膝盖轻微不适"
  },
  "timestamp": "2026-05-13T10:01:00Z"
}
```

响应体：
```json
{"ok": true}
```

## 5. 获取画像记录（包含更新时间）
**GET** `/api/users/{user_id}/profile/records`

响应体：
```json
{
  "user_id": "u_001",
  "records": [
    {"key":"weight_kg","value":"62","updated_at":"2026-05-13T10:01:00Z"}
  ]
}
```

## 6. 获取画像字段标准
**GET** `/api/users/{user_id}/profile/schema`

响应体：
```json
{
  "fields": ["age","gender","height_cm","weight_kg","target_weight_kg", "..."]
}
```

## 7. 获取记忆片段（可视化/调试）
**GET** `/api/users/{user_id}/memories?limit=10&offset=0`

响应体：
```json
{
  "items": [
    {"id":"m_001","text":"用户更喜欢晚间训练","timestamp":"2026-03-01","metadata":{"source":"user"}}
  ]
}
```

## 8. 新增记忆片段（显式记忆）
**POST** `/api/users/{user_id}/memories`

请求体：
```json
{
  "text": "用户希望每周三不安排高强度训练",
  "metadata": {"source": "explicit"},
  "created_at": "2026-05-13T10:10:00Z"
}
```

响应体：
```json
{"ok": true}
```

## 9. 更新/删除记忆片段（可编辑）
**PATCH** `/api/users/{user_id}/memories/{record_id}`

请求体：
```json
{
  "text": "用户希望每周三不安排高强度训练（已确认）",
  "metadata": {"source": "explicit", "confirmed": "true"}
}
```

**DELETE** `/api/users/{user_id}/memories/{record_id}`

响应体：
```json
{"ok": true}
```

## 10. 会话管理（可选）
**POST** `/api/sessions`

请求体：
```json
{"user_id":"u_001"}
```

响应体：
```json
{"session_id":"s_123"}
```

## 11. 错误码约定
- 400: 参数缺失或格式错误
- 404: 用户或会话不存在
- 500: 服务器内部错误

## 12. 约束与备注
- `use_memory=false` 时仅用短期上下文生成。
- `top_k` 控制检索记忆条数，默认 3。
- 需要流式输出时，可新增 `/api/chat/stream`（SSE）。
- `/api/users/{user_id}/profile/schema` 返回标准字段清单，前端可据此渲染表单。
- 记忆可视化/编辑接口用于审核长期记忆质量。
