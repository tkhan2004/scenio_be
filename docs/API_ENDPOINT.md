# Scenio — API Endpoint Documentation

> **Base URL:** `http://localhost:3000/api`
> **Auth:** Tất cả endpoint (trừ `/auth/register`, `/auth/login`, `/auth/google`, `/auth/refresh`, `/auth/logout`) yêu cầu header `Authorization: Bearer <access_token>`
> **Response format chuẩn:**
> ```json
> { 
>   "success": true, 
>   "status": 200, 
>   "timestamp": "2024-03-24T10:00:00.000Z", 
>   "data": { ... } 
> } 
> ```
> Lỗi:
> ```json
> { 
>   "success": false, 
>   "status": 400, 
>   "timestamp": "2024-03-24T10:00:00.000Z", 
>   "error": { "code": "ERROR_CODE", "message": "..." } 
> }
> ```

---

## 1. Danh sách Endpoint (Tiến độ thực hiện)

| # | Method | Endpoint | Auth | Mô tả | Trạng thái |
|---|--------|----------|------|-------|------------|
| **AUTH** |
| 1 | POST | `/auth/register` | — | Đăng ký email + password | ✅ Done |
| 2 | POST | `/auth/login` | — | Đăng nhập email + password | ✅ Done |
| 3 | POST | `/auth/refresh` | — | Làm mới Access Token (theo `JWT_EXPIRES_IN`, mặc định 15p) | ✅ Done |
| 4 | POST | `/auth/logout` | — | Đăng xuất (hủy RefreshToken) | ✅ Done |
| 5 | GET | `/auth/verify-token` | ✓ | Kiểm tra token còn hợp lệ | ✅ Done |
| 6 | POST | `/auth/google` | — | Đăng nhập / đăng ký Google OAuth | ✅ Done |
| **HOME** |
| 7 | GET | `/home/dashboard` | ✓ | Tải dữ liệu tổng hợp (Trang chủ) | ✅ Done |
| **SCENES** |
| 8 | GET | `/scenes` | ✓ | Danh sách kịch bản (filter, paginate) | ✅ Done |
| 9 | GET | `/scenes/search` | ✓ | Tìm kiếm semantic bằng pgvector, fallback text search | ✅ Done |
| 10 | GET | `/scenes/recommend` | ✓ | Gợi ý hybrid vector + learning data, fallback heuristic | ✅ Done |
| 11 | GET | `/scenes/:id` | ✓ | Chi tiết kịch bản đầy đủ | ✅ Done |
| 11a | GET | `/scenes/:id/voices` | ✓ | Quick-pick voices và advanced voice catalog cho scene | ✅ Done |
| **LEARNING PLAN** |
| 11b | GET | `/learning-plan/current` | ✓ | Lấy/tự tạo lộ trình học active cho user | ✅ Done |
| 11c | POST | `/learning-plan/generate` | ✓ | Tạo lộ trình mới từ onboarding, level test, session history | ✅ Done |
| 11d | POST | `/learning-plan/refresh` | ✓ | Archive plan cũ và tạo lộ trình mới | ✅ Done |
| 11e | PATCH | `/learning-plan/steps/:id/complete` | ✓ | Đánh dấu một bước trong lộ trình đã hoàn thành | ✅ Done |
| **SESSIONS** |
| 12 | POST | `/sessions/level-test` | ✓ | Bài kiểm tra trình độ AI (5 lượt) | ✅ Done |
| 13 | POST | `/sessions/start` | ✓ | Bắt đầu phiên học mới | ✅ Done |
| 13b | POST | `/sessions/start-custom` | ✓ | Tạo custom practice session từ structured brief | ✅ Done |
| 13a | POST | `/sessions/:id/realtime-token` | ✓ | Mint Realtime client secret cho session voice | ✅ Done |
| 14 | POST | `/sessions/:id/message` | ✓ | Đồng bộ finalized transcript/text turn | ✅ Done |
| 14a | POST | `/sessions/:id/complete` | ✓ | Kết thúc session và kích hoạt evaluator từ backend | ✅ Done |
| 15 | POST | `/sessions/:id/hint` | ✓ | Dùng hint (tối đa 3 hint/phiên) | ✅ Done |
| 16 | GET | `/sessions/:id/result` | ✓ | Lấy kết quả & Transcript chi tiết | ✅ Done |
| 17 | PATCH | `/sessions/:id/abandon` | ✓ | Thoát phiên giữa chừng | ✅ Done |
| **USERS** |
| 18 | GET | `/users/me` | ✓ | Lấy thông tin Profile cá nhân | ✅ Done |
| 18a | PATCH | `/users/me/onboarding` | ✓ | Lưu kết quả onboarding survey | ✅ Done |
| 19 | PATCH | `/users/me` | ✓ | Cập nhật displayName, avatarUrl | ✅ Done |
| 20 | POST | `/users/xp` | ✓ | Cộng XP + cập nhật streak + missions | ✅ Done |
| 21 | GET | `/users/progress` | ✓ | Thống kê học tập (XP/Skill chart) | ✅ Done |
| 22 | GET | `/users/badges` | ✓ | Danh sách Achievements/Badges | ✅ Done |
| **MISSIONS** |
| 23 | GET | `/missions/today` | ✓ | Danh sách nhiệm vụ hằng ngày | ✅ Done |
| **VOCABULARY** |
| 24 | GET | `/vocabulary` | ✓ | Từ điển tổng hợp của user | ✅ Done |
| 24a | GET | `/vocabulary/decks` | ✓ | Danh sách deck từ vựng theo session | ✅ Done |
| 24b | GET | `/vocabulary/decks/:sessionId` | ✓ | Chi tiết words nằm trong một deck session | ✅ Done |
| 25 | POST | `/vocabulary` | ✓ | Save từ vào dictionary + occurrence theo session | ✅ Done |
| 25a | POST | `/vocabulary/:id/review` | ✓ | Submit kết quả review SRS cho một từ | ✅ Done |
| 26 | DELETE | `/vocabulary/:id` | ✓ | Xóa từ khỏi danh sách học | ✅ Done |
| **VOICES** |
| 27 | GET | `/voices` | ✓ | Voice catalog active có filter và phân trang | ✅ Done |
| 28 | GET | `/voices/:id` | ✓ | Chi tiết một voice profile active | ✅ Done |
| 29 | POST | `/voices/preview` | ✓ | Sinh audio preview cho voice profile | ✅ Done |
| **ADMIN** |
| 30q | GET | `/admin/ai-models` | ✓ | AI model catalog và active setting theo feature | ✅ Done |
| 30r | POST | `/admin/ai-models/:id/benchmark` | ✓ | Benchmark model để so sánh latency/output | ✅ Done |
| 30s | PATCH | `/admin/ai-models/:id/connect` | ✓ | Connect và chọn model active cho feature | ✅ Done |
| 30a | GET | `/admin/overview` | ✓ | KPI và chart data cho admin dashboard | ✅ Done |
| 30 | GET | `/admin/users` | ✓ | Danh sách learner cho admin dashboard | ✅ Done |
| 30g | GET | `/admin/users/:id` | ✓ | Chi tiết learner cho admin drawer | ✅ Done |
| 30h | GET | `/admin/users/:id/sessions` | ✓ | Lịch sử sessions của learner | ✅ Done |
| 30b | GET | `/admin/scenes` | ✓ | Danh sách scene cho admin scene table | ✅ Done |
| 30c | GET | `/admin/scenes/:id` | ✓ | Chi tiết scene cho admin edit drawer | ✅ Done |
| 30d | POST | `/admin/scenes` | ✓ | Tạo scene mới từ admin form | ✅ Done |
| 30e | PATCH | `/admin/scenes/:id` | ✓ | Cập nhật scene hiện có | ✅ Done |
| 30f | PATCH | `/admin/scenes/:id/toggle` | ✓ | Bật/tắt trạng thái active của scene | ✅ Done |
| 30i | GET | `/admin/missions` | ✓ | Danh sách mission template cho admin | ✅ Done |
| 30j | POST | `/admin/missions` | ✓ | Tạo mission template mới | ✅ Done |
| 30k | PATCH | `/admin/missions/:id` | ✓ | Cập nhật mission template hiện có | ✅ Done |
| 30l | PATCH | `/admin/missions/:id/toggle` | ✓ | Bật/tắt trạng thái active của mission | ✅ Done |
| 30m | GET | `/admin/badges` | ✓ | Danh sách badge cho admin | ✅ Done |
| 30n | PATCH | `/admin/badges/:id/toggle` | ✓ | Bật/tắt trạng thái active của badge | ✅ Done |
| 30o | GET | `/admin/voices` | ✓ | Voice catalog cho admin | ✅ Done |
| 30p | PATCH | `/admin/voices/:id/toggle` | ✓ | Bật/tắt trạng thái active của voice | ✅ Done |

---

## 2. Chi tiết Auth Module (Hệ thống Dual-Token)

*(Tất cả API dưới đây đều nằm trong Module Auth đã được triển khai)*

### 1. Register [POST] `/auth/register`
**Body:** `{ "email": "...", "password": "...", "displayName": "..." }`
**Data trả về:** `{ "accessToken": "...", "refreshToken": "...", "user": { ... }, "isNewUser": true, "needsLevelTest": true, "needsOnboarding": true }`

### 2. Login [POST] `/auth/login`
**Body:** `{ "email": "...", "password": "..." }`
**Data trả về:** `{ "accessToken": "...", "refreshToken": "...", "user": { ... }, "isNewUser": false, "needsLevelTest": false, "needsOnboarding": false }`

### 3. Refresh [POST] `/auth/refresh`
**Body:** `{ "refreshToken": "..." }`
**Data trả về:** `{ "accessToken": "..." }`

### 4. Logout [POST] `/auth/logout`
**Body:** `{ "refreshToken": "..." }`
**Behavior:** Xóa RefreshToken trong DB để hủy phiên đăng nhập.

### 5. Verify Token [GET] `/auth/verify-token`
**Header:** `Authorization: Bearer <accessToken>`
**Data trả về:** `{ "user": { ..., "needsLevelTest": false, "needsOnboarding": false } }`

### 6. Google Login [POST] `/auth/google`
**Body:** `{ "idToken": "..." }`
**Data trả về:** `{ "accessToken": "...", "refreshToken": "...", "user": { ... }, "isNewUser": true, "needsLevelTest": true, "needsOnboarding": true }`

---

## 3. Chi tiết Business Logic (Dựa trên bản thiết kế gốc)

### 7. GET `/home/dashboard`
Tải toàn bộ dữ liệu trang chủ trong **1 request duy nhất** để tránh waterfall.

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "user": {
      "id": "uuid",
      "email": "learner@scenio.dev",
      "displayName": "Scenio Learner",
      "avatarUrl": null,
      "level": "A2",
      "totalXp": 320,
      "streakDays": 7
    },
    "missions": [
      { "id": "uuid", "title": "Complete 1 scene today", "target": 1, "current": 0, "xp": 50, "isCompleted": false }
    ],
    "inProgressSession": {
      "id": "uuid",
      "sourceType": "CURATED_SCENE",
      "sceneTitle": "At the Coffee Shop",
      "characterName": "Mia",
      "startedAt": "2025-03-31T08:00:00Z"
    },
    "recommendedScenes": [
      {
        "id": "uuid",
        "title": "At the Coffee Shop",
        "category": "DAILY",
        "difficulty": "A2",
        "estimatedMinutes": 6,
        "characterName": "Mia"
      }
    ]
  }
}
```

> **Ghi chú hiện trạng:** Implementation hiện tại gợi ý scene theo `user.level` rồi fallback sang scene active; chưa trả về `bestScore` hay vector-ranking ở endpoint này.

### 8. GET `/scenes`
Lấy danh sách scene active, hỗ trợ filter và phân trang.

**Query**
- `category`: `WORK | TRAVEL | DAILY | SOCIAL` (optional)
- `difficulty`: `A1 | A2 | B1 | B2` (optional)
- `page`: số trang, mặc định `1`
- `limit`: số item mỗi trang, mặc định `10`, tối đa `50`

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "retrievalMode": "VECTOR",
    "scenes": [
      {
        "id": "uuid",
        "title": "At the Coffee Shop",
        "category": "DAILY",
        "description": "Order a drink and ask follow-up questions politely.",
        "difficulty": "A2",
        "estimatedMinutes": 6,
        "characterName": "Mia",
        "characterRole": "Barista"
      }
    ],
    "total": 2,
    "page": 1,
    "limit": 10
  }
}
```

### 9. GET `/scenes/search`
Tìm scene cho user hiện tại. Backend ưu tiên semantic search bằng pgvector; nếu chưa có embedding key, chưa backfill vector, hoặc pgvector không khả dụng thì tự fallback về text search PostgreSQL.

**Query**
- `q`: từ khóa tìm kiếm
- `limit`: số kết quả tối đa, mặc định `5`, tối đa `20`

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "scenes": [
      {
        "id": "uuid",
        "title": "Airport Check-in",
        "category": "TRAVEL",
        "description": "Check in luggage and ask about gate, boarding time, and seat.",
        "difficulty": "A2",
        "estimatedMinutes": 7,
        "characterName": "David",
        "characterRole": "Check-in Staff",
        "retrievalMode": "VECTOR",
        "similarity": 0.86,
        "matchReason": "Matched semantically by pgvector"
      }
    ]
  }
}
```

### 10. GET `/scenes/recommend`
Gợi ý scene cho bước học tiếp theo dựa trên level, goal, session history, weak skill và semantic vector. Nếu vector search lỗi hoặc chưa có embedding data thì fallback về heuristic DB-only.

**Query**
- `limit`: số kết quả tối đa, mặc định `5`, tối đa `20`

**Logic**
- Lấy 5 completed sessions gần nhất của user.
- Suy ra skill yếu nhất từ `grammar`, `vocabulary`, `naturalness`.
- Fallback sang `selfAssessment` nếu user chưa có completed session.
- Build query học tập từ level, goal và weak skill để search pgvector.
- Rank scene theo vector similarity + `learningGoal`, category ưu tiên theo weak skill, độ gần level và vocabulary count.

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "retrievalMode": "HYBRID_VECTOR",
    "focusSkill": "VOCABULARY",
    "scenes": [
      {
        "id": "uuid",
        "title": "At the Restaurant",
        "category": "DAILY",
        "description": "Order food and drinks, ask for a recommendation, and request the bill politely.",
        "difficulty": "A2",
        "estimatedMinutes": 6,
        "characterName": "Jake",
        "characterRole": "Waiter",
        "retrievalMode": "HYBRID_VECTOR",
        "focusSkill": "VOCABULARY",
        "score": 0.78,
        "matchReason": "Recommended from weak skill, level fit, and vector similarity"
      }
    ]
  }
}
```

### 11b. GET `/learning-plan/current`
Lấy active learning plan hiện tại. Nếu user chưa có plan, backend tự generate một plan rule-based từ onboarding, level, session history và scene recommendation.

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "plan": {
      "id": "uuid",
      "status": "ACTIVE",
      "title": "A2 travel speaking plan",
      "summary": "Focus on vocabulary with 4 practice sessions this week.",
      "level": "A2",
      "learningGoal": "TRAVEL",
      "studyFrequency": "4 times/week",
      "focusSkill": "VOCABULARY",
      "weeklyTarget": 4,
      "generatedBy": "RULE",
      "sourceSnapshot": {
        "selfAssessment": "VOCABULARY",
        "recentSessionCount": 3
      }
    },
    "steps": [
      {
        "id": "uuid",
        "sceneId": "uuid",
        "type": "SCENE",
        "status": "NEXT",
        "focusSkill": "VOCABULARY",
        "title": "Airport Check-in",
        "description": "Check in luggage and ask about gate, boarding time, and seat.",
        "reason": "Recommended from weak skill, level fit, and vector similarity",
        "sortOrder": 1,
        "targetCount": 1,
        "completedCount": 0,
        "metadata": {
          "retrievalMode": "HYBRID_VECTOR",
          "score": 0.78,
          "similarity": 0.84
        },
        "scene": {
          "id": "uuid",
          "title": "Airport Check-in",
          "category": "TRAVEL",
          "difficulty": "A2",
          "estimatedMinutes": 7,
          "characterName": "David",
          "characterRole": "Check-in Staff"
        }
      }
    ],
    "nextStep": {
      "id": "uuid",
      "type": "SCENE",
      "sceneId": "uuid",
      "title": "Airport Check-in",
      "focusSkill": "VOCABULARY"
    }
  }
}
```

### 11c. POST `/learning-plan/generate`
Archive active plan cũ và tạo một learning plan mới. Dùng khi user vừa hoàn tất onboarding/level test hoặc muốn tạo lại lộ trình từ dữ liệu hiện tại.

**Response 201:** cùng shape với `GET /learning-plan/current`.

### 11d. POST `/learning-plan/refresh`
Làm mới lộ trình chủ động từ client. Backend archive plan cũ rồi generate plan mới.

**Response 200:** cùng shape với `GET /learning-plan/current`.

### 11e. PATCH `/learning-plan/steps/:id/complete`
Đánh dấu một step thuộc plan của user là completed. Backend tự unlock step kế tiếp nếu cần.

**Response 200:** cùng shape với `GET /learning-plan/current`.

### 11. GET `/scenes/:id`
Lấy chi tiết đầy đủ của một scene active để hiển thị màn hình scene detail.

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "scene": {
      "id": "uuid",
      "title": "At the Restaurant",
      "category": "DAILY",
      "description": "Order food and drinks, ask for a recommendation, and request the bill politely.",
      "missionText": "Finish a full restaurant interaction from ordering to paying.",
      "difficulty": "A2",
      "estimatedMinutes": 6,
      "characterName": "Jake",
      "characterRole": "Waiter",
      "vocabulary": [
        {
          "id": "uuid",
          "word": "menu",
          "definition": "the list of food and drinks available",
          "example": "Could I see the menu, please?",
          "sortOrder": 0
        }
      ]
    }
  }
}
```

### 11a. GET `/scenes/:id/voices`
Lấy quick-pick voices và advanced voice catalog cho scene detail / voice picker.

**Quy tắc hiện tại**
- Chỉ trả về scene `isActive = true`.
- `quickPicks` trả về preset nhanh kiểu `default`, `male`, `female`.
- `advancedVoices` trả về voice catalog active để user chọn nâng cao.

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "scene": {
      "id": "uuid",
      "title": "Airport Check-in",
      "category": "TRAVEL",
      "characterName": "David",
      "characterRole": "Check-in Staff"
    },
    "quickPicks": {
      "default": {
        "id": "uuid",
        "displayName": "Ken - Polite Airport Staff",
        "gender": "MALE",
        "locale": "en-US",
        "accent": "American"
      },
      "male": {
        "id": "uuid",
        "displayName": "Ken - Polite Airport Staff",
        "gender": "MALE",
        "locale": "en-US",
        "accent": "American"
      },
      "female": {
        "id": "uuid",
        "displayName": "Anna - Warm Receptionist",
        "gender": "FEMALE",
        "locale": "en-US",
        "accent": "American"
      }
    },
    "advancedVoices": [
      {
        "id": "uuid",
        "displayName": "Anna - Warm Receptionist",
        "description": "Female voice for welcoming hospitality and front-desk scenes.",
        "gender": "FEMALE",
        "locale": "en-US",
        "accent": "American",
        "styleTags": ["warm", "helpful", "hospitality"]
      }
    ]
  }
}
```

---

### 12. POST `/sessions/level-test`
Xử lý từng lượt của bài test trình độ (Chat 5 lượt).

**Request body**
```json
{
  "message": "I usually study English after work.",
  "turnIndex": 2,
  "history": [
    { "role": "AI", "content": "Hi! I'm Alex. What's your name?" },
    { "role": "USER", "content": "My name is Khang." }
  ]
}
```

**Logic:** Lượt cuối (`turnIndex == 5`), AI Engine sẽ trả về JSON chứa `level` (A1-C2) và `rationale`.
**Response 200 (Turn 5):**
```json
{
  "success": true,
  "data": {
    "aiMessage": "Great discussion! Based on our conversation...",
    "isComplete": true,
    "level": "B1",
    "rationale": "Dùng được câu phức nhưng còn thiếu từ vựng chuyên sâu."
  }
}
```

### 13. POST `/sessions/start`
Tạo một session `ACTIVE` mới và trả opening message đầu tiên để frontend mở màn chat ngay, chưa cần gọi LLM roleplay.

**Request body**
```json
{
  "sceneId": "uuid",
  "voiceProfileId": "uuid",
  "modality": "VOICE"
}
```

**Quy tắc hiện tại**
- Chỉ cho phép một session `ACTIVE` tại một thời điểm cho mỗi user.
- `voiceProfileId` là optional; nếu không truyền, backend tự resolve theo scene preset.
- Voice selection policy hiện là:
  - `voiceProfileId` nếu user explicit chọn
  - `scene default preset`
  - `scene female/male preset`
  - fallback sang một active voice bất kỳ nếu scene chưa có preset khả dụng
- `modality` hỗ trợ `TEXT` hoặc `VOICE`.
- Opening message hiện là template deterministic theo `scene.category`, `characterName` và `characterRole`.
- Message mở đầu được lưu luôn vào bảng `messages` với `turnIndex = 0`.

**Response 201**
```json
{
  "success": true,
  "status": 201,
  "data": {
    "sessionId": "uuid",
    "openingMessage": "Hi, I'm Mia, the Barista. Hi there. What would you like to do today?",
    "modality": "VOICE",
    "selectedVoice": {
      "id": "uuid",
      "displayName": "Mia - Cheerful Cafe Clerk",
      "gender": "FEMALE",
      "locale": "en-US",
      "accent": "American",
      "realtimeVoiceId": "verse"
    },
    "voiceSelection": {
      "source": "SCENE_DEFAULT_PRESET",
      "usedFallback": false,
      "scenePresetSlot": "default",
      "requested": {
        "voiceProfileId": null,
        "gender": null,
        "accentPreference": null,
        "voiceTone": null
      },
      "matched": {
        "gender": "FEMALE",
        "accent": "American",
        "tone": null
      }
    }
  }
}
```

### 13b. POST `/sessions/start-custom`
Tạo một session `ACTIVE` từ structured brief của user, không cần `sceneId`.

**Request body**
```json
{
  "practiceGoal": "Luyện phỏng vấn vị trí frontend intern",
  "successOutcome": "Tự tin giới thiệu bản thân và trả lời về dự án cá nhân",
  "topicSummary": "Buổi phỏng vấn online 15 phút với HR công ty công nghệ",
  "context": {
    "contextType": "INTERVIEW",
    "location": "Online video call",
    "conversationChannel": "VIDEO_CALL",
    "timePressure": "MEDIUM",
    "specialConditions": ["Professional setting", "Need concise answers"]
  },
  "userProfile": {
    "userRole": "Frontend intern candidate",
    "userIntent": "Show confidence and explain project experience clearly",
    "userEnglishLevel": "B1",
    "userPersonaNotes": "Hay bị run khi trả lời câu hỏi bất ngờ"
  },
  "aiPersona": {
    "aiRole": "HR recruiter",
    "aiDisplayName": "Emma",
    "aiRelationshipToUser": "INTERVIEWER",
    "aiPrimaryGoal": "Evaluate communication and role fit",
    "aiBehaviorStyle": "Professional but friendly",
    "aiGenderPresentation": "FEMALE",
    "aiVoicePresetId": "uuid",
    "aiVoiceTone": "CONFIDENT",
    "aiSpeechSpeed": "NORMAL",
    "aiAccentPreference": "US"
  },
  "learningConfig": {
    "difficulty": "B1",
    "conversationLength": "MEDIUM",
    "correctionStyle": "END_ONLY",
    "hintFrequency": "LOW",
    "responseComplexity": "BALANCED",
    "focusSkills": ["Self introduction", "Project explanation"],
    "mustUseVocabulary": ["internship", "responsive design"],
    "avoidTopics": [],
    "customInstructions": "Hãy giữ vai HR xuyên suốt và hỏi tiếp nối tự nhiên."
  },
  "modality": "TEXT"
}
```

**Quy tắc hiện tại**
- Không cần `sceneId`.
- Backend lưu `custom_practice_configs` rồi tạo session với `sourceType = CUSTOM_PRACTICE`.
- Chỉ cho phép một session `ACTIVE` tại một thời điểm cho mỗi user.
- Voice selection policy hiện là:
  - `aiVoicePresetId` nếu explicit chọn
  - rule-based match theo `aiGenderPresentation`, `aiAccentPreference`, `aiVoiceTone`
  - fallback sang một active voice bất kỳ nếu không có match tốt
- Opening message hiện là deterministic, không cần LLM để mở đầu.

**Response 201**
```json
{
  "success": true,
  "status": 201,
  "data": {
    "sessionId": "uuid",
    "sourceType": "CUSTOM_PRACTICE",
    "openingMessage": "Hi, I'm Emma, the HR recruiter. Thanks for joining this call. Could you start by introducing yourself?",
    "modality": "TEXT",
    "customPractice": {
      "id": "uuid",
      "displayTitle": "Buổi phỏng vấn online 15 phút với HR công ty công nghệ",
      "displaySubtitle": "You are speaking with Emma, a HR recruiter.",
      "contextType": "INTERVIEW",
      "difficulty": "B1",
      "topicSummary": "Buổi phỏng vấn online 15 phút với HR công ty công nghệ",
      "missionText": "Tự tin giới thiệu bản thân và trả lời về dự án cá nhân",
      "estimatedMinutes": 12,
      "aiPersona": {
        "displayName": "Emma",
        "role": "HR recruiter",
        "behaviorStyle": "Professional but friendly",
        "genderPresentation": "FEMALE",
        "voiceTone": "CONFIDENT",
        "accentPreference": "US"
      }
    },
    "selectedVoice": {
      "id": "uuid",
      "displayName": "Emma HR Warm",
      "gender": "FEMALE",
      "locale": "en-US",
      "accent": "American",
      "realtimeVoiceId": "alloy"
    },
    "voiceSelection": {
      "source": "CUSTOM_RULE_BASED",
      "usedFallback": false,
      "scenePresetSlot": null,
      "requested": {
        "voiceProfileId": null,
        "gender": "FEMALE",
        "accentPreference": "US",
        "voiceTone": "CONFIDENT"
      },
      "matched": {
        "gender": "FEMALE",
        "accent": "American",
        "tone": "CONFIDENT"
      }
    }
  }
}
```

### 13a. POST `/sessions/:id/realtime-token`
Mint Realtime client secret cho WebRTC client của session voice.

**Quy tắc hiện tại**
- Chỉ owner của session mới được gọi.
- Session phải đang `ACTIVE`.
- Session phải có voice profile hợp lệ với `realtimeVoiceId`.
- Backend build instructions từ scene + level + mission + selected voice, rồi gọi OpenAI Realtime để mint client secret ngắn hạn.
- Response hiện trả kèm `transport`, `transcriptStrategy`, và `eventModel` để mobile sync voice transcript theo cùng một contract.

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "sessionId": "uuid",
    "modality": "VOICE",
    "realtimeProvider": "OPENAI",
    "clientSecret": {
      "value": "ek_xxx",
      "expiresAt": 1756310470
    },
    "sessionConfig": {
      "model": "gpt-realtime",
      "voice": "verse",
      "transcriptionModel": "gpt-4o-mini-transcribe",
      "turnDetection": "server_vad",
      "outputModalities": ["audio", "text"],
      "instructions": "You are roleplaying as Mia...",
      "transport": {
        "type": "WEBRTC_DIRECT",
        "turnDetection": "server_vad",
        "transcriptionModel": "gpt-4o-mini-transcribe",
        "inputAudioFormat": "audio/pcm@24000",
        "outputAudioFormat": "audio/pcm@24000"
      },
      "transcriptStrategy": {
        "partialTranscript": "IGNORE",
        "finalTranscript": "STORE_AND_EVALUATE",
        "syncEndpoint": "/api/sessions/:id/message",
        "completionEndpoint": "/api/sessions/:id/complete"
      },
      "eventModel": {
        "userAudioSource": "USER_AUDIO",
        "aiAudioSource": "AI_AUDIO",
        "finalOnlySync": true,
        "providerSessionIdField": "providerSessionId"
      }
    },
    "selectedVoice": {
      "id": "uuid",
      "displayName": "Mia - Cheerful Cafe Clerk",
      "gender": "FEMALE",
      "locale": "en-US",
      "accent": "American",
      "realtimeVoiceId": "verse"
    }
  }
}
```

### 14. POST `/sessions/:id/message`
Đồng bộ finalized transcript hoặc text turn từ client về backend session.

**Request body**
```json
{
  "source": "USER_AUDIO",
  "content": "Could you tell me where the gate is?",
  "providerEventId": "event_123",
  "isFinal": true,
  "audioStartMs": 1200,
  "audioEndMs": 3500,
  "completeSession": {}
}
```

**Quy tắc hiện tại**
- `source` hỗ trợ `USER_TEXT`, `USER_AUDIO`, `AI_TEXT`, `AI_AUDIO`.
- Nếu `isFinal = false`, backend bỏ qua để tránh lưu partial transcript.
- `providerEventId` được dùng để xử lý idempotent khi client retry.
- Backend chuẩn hóa transcript whitespace/punctuation cơ bản trước khi lưu để evaluator và result screen ổn định hơn.
- Nếu có `completeSession`, backend xem đây là **legacy tín hiệu kết thúc session** để giữ tương thích với client cũ.
- Từ thời điểm này, backend sẽ:
  - chấm lại transcript bằng evaluator riêng
  - tự tính `grammarScore`, `vocabularyScore`, `naturalnessScore`
  - tự tính `xpEarned`
  - tự populate feedback fields cho các `USER` messages
  - tự grant XP / missions / badges trong cùng reward flow
- Các score client truyền trong `completeSession` cũ được xem là legacy input, không còn là source of truth chính.

> **Khuyến nghị hiện tại:** client mới nên dùng `POST /sessions/:id/message` chỉ để sync transcript, sau đó gọi `POST /sessions/:id/complete` để kết thúc session rõ ràng hơn.

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "stored": true,
    "message": {
      "id": "uuid",
      "role": "USER",
      "content": "Could you tell me where the gate is?",
      "turnIndex": 3,
      "providerEventId": "event_123",
      "modality": "AUDIO_TRANSCRIPT",
      "audioStartMs": 1200,
      "audioEndMs": 3500,
      "isFinal": true,
      "hasError": false,
      "errorType": null,
      "originalPhrase": null,
      "suggestion": null,
      "explanation": null,
      "isGood": true,
      "isHint": false
    },
    "session": {
      "id": "uuid",
      "status": "COMPLETED",
      "endedAt": "2026-04-15T08:40:00.000Z"
    },
    "evaluation": {
      "mode": "AI",
      "scores": {
        "grammar": 85,
        "vocabulary": 78,
        "naturalness": 82
      }
    },
    "rewards": {
      "xpEarned": 60,
      "totalXp": 380,
      "streakDays": 8,
      "missionsCompleted": [
        {
          "id": "uuid",
          "missionId": "uuid",
          "title": "Complete 1 scene today",
          "description": "Finish one practice session.",
          "missionType": "COMPLETE_SCENE",
          "target": 1,
          "current": 1,
          "xp": 50,
          "completedAt": "2026-04-15T08:40:00.000Z"
        }
      ]
    }
  }
}
```

### 14a. POST `/sessions/:id/complete`
Kích hoạt flow hoàn tất session từ backend sau khi transcript final đã được sync xong.

**Request body**
```json
{}
```

**Quy tắc hiện tại**
- Chỉ owner của session mới được gọi.
- Chỉ session `ACTIVE` mới complete được.
- Session phải có ít nhất 1 `USER` final message, nếu không backend trả `SESSION_TRANSCRIPT_INSUFFICIENT`.
- Backend sẽ:
  - đọc toàn bộ final transcript
  - gọi evaluator để chấm `grammar`, `vocabulary`, `naturalness`
  - ghi feedback vào từng `USER` message
  - update session sang `COMPLETED`
  - grant XP / missions / badges

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "session": {
      "id": "uuid",
      "status": "COMPLETED",
      "endedAt": "2026-04-21T10:40:00.000Z"
    },
    "evaluation": {
      "mode": "AI",
      "scores": {
        "grammar": 84,
        "vocabulary": 80,
        "naturalness": 82
      }
    },
    "spokenCoaching": {
      "available": true,
      "mode": "TRANSCRIPT_BASED",
      "summary": "Bạn đang nói khá ổn trong ngữ cảnh này; bước tiếp theo là làm câu trả lời dài và tự nhiên hơn một chút.",
      "scores": {
        "expression": 81,
        "clarity": 83,
        "confidence": 74
      },
      "strengths": [
        "Cấu trúc câu tương đối ổn, ít lỗi ngữ pháp lớn.",
        "Cách diễn đạt nghe tự nhiên, khá giống hội thoại thật."
      ],
      "improvements": [
        "Mỗi lượt trả lời nên thêm một chi tiết nữa để nghe tự tin hơn."
      ],
      "turnHighlights": [
        {
          "messageId": "uuid",
          "turnIndex": 2,
          "content": "I need check in one bag.",
          "status": "NEEDS_WORK",
          "focus": "GRAMMAR",
          "note": "Thiếu động từ đúng dạng",
          "suggestion": "I need to check in one bag."
        }
      ],
      "behaviorSignals": {
        "userTurnCount": 5,
        "hintCount": 1,
        "averageWordsPerTurn": 8,
        "shortResponseCount": 1,
        "questionCount": 1
      },
      "note": "Đây là coaching dựa trên transcript và cách diễn đạt, chưa phải chấm phát âm."
    },
    "rewards": {
      "xpEarned": 61,
      "totalXp": 441,
      "streakDays": 5,
      "missionsCompleted": []
    }
  }
}
```

### 15. POST `/sessions/:id/hint`
Sinh một hint ngắn cho session `ACTIVE` hiện tại.

**Request body**
```json
{
  "focus": "conversation"
}
```

**Quy tắc hiện tại**
- Chỉ owner của session mới được gọi.
- Chỉ session `ACTIVE` mới xin hint được.
- Giới hạn tối đa 3 hint cho mỗi session.
- Backend ưu tiên gọi provider text để sinh hint ngắn; nếu provider lỗi thì fallback bằng hint deterministic.

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "message": {
      "id": "uuid",
      "role": "AI",
      "content": "Ask one short follow-up question about the boarding gate.",
      "turnIndex": 4,
      "modality": "TEXT",
      "isFinal": true,
      "isHint": true
    },
    "hintCount": 2
  }
}
```

### 16. GET `/sessions/:id/result`
Lấy kết quả của một session đã kết thúc. Endpoint này chưa phụ thuộc LLM, chỉ đọc transcript và score đã có trong DB.

**Quy tắc hiện tại**
- Chỉ owner của session mới đọc được kết quả.
- Nếu session còn `ACTIVE` thì trả `SESSION_NOT_FINISHED`.
- Session `COMPLETED` và `ABANDONED` đều đọc được.
- Với session `COMPLETED` đi qua flow `POST /sessions/:id/complete` hoặc legacy `completeSession` trong `/message`, backend đã tự chấm score và lưu feedback cho từng `USER` message.
- Ngoài 3 score cũ, backend còn trả `spokenCoaching` để mobile render feedback kiểu “câu vừa nói có tự nhiên, rõ ý, đủ tự tin chưa”.

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "session": {
      "id": "uuid",
      "sourceType": "CURATED_SCENE",
      "status": "COMPLETED",
      "modality": "VOICE",
      "voiceProvider": "OPENAI",
      "providerSessionId": "sess_xxx",
      "voiceSnapshotName": "Ken - Polite Airport Staff",
      "xpEarned": 60,
      "hintCount": 1,
      "startedAt": "2026-04-02T10:00:00.000Z",
      "endedAt": "2026-04-02T10:28:00.000Z",
      "voiceProfile": {
        "id": "uuid",
        "displayName": "Ken - Polite Airport Staff",
        "gender": "MALE",
        "locale": "en-US",
        "accent": "American",
        "realtimeVoiceId": "cedar"
      },
      "scene": {
        "id": "uuid",
        "title": "Airport Check-in",
        "category": "TRAVEL",
        "difficulty": "A2",
        "description": "Check in luggage and ask about gate, boarding time, and seat.",
        "characterName": "David",
        "characterRole": "Check-in Staff"
      },
      "customPractice": null,
      "sourceSummary": {
        "title": "Airport Check-in",
        "category": "TRAVEL",
        "difficulty": "A2",
        "description": "Check in luggage and ask about gate, boarding time, and seat.",
        "characterName": "David",
        "characterRole": "Check-in Staff"
      },
      "voiceLearning": {
        "available": true,
        "mode": "REALTIME_TRANSCRIPT",
        "realtimeProvider": "OPENAI",
        "providerSessionId": "sess_xxx",
        "voiceSnapshotName": "Ken - Polite Airport Staff",
        "transport": {
          "type": "WEBRTC_DIRECT",
          "turnDetection": "server_vad",
          "transcriptionModel": "gpt-4o-mini-transcribe",
          "inputAudioFormat": "audio/pcm@24000",
          "outputAudioFormat": "audio/pcm@24000"
        },
        "transcriptStrategy": {
          "partialTranscript": "IGNORE",
          "finalTranscript": "STORE_AND_EVALUATE",
          "syncEndpoint": "/api/sessions/:id/message",
          "completionEndpoint": "/api/sessions/:id/complete"
        },
        "eventModel": {
          "userAudioSource": "USER_AUDIO",
          "aiAudioSource": "AI_AUDIO",
          "finalOnlySync": true,
          "providerSessionIdField": "providerSessionId"
        },
        "speakingMetrics": {
          "userAudioTurns": 5,
          "aiAudioTurns": 5,
          "totalUserSpeechMs": 18200,
          "totalAiSpeechMs": 20100,
          "averageUserTurnDurationMs": 3640,
          "transcriptTimingCoverage": 100
        },
        "pronunciation": {
          "available": false,
          "mode": "NOT_IMPLEMENTED_YET",
          "score": null,
          "note": "Chưa có pronunciation assessment thật; hiện backend mới có transcript và audio timing foundation."
        }
      }
    },
    "messages": [
      {
        "id": "uuid",
        "role": "AI",
        "content": "Hello, how can I help you with your flight today?",
        "turnIndex": 0,
        "providerEventId": null,
        "modality": "TEXT",
        "audioStartMs": null,
        "audioEndMs": null,
        "isFinal": true,
        "hasError": null,
        "errorType": null,
        "originalPhrase": null,
        "suggestion": null,
        "explanation": null,
        "isGood": null,
        "feedbackDetails": null,
        "isHint": false,
        "createdAt": "2026-04-02T10:00:00.000Z"
      }
    ],
    "scores": {
      "grammar": 85,
      "vocabulary": 78,
      "naturalness": 82
    },
    "spokenCoaching": {
      "available": true,
      "mode": "TRANSCRIPT_BASED",
      "summary": "Bạn truyền được ý khá rõ, nhưng một vài lượt còn ngắn nên cảm giác chưa thật sự tự tin.",
      "scores": {
        "expression": 80,
        "clarity": 84,
        "confidence": 72
      },
      "strengths": [
        "Cấu trúc câu tương đối ổn, ít lỗi ngữ pháp lớn.",
        "Bạn biết dùng câu hỏi để giữ mạch hội thoại."
      ],
      "improvements": [
        "Mỗi lượt trả lời nên thêm một chi tiết nữa để nghe tự tin hơn."
      ],
      "turnHighlights": [
        {
          "messageId": "uuid",
          "turnIndex": 3,
          "content": "Can you tell me my gate?",
          "status": "NEEDS_WORK",
          "focus": "NATURALNESS",
          "note": "Câu này có thể diễn đạt tự nhiên và rõ hơn.",
          "suggestion": "Could you tell me which gate I should go to?"
        }
      ],
      "behaviorSignals": {
        "userTurnCount": 5,
        "hintCount": 1,
        "averageWordsPerTurn": 7,
        "shortResponseCount": 1,
        "questionCount": 2
      },
      "note": "Đây là coaching dựa trên transcript và cách diễn đạt, chưa phải chấm phát âm."
    },
    "nextLearningAction": {
      "type": "GRAMMAR_PRACTICE",
      "focus": "GRAMMAR",
      "title": "Practice cleaner sentence structure",
      "reason": "Grammar is your lowest score (72) with 2 grammar issue(s).",
      "ctaLabel": "Practice grammar",
      "suggestedSceneQuery": "Airport Check-in grammar follow-up"
    }
  }
}
```

### 17. PATCH `/sessions/:id/abandon`
Cho phép user thoát một session `ACTIVE` giữa chừng.

**Quy tắc hiện tại**
- Nếu session đang `ACTIVE`, backend cập nhật sang `ABANDONED` và set `endedAt`.
- Nếu session đã `ABANDONED`, endpoint xử lý idempotent và vẫn trả thành công.
- Nếu session đã `COMPLETED`, backend trả `SESSION_ALREADY_COMPLETED`.

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "updated": true,
    "status": "ABANDONED",
    "endedAt": "2026-04-03T18:08:00.000Z"
  }
}
```

### 18a. PATCH `/users/me/onboarding`
Lưu hoặc skip onboarding survey. Endpoint này luôn đánh dấu onboarding đã hoàn thành để tránh loop onboarding khi user chọn skip toàn bộ câu hỏi.

**Request body**
```json
{
  "learningGoal": "WORK",
  "studyFrequency": "REGULAR",
  "selfAssessment": "GRAMMAR"
}
```

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "updated": true
  }
}
```

### 18. GET `/users/me`
Lấy profile public đầy đủ của user hiện tại.

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "user": {
      "id": "uuid",
      "email": "learner@scenio.dev",
      "displayName": "Scenio Learner",
      "avatarUrl": null,
      "level": "A2",
      "learningGoal": "TRAVEL",
      "studyFrequency": "REGULAR",
      "selfAssessment": "GRAMMAR",
      "needsLevelTest": false,
      "levelTestedAt": "2026-03-28T00:00:00.000Z",
      "needsOnboarding": false,
      "totalXp": 320,
      "streakDays": 7
    }
  }
}
```

### 19. PATCH `/users/me`
Cập nhật các trường profile cơ bản của user hiện tại.

**Request body**
```json
{
  "displayName": "Khang Nguyen",
  "avatarUrl": "https://example.com/avatar.png"
}
```

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "user": {
      "id": "uuid",
      "email": "learner@scenio.dev",
      "displayName": "Khang Nguyen",
      "avatarUrl": "https://example.com/avatar.png",
      "level": "A2",
      "needsOnboarding": false
    }
  }
}
```

### 20. POST `/users/xp`
Cộng XP cho một session `COMPLETED`, đồng thời cập nhật streak, mission progress và badge reward nếu đủ điều kiện.

**Request body**
```json
{
  "sessionId": "uuid"
}
```

**Quy tắc hiện tại**
- Chỉ chấp nhận session `COMPLETED`.
- Dùng `Session.xpGrantedAt` để chống cộng XP lặp.
- Tự đảm bảo user có mission của ngày hiện tại trước khi grant XP.
- Có side effect lên `users.totalXp`, `users.streakDays`, `user_missions`, `user_badges`.

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "totalXp": 110,
    "streakDays": 1,
    "missionsCompleted": [
      {
        "id": "uuid",
        "missionId": "uuid",
        "title": "Complete 1 scene today",
        "description": "Finish one learning scene.",
        "missionType": "COMPLETE_SCENE",
        "target": 1,
        "current": 1,
        "xp": 50,
        "completedAt": "2026-04-04T14:13:00.000Z"
      }
    ]
  }
}
```

---

### 21. GET `/users/progress`
Thống kê phục vụ vẽ biểu đồ:
- `skillScores`: Điểm thành phần qua các buổi học.
- `weeklyXp`: Mảng XP tích lũy 7 ngày gần nhất.
- `sessionsHistory`: Danh sách session đã hoàn thành gần nhất.

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "summary": {
      "level": "A2",
      "totalXp": 320,
      "streakDays": 7,
      "lastActiveDate": "2026-04-04T00:00:00.000Z",
      "completedSessions": 2
    },
    "weeklyXp": [
      { "date": "2026-03-31", "xp": 0 },
      { "date": "2026-04-01", "xp": 0 },
      { "date": "2026-04-02", "xp": 60 }
    ],
    "skillScores": {
      "grammar": 85,
      "vocabulary": 78,
      "naturalness": 82
    },
    "sessionsHistory": [
      {
        "id": "uuid",
        "sourceType": "CURATED_SCENE",
        "sceneTitle": "Airport Check-in",
        "category": "TRAVEL",
        "difficulty": "A2",
        "startedAt": "2026-04-02T10:00:00.000Z",
        "endedAt": "2026-04-02T10:30:00.000Z",
        "xpEarned": 60,
        "hintCount": 0,
        "scores": {
          "grammar": 85,
          "vocabulary": 78,
          "naturalness": 82
        }
      }
    ]
  }
}
```

### 22. GET `/users/badges`
Lấy danh sách badges hiện có cùng trạng thái user đã nhận hay chưa.

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "summary": {
      "totalEarned": 2,
      "totalAvailable": 5
    },
    "badges": [
      {
        "id": "uuid",
        "title": "First Scene Complete",
        "description": "Complete your first practice scene.",
        "iconKey": "first_scene",
        "conditionType": "FIRST_SESSION",
        "conditionValue": 1,
        "xpReward": 30,
        "isEarned": true,
        "earnedAt": "2026-04-02T10:31:00.000Z"
      }
    ]
  }
}
```

### 23. GET `/missions/today`
Lấy daily missions của user trong ngày hiện tại. Nếu user chưa có mission record cho hôm nay, backend sẽ tự tạo theo `studyFrequency`.

**Quy tắc hiện tại**
- `LIGHT` → 2 missions
- `REGULAR` → 3 missions
- `INTENSIVE` → 4 missions

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "date": "2026-04-06",
    "missions": [
      {
        "id": "uuid",
        "missionId": "uuid",
        "title": "Complete 1 scene today",
        "description": "Finish one learning scene.",
        "missionType": "COMPLETE_SCENE",
        "target": 1,
        "current": 0,
        "xp": 50,
        "isCompleted": false,
        "completedAt": null,
        "date": "2026-04-06"
      }
    ]
  }
}
```

### 27. GET `/voices`
Lấy voice catalog active có filter và phân trang.

**Query params**
```json
{
  "search": "warm",
  "gender": "FEMALE",
  "page": 1,
  "limit": 10
}
```

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "summary": {
      "totalVoices": 6,
      "returnedVoices": 3,
      "search": "warm",
      "gender": "FEMALE"
    },
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 3,
      "totalPages": 1,
      "hasNext": false,
      "hasPrevious": false
    },
    "voices": [
      {
        "id": "uuid",
        "displayName": "Anna - Warm Receptionist",
        "description": "Female voice for welcoming hospitality and front-desk scenes.",
        "gender": "FEMALE",
        "locale": "en-US",
        "accent": "American",
        "styleTags": ["warm", "helpful", "hospitality"]
      }
    ]
  }
}
```

### 28. GET `/voices/:id`
Lấy chi tiết một voice profile active.

### 29. POST `/voices/preview`
Sinh audio preview cho voice profile được chọn.

**Request body**
```json
{
  "voiceId": "uuid",
  "text": "Hello, I am your voice partner for this scene."
}
```

**Quy tắc hiện tại**
- Ưu tiên synth preview bằng ElevenLabs nếu voice profile có `providerVoiceId`.
- Nếu ElevenLabs không khả dụng, backend fallback sang OpenAI TTS bằng `realtimeVoiceId`.
- Response là binary audio stream.

### 30q. GET `/admin/ai-models`
Lấy catalog AI model cho admin chọn provider/model theo feature.

**Query**
- `featureType`: `EMBEDDING | ROLEPLAY_LLM | EVALUATOR_LLM | REALTIME_VOICE | TTS | STT` (optional)

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "settings": [
      {
        "featureType": "EMBEDDING",
        "outputDimension": 1536,
        "activeModel": {
          "provider": "GOOGLE",
          "modelId": "gemini-embedding-2",
          "displayName": "Gemini Embedding 2"
        },
        "fallbackModels": [
          {
            "provider": "OPENAI",
            "modelId": "text-embedding-3-small",
            "displayName": "OpenAI Text Embedding 3 Small"
          }
        ]
      }
    ],
    "models": [
      {
        "id": "uuid",
        "featureType": "EMBEDDING",
        "provider": "GOOGLE",
        "modelId": "gemini-embedding-2",
        "displayName": "Gemini Embedding 2",
        "inputModalities": ["TEXT", "IMAGE", "AUDIO", "VIDEO", "PDF"],
        "outputType": "EMBEDDING",
        "dimensionOptions": [128, 768, 1536, 3072],
        "defaultDimension": 1536,
        "isSelected": true,
        "isFallback": false
      }
    ]
  }
}
```

### 30r. POST `/admin/ai-models/:id/benchmark`
Benchmark model mà không đổi active setting.

**Body**
```json
{
  "sampleText": "recommend a travel scene for airport check-in",
  "outputDimension": 1536
}
```

**Ghi chú**
- Với `featureType = EMBEDDING`, backend gọi provider thật và lưu latency/dimension.
- Gemini default hiện tại là `gemini-embedding-2` qua Gemini API.
- Với `ROLEPLAY_LLM` và `EVALUATOR_LLM`, backend gọi provider text thật bằng prompt ngắn và lưu latency.
- Với `REALTIME_VOICE`, `TTS`, và `STT`, backend kiểm tra provider/runtime readiness ở mức server-side.

### 30s. PATCH `/admin/ai-models/:id/connect`
Benchmark nhanh rồi chọn model làm active cho feature tương ứng.

**Body**
```json
{
  "outputDimension": 1536,
  "fallbackModelIds": ["uuid-openai-fallback", "uuid-gemini-fallback"],
  "benchmarkText": "find a daily English speaking scene",
  "config": {}
}
```

**Behavior**
- Nếu benchmark/connect thất bại, backend không đổi active setting.
- Nếu thành công, ghi vào `ai_feature_settings`.
- Embedding active setting sẽ được `src/config/embedding.ts` dùng để sinh vector.
- `fallbackModelIds` phải cùng `featureType`, đang active, và không được trùng primary model.
- Embedding, roleplay, evaluator, realtime/STT/TTS runtime đọc primary + fallback chain theo thứ tự admin cấu hình.
- Catalog seed hiện có các nhóm production/research-friendly: OpenAI GPT-5.x/GPT-4.1, Anthropic Claude 4.x/3.5, Google Gemini 3/2.5, OpenAI/Gemini embeddings, OpenAI realtime/STT/TTS, ElevenLabs TTS.

### 30a. GET `/admin/overview`
Lấy dữ liệu tổng quan cho admin dashboard, gồm KPI cards, level distribution, recent learners, và sessions by day.

**Quy tắc hiện tại**
- Chỉ user `isAdmin = true` mới gọi được.
- `activeToday` được tính theo `users.lastActiveDate` trong ngày hiện tại.
- `totalCustomPracticeSessions` đếm các session có `sourceType = CUSTOM_PRACTICE`.
- `totalVocabularySaved` đếm dictionary aggregate từ bảng `user_vocabulary`.
- `sessionsByDay` hiện bucket 7 ngày gần nhất theo `startedAt`.

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "summary": {
      "totalLearners": 128,
      "activeToday": 34,
      "totalScenes": 18,
      "totalCustomPracticeSessions": 42,
      "totalVocabularySaved": 964
    },
    "levelDistribution": [
      { "level": "A1", "count": 18 },
      { "level": "A2", "count": 57 },
      { "level": "B1", "count": 39 },
      { "level": "B2", "count": 14 }
    ],
    "recentLearners": [
      {
        "id": "uuid",
        "displayName": "Nguyen Khang",
        "email": "khang@example.com",
        "level": "A2",
        "createdAt": "2026-04-20T08:00:00.000Z"
      }
    ],
    "sessionsByDay": [
      { "date": "2026-04-14", "count": 12 },
      { "date": "2026-04-15", "count": 17 }
    ]
  }
}
```

### 30. GET `/admin/users`
Lấy danh sách learner cho admin dashboard. Endpoint này chỉ cho phép user có `isAdmin = true`.

**Query params**
```json
{
  "search": "learner",
  "page": 1,
  "limit": 10
}
```

**Quy tắc hiện tại**
- Chỉ trả về user `isAdmin = false`.
- Hỗ trợ search theo `email` hoặc `displayName`.
- Trả về dữ liệu an toàn cho client, không gồm password, googleId hay refresh token.

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "summary": {
      "totalUsers": 12,
      "returnedUsers": 10,
      "search": "learner"
    },
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 12,
      "totalPages": 2,
      "hasNext": true,
      "hasPrevious": false
    },
    "users": [
      {
        "id": "uuid",
        "email": "learner@scenio.dev",
        "displayName": "Scenio Learner",
        "avatarUrl": null,
        "level": "A2",
        "learningGoal": "TRAVEL",
        "studyFrequency": "REGULAR",
        "selfAssessment": "GRAMMAR",
        "needsLevelTest": false,
        "totalXp": 320,
        "streakDays": 7,
        "lastActiveDate": "2026-04-04T00:00:00.000Z",
        "createdAt": "2026-04-01T10:00:00.000Z",
        "updatedAt": "2026-04-04T12:00:00.000Z",
        "sessionsCount": 3
      }
    ]
  }
}
```

**Response 403**
```json
{
  "success": false,
  "status": 403,
  "error": {
    "code": "FORBIDDEN",
    "message": "Chỉ admin mới có quyền truy cập"
  }
}
```

### 30b. GET `/admin/scenes`
Lấy danh sách scene cho admin scene table, bao gồm cả scene inactive.

**Query params**
```json
{
  "search": "airport",
  "category": "TRAVEL",
  "difficulty": "A2",
  "isActive": true,
  "page": 1,
  "limit": 20
}
```

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "summary": {
      "totalScenes": 18,
      "activeScenes": 16,
      "inactiveScenes": 2,
      "returnedScenes": 5,
      "search": "airport",
      "category": "TRAVEL",
      "difficulty": "A2",
      "isActive": true
    },
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1,
      "hasNext": false,
      "hasPrevious": false
    },
    "scenes": [
      {
        "id": "uuid",
        "title": "Airport Check-in",
        "category": "TRAVEL",
        "difficulty": "A2",
        "estimatedMinutes": 7,
        "characterName": "David",
        "characterRole": "Check-in Staff",
        "isActive": true,
        "updatedAt": "2026-04-21T08:00:00.000Z",
        "sessionsCount": 24
      }
    ]
  }
}
```

### 30c. GET `/admin/scenes/:id`
Lấy chi tiết một scene cho admin edit drawer.

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "scene": {
      "id": "uuid",
      "title": "Airport Check-in",
      "category": "TRAVEL",
      "difficulty": "A2",
      "description": "Check in luggage and ask about gate, boarding time, and seat.",
      "missionText": "Complete the airport check-in conversation naturally.",
      "estimatedMinutes": 7,
      "characterName": "David",
      "characterRole": "Check-in Staff",
      "systemPrompt": "You are a polite airport check-in staff helping a passenger check in.",
      "isActive": true,
      "createdAt": "2026-04-01T08:00:00.000Z",
      "updatedAt": "2026-04-21T08:00:00.000Z",
      "sessionsCount": 24
    },
    "vocabulary": [
      {
        "id": "uuid",
        "word": "boarding pass",
        "definition": "thẻ lên máy bay",
        "example": "Can I see your boarding pass, please?",
        "sortOrder": 1
      }
    ],
    "voicePreset": {
      "defaultVoiceId": "uuid",
      "defaultMaleVoiceId": null,
      "defaultFemaleVoiceId": null
    }
  }
}
```

### 30d. POST `/admin/scenes`
Tạo scene mới từ admin form.

**Body**
```json
{
  "title": "Coffee Shop Order",
  "category": "DAILY",
  "difficulty": "A1",
  "description": "Order coffee and ask for recommendations.",
  "missionText": "Finish a simple cafe ordering conversation.",
  "estimatedMinutes": 5,
  "characterName": "Mia",
  "characterRole": "Barista",
  "systemPrompt": "You are a friendly barista helping a customer order coffee.",
  "isActive": true
}
```

**Quy tắc hiện tại**
- Nếu admin để trống `description`, `missionText`, `characterName`, `characterRole`, hoặc `systemPrompt`, backend sẽ tự sinh fallback để scene không bị unusable.
- Backend tự tạo `scene_voice_preset` đi kèm; nếu hệ thống có voice active thì gắn `defaultVoiceId` đầu tiên làm preset mặc định.

### 30e. PATCH `/admin/scenes/:id`
Cập nhật scene hiện có từ admin form.

**Body**
```json
{
  "title": "Coffee Shop Order",
  "missionText": "Finish a natural cafe ordering conversation.",
  "estimatedMinutes": 6,
  "isActive": true
}
```

### 30f. PATCH `/admin/scenes/:id/toggle`
Bật hoặc tắt trạng thái active của scene.

**Body**
```json
{
  "isActive": false
}
```

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "scene": {
      "id": "uuid",
      "isActive": false,
      "updatedAt": "2026-04-21T08:30:00.000Z"
    }
  }
}
```

### 30g. GET `/admin/users/:id`
Lấy chi tiết learner cho admin drawer.

**Quy tắc hiện tại**
- Chỉ user `isAdmin = true` mới gọi được.
- Chỉ trả về learner `isAdmin = false`.
- Response tách thành `user` và `summary` để FE dễ render theo tab/profile card.

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "user": {
      "id": "uuid",
      "email": "learner@scenio.dev",
      "displayName": "Scenio Learner",
      "avatarUrl": null,
      "level": "A2",
      "learningGoal": "TRAVEL",
      "studyFrequency": "REGULAR",
      "selfAssessment": "GRAMMAR",
      "needsLevelTest": false,
      "levelTestedAt": "2026-04-02T09:00:00.000Z",
      "totalXp": 320,
      "streakDays": 7,
      "lastActiveDate": "2026-04-19T00:00:00.000Z",
      "createdAt": "2026-04-01T08:00:00.000Z"
    },
    "summary": {
      "completedSessions": 5,
      "abandonedSessions": 1,
      "customPracticeSessions": 2,
      "savedVocabularyCount": 18,
      "earnedBadgesCount": 3
    }
  }
}
```

### 30h. GET `/admin/users/:id/sessions`
Lấy lịch sử session của learner cho tab `Sessions` trong admin drawer.

**Query**
- `page`: số trang, mặc định `1`
- `limit`: số item mỗi trang, mặc định `20`, tối đa `100`

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "total": 2,
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "sessions": [
      {
        "id": "uuid",
        "sourceType": "CURATED_SCENE",
        "title": "Airport Check-in",
        "status": "COMPLETED",
        "modality": "VOICE",
        "grammarScore": 85,
        "vocabularyScore": 78,
        "naturalnessScore": 82,
        "xpEarned": 60,
        "hintCount": 1,
        "startedAt": "2026-04-18T08:00:00.000Z",
        "endedAt": "2026-04-18T08:12:00.000Z"
      },
      {
        "id": "uuid",
        "sourceType": "CUSTOM_PRACTICE",
        "title": "Frontend Interview Practice",
        "status": "COMPLETED",
        "modality": "TEXT",
        "grammarScore": 80,
        "vocabularyScore": 75,
        "naturalnessScore": 79,
        "xpEarned": 55,
        "hintCount": 0,
        "startedAt": "2026-04-19T10:00:00.000Z",
        "endedAt": "2026-04-19T10:14:00.000Z"
      }
    ]
  }
}
```

### 30i. GET `/admin/missions`
Lấy danh sách mission template cho admin mission table.

**Quy tắc hiện tại**
- Trả về toàn bộ mission template trong hệ thống.
- Sắp xếp ưu tiên mission `isActive = true`, rồi theo `xpReward`, sau đó theo `title`.

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "missions": [
      {
        "id": "uuid",
        "title": "Complete 1 scene today",
        "description": "Finish one practice session.",
        "missionType": "COMPLETE_SCENE",
        "targetValue": 1,
        "xpReward": 50,
        "isActive": true
      },
      {
        "id": "uuid",
        "title": "Maintain a 3-day streak",
        "description": "Stay active for three consecutive days.",
        "missionType": "MAINTAIN_STREAK",
        "targetValue": 3,
        "xpReward": 40,
        "isActive": true
      }
    ]
  }
}
```

### 30j. POST `/admin/missions`
Tạo mission template mới.

**Body**
```json
{
  "title": "Achieve score 80",
  "description": "Reach at least 80 points in one session.",
  "missionType": "ACHIEVE_SCORE",
  "targetValue": 80,
  "xpReward": 60,
  "isActive": true
}
```

**Response 201**
```json
{
  "success": true,
  "status": 201,
  "data": {
    "mission": {
      "id": "uuid",
      "title": "Achieve score 80",
      "description": "Reach at least 80 points in one session.",
      "missionType": "ACHIEVE_SCORE",
      "targetValue": 80,
      "xpReward": 60,
      "isActive": true
    }
  }
}
```

### 30k. PATCH `/admin/missions/:id`
Cập nhật mission template hiện có.

**Body**
```json
{
  "title": "Achieve score 85",
  "targetValue": 85,
  "xpReward": 70,
  "isActive": true
}
```

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "mission": {
      "id": "uuid",
      "title": "Achieve score 85",
      "description": "Reach at least 80 points in one session.",
      "missionType": "ACHIEVE_SCORE",
      "targetValue": 85,
      "xpReward": 70,
      "isActive": true
    }
  }
}
```

### 30l. PATCH `/admin/missions/:id/toggle`
Bật hoặc tắt trạng thái active của mission template.

**Body**
```json
{
  "isActive": false
}
```

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "mission": {
      "id": "uuid",
      "isActive": false
    }
  }
}
```

### 30m. GET `/admin/badges`
Lấy danh sách badge cho admin badge table.

**Quy tắc hiện tại**
- Trả về toàn bộ badge trong hệ thống.
- Có thêm `earnedCount` để admin nhìn nhanh badge nào đang được learner nhận nhiều.

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "badges": [
      {
        "id": "uuid",
        "title": "First Session",
        "description": "Complete your first practice session.",
        "iconKey": "first_session",
        "conditionType": "FIRST_SESSION",
        "conditionValue": 1,
        "xpReward": 30,
        "isActive": true,
        "earnedCount": 12
      },
      {
        "id": "uuid",
        "title": "Vocabulary Builder",
        "description": "Save 20 words to your dictionary.",
        "iconKey": "vocab_builder",
        "conditionType": "VOCAB_SAVED",
        "conditionValue": 20,
        "xpReward": 60,
        "isActive": true,
        "earnedCount": 8
      }
    ]
  }
}
```

### 30n. PATCH `/admin/badges/:id/toggle`
Bật hoặc tắt trạng thái active của badge.

**Body**
```json
{
  "isActive": false
}
```

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "badge": {
      "id": "uuid",
      "isActive": false
    }
  }
}
```

### 30o. GET `/admin/voices`
Lấy voice catalog cho admin voice table.

**Quy tắc hiện tại**
- Trả về cả voice active và inactive.
- FE có thể dùng trực tiếp cho bảng voice mà không cần gọi thêm detail API.

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "voices": [
      {
        "id": "uuid",
        "displayName": "Emma HR Warm",
        "description": "Professional, warm, confident",
        "gender": "FEMALE",
        "locale": "en-US",
        "accent": "American",
        "provider": "ELEVENLABS",
        "realtimeProvider": "OPENAI",
        "latencyTier": "LOW",
        "styleTags": ["warm", "professional"],
        "sampleText": "Hello, I am your speaking partner today.",
        "sampleUrl": null,
        "isActive": true
      },
      {
        "id": "uuid",
        "displayName": "David Airport Calm",
        "description": "Calm, helpful, polite",
        "gender": "MALE",
        "locale": "en-GB",
        "accent": "British",
        "provider": "ELEVENLABS",
        "realtimeProvider": "OPENAI",
        "latencyTier": "LOW",
        "styleTags": ["calm", "helpful"],
        "sampleText": "Please place your luggage on the scale.",
        "sampleUrl": null,
        "isActive": true
      }
    ]
  }
}
```

### 30p. PATCH `/admin/voices/:id/toggle`
Bật hoặc tắt trạng thái active của voice profile.

**Body**
```json
{
  "isActive": false
}
```

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "voice": {
      "id": "uuid",
      "isActive": false
    }
  }
}
```

### 24. GET `/vocabulary`
Lấy **dictionary tổng hợp** của user hiện tại. Mỗi từ chỉ có một bản ghi duy nhất trong danh sách này, dù user có thể gặp lại cùng từ đó ở nhiều session khác nhau.

**Query**
- `page`: số trang, mặc định `1`
- `limit`: số item mỗi trang, mặc định `10`, tối đa `50`
- `isMastered`: `true | false` (optional)

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "vocabulary": [
      {
        "id": "uuid",
        "normalizedWord": "boarding pass",
        "word": "boarding pass",
        "definition": "the document that allows you to get on a plane",
        "example": "May I see your boarding pass, please?",
        "isMastered": false,
        "needsReview": true,
        "encounterCount": 2,
        "srsLevel": 0,
        "nextReviewAt": null,
        "savedAt": "2026-04-02T10:25:00.000Z",
        "lastSeenAt": "2026-04-05T09:10:00.000Z",
        "reviewedAt": null,
        "sourceSessionId": "uuid",
        "scene": {
          "id": "uuid",
          "title": "Airport Check-in",
          "category": "TRAVEL",
          "difficulty": "A2"
        },
        "latestOccurrence": {
          "id": "uuid",
          "sessionId": "uuid",
          "sampleSentence": "May I see your boarding pass, please?",
          "createdAt": "2026-04-05T09:10:00.000Z"
        }
      },
      {
        "id": "uuid",
        "normalizedWord": "queue number",
        "word": "queue number",
        "definition": "a number that shows your turn while waiting in line",
        "example": null,
        "isMastered": false,
        "needsReview": true,
        "encounterCount": 1,
        "srsLevel": 0,
        "nextReviewAt": null,
        "savedAt": "2026-04-02T10:26:00.000Z",
        "lastSeenAt": "2026-04-02T10:26:00.000Z",
        "reviewedAt": null,
        "sourceSessionId": "uuid",
        "scene": null,
        "latestOccurrence": null
      }
    ],
    "total": 2,
    "page": 1,
    "limit": 10
  }
}
```

### 24a. GET `/vocabulary/decks`
Lấy danh sách deck từ vựng theo session context. Đây là view "Context-Based Decks" để mobile hiển thị các khối hộp như "Quán Cafe", "Airport Check-in", "Nhà hàng"...

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "decks": [
      {
        "sessionId": "uuid",
        "scene": {
          "id": "uuid",
          "title": "Airport Check-in",
          "category": "TRAVEL",
          "difficulty": "A2",
          "characterName": "David",
          "characterRole": "Check-in Staff"
        },
        "sessionStatus": "COMPLETED",
        "startedAt": "2026-04-02T10:00:00.000Z",
        "endedAt": "2026-04-02T10:30:00.000Z",
        "wordsCount": 5,
        "masteredCount": 2,
        "dueWordsCount": 3,
        "completionPercent": 40,
        "latestEncounterAt": "2026-04-05T09:10:00.000Z"
      }
    ],
    "total": 1
  }
}
```

### 24b. GET `/vocabulary/decks/:sessionId`
Lấy chi tiết words nằm trong một deck session cụ thể.

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "deck": {
      "sessionId": "uuid",
      "scene": {
        "id": "uuid",
        "title": "Airport Check-in",
        "category": "TRAVEL",
        "difficulty": "A2",
        "characterName": "David",
        "characterRole": "Check-in Staff"
      },
      "sessionStatus": "COMPLETED",
      "startedAt": "2026-04-02T10:00:00.000Z",
      "endedAt": "2026-04-02T10:30:00.000Z",
      "wordsCount": 5,
      "masteredCount": 2,
      "dueWordsCount": 3,
      "completionPercent": 40
    },
    "words": [
      {
        "occurrenceId": "uuid",
        "vocabularyId": "uuid",
        "word": "boarding pass",
        "definition": "the document that allows you to get on a plane",
        "example": "May I see your boarding pass, please?",
        "sampleSentence": "May I see your boarding pass, please?",
        "isMastered": false,
        "needsReview": true,
        "encounterCount": 2,
        "srsLevel": 0,
        "nextReviewAt": null
      }
    ]
  }
}
```

### 25. POST `/vocabulary`
Save một từ vào dictionary tổng hợp. Nếu từ này đã có sẵn trong dictionary của user, backend **không coi là lỗi duplicate** nữa. Thay vào đó, nếu request đến từ một `sourceSessionId` mới, backend sẽ tạo thêm một `occurrence` để ghi nhận rằng user đã gặp lại từ đó trong ngữ cảnh mới.

**Request body - Auto save**
```json
{
  "sceneVocabularyId": "uuid",
  "sourceSessionId": "uuid",
  "sampleSentence": "May I see your boarding pass, please?"
}
```

**Request body - Manual save**
```json
{
  "word": "queue number",
  "definition": "a number that shows your turn while waiting in line",
  "sourceSessionId": "uuid",
  "sampleSentence": "Please wait until your queue number appears."
}
```

**Quy tắc hiện tại**
- Nếu có `sourceSessionId`, backend sẽ kiểm tra session đó thuộc user hiện tại.
- Dictionary tổng hợp chỉ tạo mới khi user chưa từng có từ đó.
- Nếu user đã có từ đó rồi nhưng gặp lại trong session mới, backend sẽ tạo thêm `occurrence` mới và tăng `encounterCount`.
- Mission `SAVE_VOCABULARY`, badge `VOCAB_SAVED`, và XP chỉ được cộng khi dictionary có **từ mới thật**, không phải mỗi lần gặp lại.

**Response 201**
```json
{
  "success": true,
  "status": 201,
  "data": {
    "vocabulary": {
      "id": "uuid",
      "normalizedWord": "queue number",
      "word": "queue number",
      "definition": "a number that shows your turn while waiting in line",
      "example": null,
      "isMastered": false,
      "needsReview": true,
      "encounterCount": 1,
      "srsLevel": 0,
      "nextReviewAt": null,
      "savedAt": "2026-04-04T15:00:00.000Z",
      "lastSeenAt": "2026-04-04T15:00:00.000Z",
      "reviewedAt": null,
      "sourceSessionId": "uuid",
      "scene": null,
      "latestOccurrence": null
    },
    "createdDictionary": true,
    "createdOccurrence": true
  }
}
```

### 25a. POST `/vocabulary/:id/review`
Submit kết quả review SRS cho một dictionary word.

**Request body**
```json
{
  "isDone": true,
  "recallQuality": 5
}
```

**Quy tắc hiện tại**
- Nếu `isDone = true`, backend tăng `srsLevel`, set `isMastered = true`, và tính `nextReviewAt`.
- Nếu `isDone = false` hoặc `recallQuality` thấp, backend hạ nhẹ SRS state và đẩy review gần hơn.
- `needsReview` được suy ra từ cặp `isMastered` + `nextReviewAt`.

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "vocabulary": {
      "id": "uuid",
      "word": "boarding pass",
      "isMastered": true,
      "needsReview": false,
      "srsLevel": 2,
      "nextReviewAt": "2026-04-24T10:00:00.000Z"
    },
    "review": {
      "isDone": true,
      "recallQuality": 5,
      "nextReviewAt": "2026-04-24T10:00:00.000Z",
      "nextSrsLevel": 2
    }
  }
}
```

### 26. DELETE `/vocabulary/:id`
Xóa một dictionary word khỏi danh sách học của user hiện tại. Các occurrence thuộc về từ đó sẽ bị xóa cascade.

**Response 200**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "deleted": true
  }
}
```

---

## 4. Bảng mã lỗi (Standardized Error Codes)
- `VALIDATION_ERROR` (400): Input không đúng định dạng Zod.
- `INVALID_CREDENTIALS` (401): Sai email hoặc mật khẩu.
- `UNAUTHORIZED` (401): Access Token hết hạn/sai.
- `FORBIDDEN` (403): Không có quyền truy cập (vd: Admin API).
- `NOT_FOUND` (404): Resource không tồn tại hoặc không thuộc quyền user hiện tại.
- `SCENE_NOT_FOUND` (404): ID kịch bản không hợp lệ.
- `SESSION_ALREADY_ACTIVE` (409): Người dùng đang có session `ACTIVE` khác chưa hoàn thành.
- `SESSION_NOT_FINISHED` (409): Chưa thể lấy result khi session vẫn còn `ACTIVE`.
- `SESSION_ALREADY_COMPLETED` (409): Không thể abandon một session đã `COMPLETED`.
- `SESSION_NOT_COMPLETED` (409): Chỉ có thể grant XP cho session đã `COMPLETED`.
- `AI_ENGINE_ERROR` (502): LLM Server gặp sự cố.
