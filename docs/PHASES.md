# Scenio Backend — Kế hoạch triển khai theo Phase

> **Mục đích:** Hướng dẫn thực hiện backend Express.js theo từng phase rõ ràng.
> Mỗi phase phải hoàn chỉnh và có thể test độc lập trước khi sang phase tiếp theo.
> Tài liệu gốc: `OVERVIEW.md` + `SYSTEM_DESIGN.md`

---

## Tổng quan các Phase

```
Phase 1 (Ngày 1–3):   Khởi tạo dự án & Infrastructure
Phase 2 (Ngày 4–7):   Database Schema & Auth Module
Phase 3 (Ngày 8–12):  Scene Module + Vector DB
Phase 4 (Ngày 13–18): Session Module + Roleplay Engine
Phase 5 (Ngày 19–22): User, Mission, Home Module
Phase 6 (Ngày 23–25): Admin Module + Seed Data
Phase 7 (Ngày 26–28): Testing, Refactor, Polish
```

---

## Phase 1 — Khởi tạo dự án & Infrastructure

**Mục tiêu:** Có một Express server chạy được, kết nối được DB, đọc được `.env`.

### Checklist

- [ ] Khởi tạo project Node.js với cấu trúc thư mục chuẩn
- [ ] Cài đặt dependencies
- [ ] Cấu hình `app.js` + `server.js`
- [ ] Cấu hình Prisma + kết nối PostgreSQL
- [ ] Viết `errorHandler` middleware
- [ ] Viết `response.js` utility (ok/fail)
- [ ] Cấu hình Docker Compose cho PostgreSQL + Chroma
- [ ] Tạo file `.env.example`
- [ ] Test: `GET /api/health` trả về `{ ok: true }`

### Cấu trúc thư mục cần tạo

```
scenio_be/
├── prisma/
│   ├── schema.prisma
│   └── seed.js
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   │   ├── database.js     # Prisma client singleton
│   │   ├── chroma.js       # ChromaDB client
│   │   └── llm.js          # LLM client factory
│   ├── middleware/
│   │   ├── auth.js         # JWT verify
│   │   ├── validate.js     # Zod schema validation
│   │   └── errorHandler.js # Global error handler
│   └── utils/
│       ├── response.js     # ok() / fail()
│       ├── jwt.js          # sign / verify helpers
│       └── prompts.js      # Prompt templates
├── .env
├── .env.example
├── docker-compose.yml
└── package.json
```

### Dependencies cần cài

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "dotenv": "^16.3.1",
    "@prisma/client": "^5.9.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.22.4",
    "chromadb": "^1.7.3",
    "@anthropic-ai/sdk": "^0.20.0",
    "openai": "^4.28.0"
  },
  "devDependencies": {
    "prisma": "^5.9.1",
    "nodemon": "^3.0.3"
  }
}
```

### docker-compose.yml

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: scenio_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  chroma:
    image: chromadb/chroma:0.4.24
    ports:
      - "8000:8000"
    volumes:
      - chroma_data:/chroma/chroma

volumes:
  postgres_data:
  chroma_data:
```

### API endpoint cần có cuối Phase 1

| Method | Endpoint | Response |
|--------|----------|---------|
| `GET` | `/api/health` | `{ ok: true, timestamp }` |

---

## Phase 2 — Database Schema & Auth Module

**Mục tiêu:** Schema hoàn chỉnh trong Prisma. Đăng nhập và xác thực JWT hoạt động.

### Checklist

- [ ] Viết đầy đủ `schema.prisma` (tất cả model: User, Scene, SceneVocabulary, Session, Message, DailyMission, UserMission)
- [ ] Chạy `prisma migrate dev` thành công
- [ ] Viết `auth.service.js` — login + verify token
- [ ] Viết `auth.controller.js`
- [ ] Viết `auth.routes.js`
- [ ] Viết `auth.js` middleware (bảo vệ route)
- [ ] Viết JWT helper (`utils/jwt.js`)
- [ ] Test: đăng nhập với email/password → nhận được JWT
- [ ] Test: gọi protected route với JWT hợp lệ → pass
- [ ] Test: gọi protected route với JWT sai → 401

### Prisma Schema (tóm tắt)

```
User        — id, email, passwordHash, displayName, level, totalXp, streakDays, isAdmin
Scene       — id, title, category, description, missionText, difficulty, characterName, characterRole, systemPrompt
SceneVocabulary — id, sceneId, word, definition, example
Session     — id, userId, sceneId, status, grammarScore, vocabularyScore, naturalnessScore, xpEarned
Message     — id, sessionId, role, content, turnIndex, feedbackData (JSONB)
DailyMission — id, title, missionType, targetValue, xpReward
UserMission — id, userId, missionId, date, isCompleted
```

> Chi tiết đầy đủ trong `BACKEND_SKILL.md` — Section 4.

### API endpoints cần có cuối Phase 2

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| `POST` | `/api/auth/login` | — | Đăng nhập email/pass |
| `GET` | `/api/auth/verify-token` | ✓ | Kiểm tra token hợp lệ |

---

## Phase 3 — Scene Module + Vector DB

**Mục tiêu:** CRUD scenes đầy đủ. Tìm kiếm semantic bằng Chroma hoạt động.

### Checklist

- [ ] Viết `chroma.js` — kết nối ChromaDB, getOrCreateCollection
- [ ] Viết `scenes.embedding.js`:
  - `upsertScene(scene)` — embed + lưu vào Chroma
  - `searchScenes(query, userLevel, limit)` — vector search
  - `deleteScene(sceneId)` — xóa khỏi Chroma
  - `sceneToText(scene)` — tạo text để embed
- [ ] Viết `llm.js` config — hỗ trợ Claude và OpenAI (factory pattern)
- [ ] Viết `scenes.service.js`:
  - `getScenes(filter)` — danh sách có phân trang, lọc category/difficulty
  - `getSceneById(id)` — chi tiết kèm vocabulary
  - `searchScenes(query, userId)` — lấy vector IDs → query PostgreSQL
  - `recommendScenes(userId)` — dựa trên skill score yếu nhất
- [ ] Viết `scenes.controller.js` + `scenes.routes.js`
- [ ] Validate input bằng Zod
- [ ] Test: tạo scene qua Admin route → scene xuất hiện trong DB và Chroma
- [ ] Test: tìm kiếm "job interview" → trả về scene liên quan

### Logic `recommendScenes`

1. Lấy average scores của user từ bảng `Session` (group by userId, lấy 5 session gần nhất)
2. Xác định kỹ năng yếu nhất (grammar / vocabulary / naturalness)
3. Query Chroma với keyword tương ứng kỹ năng yếu + filter theo level user
4. Trả về top 5 scenes

### API endpoints cần có cuối Phase 3

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| `GET` | `/api/scenes` | ✓ | Danh sách có filter |
| `GET` | `/api/scenes/search` | ✓ | Tìm kiếm ngữ nghĩa |
| `GET` | `/api/scenes/recommend` | ✓ | Gợi ý theo điểm yếu |
| `GET` | `/api/scenes/:id` | ✓ | Chi tiết kịch bản |

---

## Phase 4 — Session Module + Roleplay Engine

**Mục tiêu:** Core feature — hội thoại với AI, nhận phản hồi ngôn ngữ, detect mission complete.

### Checklist

- [ ] Viết `prompts.js` — tất cả prompt templates:
  - `buildSystemPrompt(scene)` — prompt nhân vật AI
  - `buildEvaluatorPrompt(userMessage, sceneContext, userLevel)` — đánh giá ngôn ngữ
  - `buildLevelTestPrompt()` — kiểm tra trình độ
- [ ] Viết `roleplay.engine.js`:
  - `callLLM(systemPrompt, messages)` — gọi Claude hoặc OpenAI
  - Hỗ trợ switch provider qua `LLM_PROVIDER` env var
- [ ] Viết `evaluator.js`:
  - `evaluateMessage(userMessage, sceneContext, userLevel)` → trả về FeedbackData JSON
  - Parse và validate JSON output từ LLM
  - Graceful fallback nếu LLM trả về JSON lỗi
- [ ] Viết `sessions.service.js`:
  - `startSession(userId, sceneId)` → tạo session + sinh opening message
  - `sendMessage(sessionId, userId, content)` → dual LLM call song song
  - `getSessionResult(sessionId, userId)` → kết quả + tất cả messages
  - `calculateScores(sessionId)` → tính điểm từ feedbackData
  - `startLevelTest(userId)` → tạo session level-test
  - `sendLevelTestMessage(sessionId, userId, message, turnIndex)` → xử lý từng lượt
- [ ] Viết `sessions.controller.js` + `sessions.routes.js`
- [ ] Test: start session → nhận opening message từ AI
- [ ] Test: send nhắn → nhận ai reply + feedbackData + missionComplete flag
- [ ] Test: sau 5 lượt level test → nhận level được phân loại

### Logic quan trọng — `sendMessage()`

```
1. Lấy session + scene + messages history từ DB
2. Kiểm tra session status === 'active'
3. Lưu tin user vào DB (role: 'user')
4. Build history array cho LLM
5. Promise.all([
     callLLM(systemPrompt, history),       // AI reply
     callLLM(evaluatorPrompt, [user_msg])  // feedback
   ])
6. Parse [MISSION_COMPLETE] từ AI response
7. Parse feedbackData JSON từ evaluator
8. Lưu AI message + feedbackData vào DB
9. Nếu MISSION_COMPLETE:
   - calculateScores(sessionId)
   - Update session: status='completed', scores, endedAt
10. Return { aiMessage, feedbackData, missionComplete }
```

### Logic `calculateScores(sessionId)`

```
1. Lấy tất cả messages có role='user' của session
2. Đếm total messages có feedbackData
3. grammarScore = (1 - grammar_error_rate) * 100
4. vocabularyScore = (1 - vocab_error_rate) * 100
5. naturalnessScore = (1 - naturalness_error_rate) * 100
6. xpEarned = 50 base + bonus nếu scores cao
```

### API endpoints cần có cuối Phase 4

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| `POST` | `/api/sessions/level-test` | ✓ | Level test message |
| `POST` | `/api/sessions/start` | ✓ | Bắt đầu phiên học |
| `POST` | `/api/sessions/:id/message` | ✓ | Gửi tin nhắn |
| `GET` | `/api/sessions/:id/result` | ✓ | Kết quả phiên học |

---

## Phase 5 — User, Mission, Home Module

**Mục tiêu:** Dashboard, XP system, streak, daily missions hoạt động đầy đủ.

### Checklist

- [ ] Viết `users.service.js`:
  - `addXp(userId, sessionId)` → cộng XP, cập nhật streak, check & complete missions
  - `getProgress(userId)` → lịch sử tuần, skill scores, streak
  - `updateUserLevel(userId, level)` → sau level test
- [ ] Viết `missions.service.js`:
  - `getDailyMissions(userId)` → lấy missions của ngày hôm nay
  - `checkAndCompleteMissions(userId, sessionId)` → kiểm tra điều kiện hoàn thành
  - `createDailyMissionsForToday(userId)` → tạo UserMission nếu chưa có
- [ ] Viết `home.service.js` (hoặc dùng `users.controller`):
  - `getDashboard(userId)` → missions hôm nay + recommended scenes + inProgress session
- [ ] Viết controllers + routes tương ứng
- [ ] Streak logic: so sánh `lastActiveAt` với hôm nay, cộng/reset streak
- [ ] Test: sau khi complete session → XP cộng đúng
- [ ] Test: hoàn thành daily mission → `isCompleted: true`

### Logic Streak

```
Khi addXp() được gọi:
  lastDate = user.lastActiveAt (date only)
  today = now (date only)

  if lastDate === yesterday → streak + 1
  if lastDate === today     → streak unchanged (đã học hôm nay rồi)
  if lastDate < yesterday   → streak reset về 1
  if lastDate === null      → streak = 1

  Update user.streakDays + user.lastActiveAt = now
```

### API endpoints cần có cuối Phase 5

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| `GET` | `/api/home/dashboard` | ✓ | Data trang chủ |
| `POST` | `/api/users/xp` | ✓ | Cộng XP sau session |
| `GET` | `/api/users/progress` | ✓ | Tiến độ học tập |

---

## Phase 6 — Admin Module + Seed Data

**Mục tiêu:** Admin có thể quản lý scenes. Seed 10 scenes + data mẫu.

### Checklist

- [ ] Viết `admin.middleware.js` — kiểm tra `user.isAdmin === true`
- [ ] Viết `admin.service.js`:
  - `createScene(data)` → lưu DB + embed Chroma
  - `updateScene(id, data)` → update DB + re-embed Chroma
  - `deleteScene(id)` → xóa DB + xóa Chroma
  - `getStats()` → số user, scene, session hôm nay
- [ ] Viết `admin.controller.js` + `admin.routes.js`
- [ ] Viết `prisma/seed.js`:
  - Tạo admin user: `admin@scenio.app` / `admin123`
  - Tạo test user: `user@scenio.app` / `user123`
  - Tạo 10 scenes (phân bố đều: work/travel/daily, A2+B1)
  - Tạo 3 daily missions
  - Embed tất cả scenes vào Chroma sau khi seed
- [ ] Test: admin tạo scene → xuất hiện trong `/api/scenes` và searchable
- [ ] Test: non-admin gọi admin route → 403

### 10 Scenes mẫu cần có

| # | Title | Category | Difficulty |
|---|-------|----------|-----------|
| 1 | Job Interview at Tech Company | work | B1 |
| 2 | Ordering at a Coffee Shop | daily | A2 |
| 3 | Checking in at an Airport | travel | A2 |
| 4 | Making a Doctor's Appointment | daily | B1 |
| 5 | Asking for Directions | travel | A1 |
| 6 | Negotiating a Salary | work | B2 |
| 7 | Reporting a Problem to Hotel Reception | travel | B1 |
| 8 | Shopping at a Clothing Store | daily | A2 |
| 9 | Discussing a Project with a Colleague | work | B1 |
| 10 | Joining a Language Exchange Meetup | social | A2 |

### API endpoints cần có cuối Phase 6

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| `POST` | `/api/admin/scenes` | ✓ admin | Tạo scene mới |
| `PUT` | `/api/admin/scenes/:id` | ✓ admin | Cập nhật scene |
| `DELETE` | `/api/admin/scenes/:id` | ✓ admin | Xóa scene |
| `GET` | `/api/admin/stats` | ✓ admin | Thống kê tổng quan |
| `GET` | `/api/admin/users` | ✓ admin | Danh sách user |

---

## Phase 7 — Testing, Refactor, Polish

**Mục tiêu:** Hệ thống stable, có error handling tốt, sẵn sàng để Flutter integrate.

### Checklist

- [ ] Review tất cả routes — kiểm tra auth middleware áp dụng đúng chỗ
- [ ] Kiểm tra mọi endpoint đều trả về đúng format `{ success, data }` hoặc `{ success, error }`
- [ ] Kiểm tra Zod validation đầy đủ cho tất cả request body
- [ ] Handle edge cases:
  - Session không tồn tại / đã completed
  - LLM API timeout hoặc error → trả về lỗi rõ ràng
  - Chroma unavailable → ghi log, không crash server
  - JWT expired → 401 đúng message
- [ ] Viết Swagger/OpenAPI documentation (optional nhưng nên có)
- [ ] Test toàn bộ luồng end-to-end:
  1. Đăng nhập → lấy token
  2. Level test → phân loại trình độ
  3. Xem dashboard → lấy recommended scenes
  4. Start session → nhận opening message
  5. Gửi 3–5 tin nhắn → nhận AI replies + feedback
  6. Mission complete → session closed + scores
  7. Add XP → streak + missions updated
  8. Xem result → đầy đủ data

---

## Tổng kết — API endpoints đầy đủ sau Phase 7

| # | Method | Endpoint | Auth | Phase |
|---|--------|----------|------|-------|
| 1 | `GET` | `/api/health` | — | 1 |
| 2 | `POST` | `/api/auth/login` | — | 2 |
| 3 | `GET` | `/api/auth/verify-token` | ✓ | 2 |
| 4 | `GET` | `/api/scenes` | ✓ | 3 |
| 5 | `GET` | `/api/scenes/search` | ✓ | 3 |
| 6 | `GET` | `/api/scenes/recommend` | ✓ | 3 |
| 7 | `GET` | `/api/scenes/:id` | ✓ | 3 |
| 8 | `POST` | `/api/sessions/level-test` | ✓ | 4 |
| 9 | `POST` | `/api/sessions/start` | ✓ | 4 |
| 10 | `POST` | `/api/sessions/:id/message` | ✓ | 4 |
| 11 | `GET` | `/api/sessions/:id/result` | ✓ | 4 |
| 12 | `GET` | `/api/home/dashboard` | ✓ | 5 |
| 13 | `POST` | `/api/users/xp` | ✓ | 5 |
| 14 | `GET` | `/api/users/progress` | ✓ | 5 |
| 15 | `POST` | `/api/admin/scenes` | ✓ admin | 6 |
| 16 | `PUT` | `/api/admin/scenes/:id` | ✓ admin | 6 |
| 17 | `DELETE` | `/api/admin/scenes/:id` | ✓ admin | 6 |
| 18 | `GET` | `/api/admin/stats` | ✓ admin | 6 |
| 19 | `GET` | `/api/admin/users` | ✓ admin | 6 |

---

*Tài liệu này là nguồn sự thật cho việc lên kế hoạch backend Scenio. Cập nhật khi có thay đổi thiết kế.*
