# Scenio — System Overview

> **Mục đích file này:** Tài liệu tổng quan kỹ thuật đầy đủ của hệ thống Scenio. Bất kỳ developer nào đọc file này phải hiểu toàn bộ hệ thống đủ để bắt đầu code mà không cần hỏi thêm.

---

## Mục lục

1. [Giới thiệu dự án](#1-giới-thiệu-dự-án)
2. [Kiến trúc tổng thể](#2-kiến-trúc-tổng-thể)
3. [Tech Stack](#3-tech-stack)
4. [Cấu trúc thư mục toàn hệ thống](#4-cấu-trúc-thư-mục-toàn-hệ-thống)
5. [Database Design](#5-database-design)
6. [Backend — Express.js](#6-backend--expressjs)
7. [Mobile — Flutter](#7-mobile--flutter)
8. [Admin Web — React.js](#8-admin-web--reactjs)
9. [AI & Vector Database](#9-ai--vector-database)
10. [API Reference](#10-api-reference)
11. [Luồng xử lý chính](#11-luồng-xử-lý-chính)
12. [Môi trường & Cài đặt](#12-môi-trường--cài-đặt)

---

## 1. Giới thiệu dự án

### 1.1 Tên và mô tả

**Scenio** — Ứng dụng học tiếng Anh qua hội thoại nhập vai theo ngữ cảnh thực.

Người dùng được đặt vào các kịch bản giao tiếp cụ thể (phỏng vấn xin việc, đặt bàn nhà hàng, làm thủ tục sân bay...) và hội thoại trực tiếp với nhân vật AI. Hệ thống đánh giá chất lượng ngôn ngữ sau từng lượt nói và gợi ý kịch bản phù hợp với điểm yếu của từng người học.

**Tagline:** *Every scene. A new voice.*

### 1.2 Các thành phần hệ thống

| Thành phần | Mô tả | Người dùng |
|-----------|-------|------------|
| **Flutter App** | Ứng dụng di động Android & iOS | Người học |
| **Express.js Backend** | REST API server, xử lý toàn bộ nghiệp vụ | — |
| **React Admin** | Web portal quản trị nội dung | Admin / giảng viên |
| **PostgreSQL** | Cơ sở dữ liệu quan hệ chính | — |
| **Chroma Vector DB** | Lưu embedding kịch bản, tìm kiếm ngữ nghĩa | — |
| **LLM API** | Claude hoặc OpenAI GPT-4, sinh hội thoại & đánh giá | — |

### 1.3 Luồng sử dụng tóm tắt

```
Người dùng mở app
  → Đăng nhập (Google OAuth / Email)
  → Kiểm tra trình độ (hội thoại 5 lượt với AI)
  → Chọn kịch bản từ danh sách được gợi ý
  → Hội thoại nhập vai với AI nhân vật
  → Nhận phản hồi ngôn ngữ sau từng lượt
  → Xem kết quả và bản ghi hội thoại có chú thích
  → Tích lũy XP, streak, hoàn thành nhiệm vụ hằng ngày
```

---

## 2. Kiến trúc tổng thể

### 2.1 Sơ đồ kiến trúc

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│                                                              │
│   ┌─────────────────────┐     ┌─────────────────────────┐   │
│   │   Flutter Mobile    │     │     React Admin Web     │   │
│   │  (Android / iOS)    │     │   (localhost:5173)      │   │
│   └──────────┬──────────┘     └───────────┬─────────────┘   │
└──────────────┼─────────────────────────────┼────────────────┘
               │ REST API (HTTP/JSON)         │ REST API
               ▼                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      BUSINESS LAYER                          │
│                                                              │
│              Express.js Backend (Node.js)                    │
│              (localhost:3000/api)                            │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Auth Module  │  │ Scene Module │  │  Session Module  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  User Module │  │Mission Module│  │  Admin Module    │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└──────────┬──────────────────┬──────────────────┬────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐
│   PostgreSQL     │  │  Chroma DB   │  │   LLM API        │
│   (port 5432)    │  │  (port 8000) │  │ (Claude/OpenAI)  │
└──────────────────┘  └──────────────┘  └──────────────────┘
```

### 2.2 Nguyên tắc thiết kế

- **Tách biệt concerns:** Flutter và React không gọi thẳng LLM hay DB — tất cả qua Backend API.
- **Stateless API:** Backend không lưu session trong memory; mọi trạng thái lưu trong DB hoặc JWT.
- **Dual LLM calls:** Mỗi lượt hội thoại thực hiện 2 LLM call song song (sinh AI response + đánh giá ngôn ngữ) bằng `Promise.all`.
- **Vector search:** Chroma chỉ dùng cho tìm kiếm và gợi ý kịch bản — không thay thế PostgreSQL.

---

## 3. Tech Stack

### 3.1 Bảng tổng hợp

| Thành phần | Công nghệ | Phiên bản | Lý do chọn |
|-----------|-----------|-----------|-----------|
| Mobile | Flutter / Dart | 3.x / 3.x | Cross-platform, MVVM+GetX |
| Admin Web | React.js + Vite | 18.x / 5.x | Phổ biến, build nhanh |
| Admin UI | Tailwind CSS | 3.x | Utility-first, nhanh prototype |
| Backend | Express.js / Node.js | 4.x / 20.x | Quen thuộc, ecosystem phong phú |
| ORM | Prisma | 5.x | Type-safe, migration dễ |
| Database | PostgreSQL | 15.x | Ổn định, hỗ trợ JSONB |
| Vector DB | Chroma | 0.4.x | Nhẹ, chạy local tốt |
| LLM | Claude API (`claude-sonnet-4-6`) | — | Chất lượng hội thoại cao |
| Embedding | OpenAI `text-embedding-3-small` | — | Nhanh, rẻ, đủ chất lượng |
| Auth | JWT + bcrypt | — | Đơn giản, stateless |
| HTTP Client (mobile) | Dio | 5.x | Interceptor, error handling tốt |
| State (mobile) | GetX | 4.6.x | Nhẹ, reactive đơn giản |
| Validation (backend) | Zod | 3.x | Schema validation TypeScript-first |
| Env config | dotenv | — | Standard |

### 3.2 Biến môi trường Backend (`.env`)

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/scenio_db

# JWT
JWT_SECRET=your_jwt_secret_key_here
REFRESH_SECRET=your_refresh_secret_key_here
JWT_EXPIRES_IN=15m
REFRESH_EXPIRES_IN=30d

# LLM
CLAUDE_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...          # dùng cho embedding
LLM_PROVIDER=claude            # "claude" hoặc "openai"

# Chroma
CHROMA_HOST=localhost
CHROMA_PORT=8000
CHROMA_COLLECTION=scenio_scenes

# Embedding
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
```

### 3.3 Biến môi trường React Admin (`.env`)

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

---

## 4. Cấu trúc thư mục toàn hệ thống

> **Lưu ý về hiện trạng repo:** Source hiện tại dùng tên thư mục `scenio_be`, `scenio_client_mobile`, `scenio_admin_fe`.
> Cây thư mục dưới đây mô tả **kiến trúc mục tiêu**; trong repo hiện tại, backend mới triển khai rõ `auth` và `home`, mobile mới ở mức scaffold theme/token, còn admin web chưa có mã nguồn.

```
scenio/
├── backend/                    # Express.js API server
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── seed.js             # Dữ liệu mẫu ban đầu
│   ├── src/
│   │   ├── app.js              # Express app setup
│   │   ├── server.js           # Entry point
│   │   ├── config/
│   │   │   ├── database.js     # Prisma client singleton
│   │   │   ├── chroma.js       # ChromaDB client
│   │   │   └── llm.js          # LLM client (Claude/OpenAI)
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT verify middleware
│   │   │   ├── validate.js     # Zod validation middleware
│   │   │   └── errorHandler.js # Global error handler
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.routes.js
│   │   │   │   ├── auth.controller.js
│   │   │   │   └── auth.service.js
│   │   │   ├── scenes/
│   │   │   │   ├── scenes.routes.js
│   │   │   │   ├── scenes.controller.js
│   │   │   │   ├── scenes.service.js
│   │   │   │   └── scenes.embedding.js  # Vector DB operations
│   │   │   ├── sessions/
│   │   │   │   ├── sessions.routes.js
│   │   │   │   ├── sessions.controller.js
│   │   │   │   ├── sessions.service.js
│   │   │   │   ├── roleplay.engine.js   # LLM prompt builder
│   │   │   │   └── evaluator.js         # Language evaluation
│   │   │   ├── users/
│   │   │   │   ├── users.routes.js
│   │   │   │   ├── users.controller.js
│   │   │   │   └── users.service.js
│   │   │   ├── missions/
│   │   │   │   ├── missions.routes.js
│   │   │   │   ├── missions.controller.js
│   │   │   │   └── missions.service.js
│   │   │   └── admin/
│   │   │       ├── admin.routes.js
│   │   │       ├── admin.controller.js
│   │   │       └── admin.service.js
│   │   └── utils/
│   │       ├── jwt.js
│   │       ├── response.js     # Standard API response wrapper
│   │       └── prompts.js      # Prompt templates
│   ├── .env
│   ├── .env.example
│   └── package.json
│
├── mobile/                     # Flutter app
│   ├── lib/
│   │   ├── main.dart
│   │   └── app/
│   │       ├── core/
│   │       │   ├── constants/
│   │       │   │   ├── app_colors.dart
│   │       │   │   ├── app_text_styles.dart
│   │       │   │   └── app_dimensions.dart
│   │       │   ├── theme/
│   │       │   │   └── app_theme.dart
│   │       │   ├── network/
│   │       │   │   ├── api_client.dart
│   │       │   │   └── api_endpoints.dart
│   │       │   └── storage/
│   │       │       └── storage_service.dart
│   │       ├── data/
│   │       │   ├── models/
│   │       │   ├── repositories/
│   │       │   └── services/
│   │       ├── modules/
│   │       │   ├── splash/
│   │       │   ├── onboarding/
│   │       │   ├── auth/
│   │       │   ├── level_test/
│   │       │   ├── home/
│   │       │   ├── scene_detail/
│   │       │   ├── chat/
│   │       │   └── result/
│   │       ├── routes/
│   │       │   ├── app_routes.dart
│   │       │   └── app_pages.dart
│   │       └── widgets/
│   ├── pubspec.yaml
│   └── .env                    # FLUTTER_API_BASE_URL
│
└── admin/                      # React admin portal
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx
    │   ├── api/
    │   │   └── axios.js        # Axios instance + interceptors
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Scenes/
    │   │   │   ├── SceneList.jsx
    │   │   │   ├── SceneForm.jsx
    │   │   │   └── SceneDetail.jsx
    │   │   └── Users/
    │   │       └── UserList.jsx
    │   ├── components/
    │   └── hooks/
    ├── .env
    └── package.json
```

---

## 5. Database Design

### 5.1 Prisma Schema (`backend/prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── Users ────────────────────────────────────────────────────────────────────

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String?                        // null nếu dùng OAuth
  displayName   String
  avatarUrl     String?
  level         String    @default("A2")       // A1 | A2 | B1 | B2
  totalXp       Int       @default(0)
  streakDays    Int       @default(0)
  lastActiveAt  DateTime?
  isAdmin       Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  sessions      Session[]
  userMissions  UserMission[]

  @@map("users")
}

// ── Scenes ───────────────────────────────────────────────────────────────────

model Scene {
  id              String   @id @default(uuid())
  title           String
  category        String                        // work | travel | daily | social
  description     String                        // mô tả ngữ cảnh ngắn
  missionText     String                        // mục tiêu rõ ràng người dùng cần đạt
  difficulty      String                        // A1 | A2 | B1 | B2
  estimatedMinutes Int     @default(5)
  characterName   String                        // tên nhân vật AI
  characterRole   String                        // vai trò nhân vật
  systemPrompt    String                        // prompt điều khiển hành vi AI
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  vocabulary      SceneVocabulary[]
  sessions        Session[]

  @@map("scenes")
}

model SceneVocabulary {
  id         String @id @default(uuid())
  sceneId    String
  word       String
  definition String
  example    String

  scene      Scene  @relation(fields: [sceneId], references: [id], onDelete: Cascade)

  @@map("scene_vocabulary")
}

// ── Sessions ─────────────────────────────────────────────────────────────────

model Session {
  id               String    @id @default(uuid())
  userId           String
  sceneId          String
  status           String    @default("active")  // active | completed | abandoned
  grammarScore     Float?
  vocabularyScore  Float?
  naturalnessScore Float?
  xpEarned         Int       @default(0)
  startedAt        DateTime  @default(now())
  endedAt          DateTime?

  user             User      @relation(fields: [userId], references: [id])
  scene            Scene     @relation(fields: [sceneId], references: [id])
  messages         Message[]

  @@map("sessions")
}

model Message {
  id           String   @id @default(uuid())
  sessionId    String
  role         String                           // "user" | "ai"
  content      String
  turnIndex    Int
  feedbackData Json?                            // { hasError, errorType, suggestion, isGood }
  createdAt    DateTime @default(now())

  session      Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@map("messages")
}

// ── Missions ─────────────────────────────────────────────────────────────────

model DailyMission {
  id          String @id @default(uuid())
  title       String                           // "Complete 1 scene today"
  description String
  missionType String                           // complete_scene | achieve_score | streak
  targetValue Int                              // 1 (scene), 80 (score), v.v.
  xpReward    Int    @default(50)
  isActive    Boolean @default(true)

  userMissions UserMission[]

  @@map("daily_missions")
}

model UserMission {
  id          String    @id @default(uuid())
  userId      String
  missionId   String
  date        String                           // "2025-03-23" (ISO date string)
  isCompleted Boolean   @default(false)
  completedAt DateTime?

  user        User         @relation(fields: [userId], references: [id])
  mission     DailyMission @relation(fields: [missionId], references: [id])

  @@unique([userId, missionId, date])
  @@map("user_missions")
}
```

### 5.2 Chroma Vector DB

Chroma lưu một collection tên `scenio_scenes`. Mỗi document trong collection tương ứng với một `Scene` trong PostgreSQL.

```
Collection: scenio_scenes
  document id  = scene.id  (UUID từ PostgreSQL)
  embedding    = vector 1536 chiều
  document     = "{title}. {description}. Mission: {missionText}. Vocabulary: {vocab_list}"
  metadata     = { category, difficulty, characterName }
```

**Khi nào sync Chroma:**
- Admin tạo scene mới → backend tự động embed và upsert vào Chroma.
- Admin cập nhật scene → re-embed và upsert.
- Admin xóa scene → xóa khỏi Chroma.

---

## 6. Backend — Express.js

### 6.1 Setup chính (`src/app.js`)

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { errorHandler } = require('./middleware/errorHandler');

// routes
const authRoutes    = require('./modules/auth/auth.routes');
const scenesRoutes  = require('./modules/scenes/scenes.routes');
const sessionsRoutes = require('./modules/sessions/sessions.routes');
const usersRoutes   = require('./modules/users/users.routes');
const missionsRoutes = require('./modules/missions/missions.routes');
const adminRoutes   = require('./modules/admin/admin.routes');

const app = express();

app.use(helmet());
app.use(cors({ origin: ['http://localhost:5173'] }));
app.use(express.json());

app.use('/api/auth',     authRoutes);
app.use('/api/scenes',   scenesRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/users',    usersRoutes);
app.use('/api/missions', missionsRoutes);
app.use('/api/admin',    adminRoutes);

app.use(errorHandler);

module.exports = app;
```

### 6.2 Standard API Response (`src/utils/response.js`)

Tất cả API đều trả về cùng một format:

```javascript
// Thành công
{
  "success": true,
  "status": 200,
  "timestamp": "2026-04-04T10:00:00.000Z",
  "data": { ... }
}

// Lỗi
{
  "success": false,
  "status": 401,
  "timestamp": "2026-04-04T10:00:00.000Z",
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token không hợp lệ hoặc đã hết hạn"
  }
}
```

```javascript
// response.js
const ok = (res, data, status = 200) =>
  res.status(status).json({ success: true, status, timestamp: new Date().toISOString(), data });

const fail = (res, message, code = 'ERROR', status = 400) =>
  res.status(status).json({
    success: false,
    status,
    timestamp: new Date().toISOString(),
    error: { code, message },
  });

module.exports = { ok, fail };
```

### 6.3 Auth Middleware (`src/middleware/auth.js`)

```javascript
const jwt = require('jsonwebtoken');
const { fail } = require('../utils/response');

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return fail(res, 'Thiếu token', 'UNAUTHORIZED', 401);

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    fail(res, 'Token không hợp lệ hoặc đã hết hạn', 'UNAUTHORIZED', 401);
  }
};
```

### 6.4 Roleplay Engine (`src/modules/sessions/roleplay.engine.js`)

File quan trọng nhất của backend. Xây dựng prompt cho LLM và xử lý response.

```javascript
/**
 * buildSystemPrompt — xây dựng system prompt cho nhân vật AI
 */
function buildSystemPrompt(scene) {
  return `You are ${scene.characterName}, a ${scene.characterRole}.

SCENE CONTEXT:
${scene.description}

YOUR MISSION (do NOT reveal this to the user):
The user needs to: ${scene.missionText}

INSTRUCTIONS:
- Stay in character at all times. Never break the 4th wall.
- Respond naturally as ${scene.characterName} would in this situation.
- Adjust your English complexity to approximately ${scene.difficulty} level.
- When the user successfully completes the mission, end the conversation naturally
  and append exactly this marker on a new line: [MISSION_COMPLETE]
- Keep each response concise (2-4 sentences max).
- If the user makes a very confusing statement, react naturally with confusion,
  do NOT correct their English.`;
}

/**
 * buildEvaluatorPrompt — prompt đánh giá ngôn ngữ của câu user vừa nói
 */
function buildEvaluatorPrompt(userMessage, sceneContext, userLevel) {
  return `You are an English language evaluator for a ${userLevel} learner.

Evaluate this message from the learner:
"${userMessage}"

Scene context: ${sceneContext}

Respond with ONLY valid JSON, no other text:
{
  "hasError": boolean,
  "errorType": "grammar" | "naturalness" | "vocabulary" | null,
  "originalPhrase": "the problematic phrase" | null,
  "suggestion": "improved version" | null,
  "explanation": "brief explanation in Vietnamese (max 15 words)" | null,
  "isGood": boolean
}

Rules:
- hasError = true only if there is a CLEAR error worth correcting
- isGood = true if the phrasing is natural and correct
- Never set both hasError and isGood to true
- If the message is too short to evaluate, return hasError: false, isGood: false`;
}

/**
 * callLLM — gọi LLM với messages history
 */
async function callLLM(systemPrompt, messages) {
  const provider = process.env.LLM_PROVIDER || 'claude';

  if (provider === 'claude') {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: systemPrompt,
      messages,
    });
    return response.content[0].text;
  }

  // fallback: OpenAI
  const OpenAI = require('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 300,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
  });
  return response.choices[0].message.content;
}

module.exports = { buildSystemPrompt, buildEvaluatorPrompt, callLLM };
```

### 6.5 Session Service — luồng gửi tin nhắn

```javascript
// sessions.service.js — sendMessage()
async function sendMessage(sessionId, userId, content) {
  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId, status: 'active' },
    include: { scene: true, messages: { orderBy: { turnIndex: 'asc' } } },
  });
  if (!session) throw new Error('SESSION_NOT_FOUND');

  // Lưu tin nhắn của user vào DB
  const turnIndex = session.messages.length;
  await prisma.message.create({
    data: { sessionId, role: 'user', content, turnIndex },
  });

  // Build history cho LLM
  const history = session.messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content,
  }));
  history.push({ role: 'user', content });

  const systemPrompt = buildSystemPrompt(session.scene);
  const evaluatorPrompt = buildEvaluatorPrompt(
    content, session.scene.description, session.scene.difficulty
  );

  // Gọi 2 LLM song song
  const [aiResponse, evalRaw] = await Promise.all([
    callLLM(systemPrompt, history),
    callLLM('You are a JSON-only evaluator.', [
      { role: 'user', content: evaluatorPrompt }
    ]),
  ]);

  // Parse kết quả đánh giá
  let feedbackData = null;
  try {
    feedbackData = JSON.parse(evalRaw);
  } catch { /* bỏ qua nếu parse lỗi */ }

  // Kiểm tra mission complete
  const missionComplete = aiResponse.includes('[MISSION_COMPLETE]');
  const cleanAiResponse = aiResponse.replace('[MISSION_COMPLETE]', '').trim();

  // Lưu tin nhắn AI vào DB
  await prisma.message.create({
    data: {
      sessionId,
      role: 'ai',
      content: cleanAiResponse,
      turnIndex: turnIndex + 1,
      feedbackData,
    },
  });

  // Nếu mission complete → tính điểm và cập nhật session
  if (missionComplete) {
    const scores = await calculateScores(sessionId);
    await prisma.session.update({
      where: { id: sessionId },
      data: { status: 'completed', endedAt: new Date(), ...scores },
    });
  }

  return { aiMessage: cleanAiResponse, feedbackData, missionComplete };
}
```

---

## 7. Mobile — Flutter

> **Hiện trạng repo:** `scenio_client_mobile` mới có `ThemeData`, design tokens và bộ khung file route/network/module. Các màn hình và flow bên dưới là kiến trúc mục tiêu; source UI nghiệp vụ vẫn chưa được hiện thực đầy đủ.

### 7.1 Kiến trúc MVVM + GetX

```
View (GetView<VM>)
  → chỉ hiển thị UI, không có logic
  → dùng Obx() để reactive với state

ViewModel (GetxController)
  → toàn bộ logic nghiệp vụ
  → quản lý state bằng .obs
  → gọi Repository

Repository (abstract interface + impl)
  → trừu tượng hóa nguồn dữ liệu
  → gọi Service

Service
  → HTTP call thực tế qua ApiClient (Dio)
```

### 7.2 Design Tokens

#### Colors (`app/core/constants/app_colors.dart`)

```dart
abstract class AppColors {
  // Primary — Ocean Blue
  static const Color primary800    = Color(0xFF0C447C); // header, topbar
  static const Color primary700    = Color(0xFF185FA5); // button fill, CTA
  static const Color primary500    = Color(0xFF378ADD); // link, icon active
  static const Color primary300    = Color(0xFF85B7EB); // placeholder, hint
  static const Color primary200    = Color(0xFFB5D4F4); // border, divider
  static const Color primary50     = Color(0xFFE6F1FB); // card bg, surface

  // Secondary — Teal Green
  static const Color secondary500  = Color(0xFF1D9E75); // online, success
  static const Color secondary300  = Color(0xFF5DCAA5); // tag background
  static const Color secondary50   = Color(0xFFE1F5EE); // success background

  // Accent — Amber (XP, streak, reward)
  static const Color accent500     = Color(0xFFEF9F27);
  static const Color accent50      = Color(0xFFFAEEDA);

  // Neutral
  static const Color neutral900    = Color(0xFF2C2C2A); // body text
  static const Color neutral500    = Color(0xFF5F5E5A); // secondary text
  static const Color neutral200    = Color(0xFFD3D1C7); // border
  static const Color neutral100    = Color(0xFFF1EFE8); // page bg

  // Aliases
  static const Color background    = neutral100;
  static const Color surface       = Color(0xFFF8F7F4);
  static const Color textPrimary   = neutral900;
  static const Color textSecondary = neutral500;
  static const Color border        = neutral200;

  // Chat
  static const Color bubbleAi      = Color(0xFFFFFFFF);
  static const Color bubbleUser    = primary700;

  // Semantic
  static const Color error         = Color(0xFFE24B4A);
  static const Color errorBg       = Color(0xFFFCEBEB);
  static const Color warningBg     = accent50;
  static const Color successBg     = secondary50;
}
```

#### Text Styles (`app/core/constants/app_text_styles.dart`)

```dart
// Font: Lora (serif) cho display/heading, Inter cho body/UI
abstract class AppTextStyles {
  static TextStyle get h1 => GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w600);
  static TextStyle get h2 => GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w600);
  static TextStyle get bodyMedium => GoogleFonts.inter(fontSize: 14, height: 1.5);
  static TextStyle get bodySmall  => GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary);
  static TextStyle get labelMedium => GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500);
  static TextStyle get caption    => GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary);
  static TextStyle get bubbleAi   => GoogleFonts.inter(fontSize: 14, color: AppColors.primary800, height: 1.55);
  static TextStyle get bubbleUser => GoogleFonts.inter(fontSize: 14, color: Colors.white, height: 1.55);
  static TextStyle get xpPill     => GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF412402));
  static TextStyle get displayLarge => GoogleFonts.lora(fontSize: 32, fontWeight: FontWeight.w700);
}
```

#### Dimensions (`app/core/constants/app_dimensions.dart`)

```dart
abstract class AppDimensions {
  static const double xs = 4, sm = 8, md = 12, lg = 16, xl = 20, xxl = 24;
  static const double radiusSm = 8, radiusMd = 12, radiusLg = 16, radiusFull = 999;
  static const double buttonHeight = 52, inputHeight = 52;
  static const double avatarMd = 44, avatarLg = 64;
  static const double bubbleMaxWidthFraction = 0.74;
  static const double screenPaddingH = 16;
}
```

### 7.3 Màn hình và Navigation

```
Routes:
  /                → SplashView
  /onboarding      → OnboardingView
  /auth            → AuthView
  /level-test      → LevelTestView
  /home            → HomeView (bottom nav shell)
  /scene-detail    → SceneDetailView  (args: { sceneId: String })
  /chat            → ChatView         (args: { sceneId: String, sessionId: String? })
  /result          → ResultView       (args: { sessionId: String })
```

**Điều hướng:**
```dart
// Đến màn hình mới
Get.toNamed(Routes.chat, arguments: {'sceneId': scene.id});

// Replace (không quay lại được)
Get.offNamed(Routes.home);

// Clear toàn bộ stack
Get.offAllNamed(Routes.home);
```

### 7.4 Màn hình Chat — logic quan trọng nhất

```dart
// chat_viewmodel.dart
class ChatViewModel extends GetxController {
  final SessionRepository _repo;
  ChatViewModel(this._repo);

  final RxList<MessageModel> messages = <MessageModel>[].obs;
  final RxBool isTyping = false.obs;
  final RxBool isSending = false.obs;
  late String sessionId;
  late SceneModel scene;

  @override
  void onInit() {
    super.onInit();
    final args = Get.arguments as Map<String, dynamic>;
    scene = args['scene'] as SceneModel;
    _startSession();
  }

  Future<void> _startSession() async {
    final result = await _repo.startSession(scene.id);
    sessionId = result.sessionId;
    messages.add(MessageModel(role: 'ai', content: result.openingMessage));
  }

  Future<void> sendMessage(String text) async {
    if (text.trim().isEmpty || isSending.value) return;
    isSending.value = true;
    messages.add(MessageModel(role: 'user', content: text));

    try {
      isTyping.value = true;
      final result = await _repo.sendMessage(sessionId, text);
      // Cập nhật feedback cho tin nhắn user vừa thêm
      messages[messages.length - 1] = messages.last.copyWith(
        feedbackData: result.feedbackData,
      );
      messages.add(MessageModel(role: 'ai', content: result.aiMessage));

      if (result.missionComplete) {
        await Future.delayed(const Duration(seconds: 2));
        Get.offNamed(Routes.result, arguments: {'sessionId': sessionId});
      }
    } catch (e) {
      Get.snackbar('Lỗi', 'Không thể gửi tin nhắn. Thử lại.');
    } finally {
      isSending.value = false;
      isTyping.value = false;
    }
  }
}
```

### 7.5 Models chính

```dart
// scene_model.dart
class SceneModel {
  final String id, title, category, description, missionText;
  final String difficulty, characterName, characterRole;
  final int estimatedMinutes;
  final List<VocabularyModel> vocabulary;
  final double? bestScore;          // null nếu chưa chơi

  factory SceneModel.fromJson(Map<String, dynamic> j) => SceneModel(
    id: j['id'], title: j['title'], category: j['category'],
    description: j['description'], missionText: j['missionText'],
    difficulty: j['difficulty'], characterName: j['characterName'],
    characterRole: j['characterRole'],
    estimatedMinutes: j['estimatedMinutes'] ?? 5,
    vocabulary: (j['vocabulary'] as List? ?? [])
        .map((v) => VocabularyModel.fromJson(v)).toList(),
    bestScore: j['bestScore']?.toDouble(),
  );
}

// message_model.dart
class MessageModel {
  final String role;           // "user" | "ai"
  final String content;
  final FeedbackData? feedbackData;

  bool get isUser => role == 'user';
}

// feedback_data.dart
class FeedbackData {
  final bool hasError;
  final bool isGood;
  final String? errorType;       // "grammar" | "naturalness" | "vocabulary"
  final String? originalPhrase;
  final String? suggestion;
  final String? explanation;     // tiếng Việt, tối đa 15 từ
}
```

---

## 8. Admin Web — React.js

> **Hiện trạng repo:** `scenio_admin_fe` hiện là thư mục placeholder, chưa có source React/Vite để chạy.

### 8.1 Cấu trúc pages

```
/login          → Đăng nhập admin
/dashboard      → Thống kê tổng quan (số user, session hôm nay, scene phổ biến)
/scenes         → Danh sách kịch bản (bảng có filter/search)
/scenes/new     → Tạo kịch bản mới
/scenes/:id     → Chỉnh sửa kịch bản
/users          → Danh sách người dùng (xem, không sửa)
```

### 8.2 Scene Form — các trường cần nhập

Khi admin tạo hoặc sửa kịch bản, form có các trường:

| Trường | Type | Bắt buộc | Ghi chú |
|--------|------|----------|---------|
| title | text | ✓ | Tên hiển thị |
| category | select | ✓ | work / travel / daily / social |
| difficulty | select | ✓ | A1 / A2 / B1 / B2 |
| description | textarea | ✓ | Mô tả ngữ cảnh |
| missionText | textarea | ✓ | Mục tiêu người dùng cần đạt |
| characterName | text | ✓ | Tên nhân vật AI |
| characterRole | text | ✓ | Vai trò (vd: "HR Manager at TechCorp") |
| estimatedMinutes | number | ✓ | Thời gian ước tính |
| systemPrompt | textarea | ✓ | Prompt điều khiển AI (dài) |
| vocabulary | dynamic list | — | Danh sách từ vựng: word + definition + example |

**Khi submit form tạo/sửa scene:** Backend tự động gọi Embedding API và upsert vào Chroma. Admin không cần làm gì thêm.

### 8.3 Axios instance (`src/api/axios.js`)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res.data.data,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
```

---

## 9. AI & Vector Database

### 9.1 Prompt Templates (`src/utils/prompts.js`)

**System Prompt chuẩn cho nhân vật AI:**

```
You are {characterName}, a {characterRole}.

SCENE CONTEXT:
{scene.description}

YOUR MISSION (do NOT reveal this to the user):
The user needs to: {scene.missionText}

INSTRUCTIONS:
- Stay in character at all times. Never break the 4th wall.
- Respond naturally as {characterName} would.
- Adjust English complexity to approximately {difficulty} level.
- When user successfully completes the mission, end naturally and
  append on a new line: [MISSION_COMPLETE]
- Keep responses concise (2-4 sentences max).
- If user is confused, react naturally — do NOT correct their English.
```

**Evaluator Prompt:**

```
You are an English language evaluator for a {userLevel} learner.
Evaluate this message: "{userMessage}"
Scene context: {sceneContext}

Respond ONLY with valid JSON:
{
  "hasError": boolean,
  "errorType": "grammar" | "naturalness" | "vocabulary" | null,
  "originalPhrase": string | null,
  "suggestion": string | null,
  "explanation": "brief explanation in Vietnamese (max 15 words)" | null,
  "isGood": boolean
}
```

**Level Test Prompt:**

```
You are conducting a friendly English level assessment.
Ask the user 5 conversational questions, one at a time.
Start with simple questions and gradually increase complexity.
After the 5th answer, analyze the responses and respond with ONLY JSON:
{
  "level": "A1" | "A2" | "B1" | "B2",
  "rationale": "brief explanation in Vietnamese"
}
```

### 9.2 Embedding & Chroma Operations (`src/modules/scenes/scenes.embedding.js`)

```javascript
const { ChromaClient } = require('chromadb');
const OpenAI = require('openai');

const chroma = new ChromaClient({
  host: process.env.CHROMA_HOST,
  port: parseInt(process.env.CHROMA_PORT),
});
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getCollection() {
  return chroma.getOrCreateCollection({ name: process.env.CHROMA_COLLECTION });
}

// Tạo text để embed từ scene
function sceneToText(scene) {
  const vocab = scene.vocabulary?.map(v => v.word).join(', ') || '';
  return `${scene.title}. ${scene.description}. Goal: ${scene.missionText}. Keywords: ${vocab}`;
}

// Embed và upsert vào Chroma
async function upsertScene(scene) {
  const collection = await getCollection();
  const text = sceneToText(scene);
  const response = await openai.embeddings.create({
    model: process.env.EMBEDDING_MODEL,
    input: text,
  });
  const embedding = response.data[0].embedding;

  await collection.upsert({
    ids: [scene.id],
    embeddings: [embedding],
    documents: [text],
    metadatas: [{
      category: scene.category,
      difficulty: scene.difficulty,
      characterName: scene.characterName,
    }],
  });
}

// Tìm kiếm theo ngữ nghĩa
async function searchScenes(query, userLevel, limit = 5) {
  const collection = await getCollection();
  const response = await openai.embeddings.create({
    model: process.env.EMBEDDING_MODEL,
    input: query,
  });
  const queryEmbedding = response.data[0].embedding;

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: limit,
    where: { difficulty: { $in: getAllowedLevels(userLevel) } },
  });

  return results.ids[0]; // danh sách scene IDs, sắp xếp theo độ tương đồng
}

// Cho phép truy vấn các level thấp hơn hoặc bằng level hiện tại
function getAllowedLevels(userLevel) {
  const order = ['A1', 'A2', 'B1', 'B2'];
  return order.slice(0, order.indexOf(userLevel) + 1);
}

// Xóa khỏi Chroma
async function deleteScene(sceneId) {
  const collection = await getCollection();
  await collection.delete({ ids: [sceneId] });
}

module.exports = { upsertScene, searchScenes, deleteScene };
```

---

## 10. API Reference

### Auth

| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| `POST` | `/api/auth/register` | — | `{ email, password, displayName?, avatarUrl? }` | `{ user, accessToken, refreshToken }` |
| `POST` | `/api/auth/login` | — | `{ email, password }` | `{ user, accessToken, refreshToken }` |
| `POST` | `/api/auth/google` | — | `{ idToken }` | `{ user, accessToken, refreshToken }` |
| `POST` | `/api/auth/refresh` | — | `{ refreshToken }` | `{ accessToken }` |
| `POST` | `/api/auth/logout` | — | `{ refreshToken? }` | `{ message }` |
| `GET` | `/api/auth/verify-token` | ✓ | — | `{ user }` |

### Scenes

| Method | Endpoint | Auth | Query / Body | Response |
|--------|----------|------|----------|----------|
| `GET` | `/api/scenes` | ✓ | `?category&difficulty&page` | `{ scenes[], total }` |
| `GET` | `/api/scenes/search` | ✓ | `?q=câu tìm kiếm` | `{ scenes[] }` |
| `GET` | `/api/scenes/recommend` | ✓ | — | `{ scenes[] }` |
| `GET` | `/api/scenes/:id` | ✓ | — | `{ scene }` |
| `POST` | `/api/admin/scenes` | ✓ admin | scene object | `{ scene }` |
| `PUT` | `/api/admin/scenes/:id` | ✓ admin | scene fields | `{ scene }` |
| `DELETE` | `/api/admin/scenes/:id` | ✓ admin | — | `{ ok: true }` |

### Sessions

| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| `POST` | `/api/sessions/start` | ✓ | `{ sceneId }` | `{ sessionId, openingMessage }` |
| `POST` | `/api/sessions/level-test` | ✓ | `{ message, turnIndex }` | `{ aiMessage, isComplete, level? }` |
| `POST` | `/api/sessions/:id/message` | ✓ | `{ content }` | `{ aiMessage, feedbackData, missionComplete }` |
| `GET` | `/api/sessions/:id/result` | ✓ | — | `{ session, messages[], scores }` |

### Users & Missions

| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| `GET` | `/api/home/dashboard` | ✓ | — | `{ missions[], recommendedScenes[], inProgressSession? }` |
| `POST` | `/api/users/xp` | ✓ | `{ sessionId }` | `{ totalXp, streakDays, missionsCompleted[] }` |
| `GET` | `/api/users/progress` | ✓ | — | `{ weeklyXp[], skillScores, sessionsHistory[] }` |

---

## 11. Luồng xử lý chính

### 11.1 Luồng bắt đầu phiên học

```
Flutter                    Backend                    PostgreSQL / LLM
  │                           │                           │
  ├─ POST /sessions/start ──► │                           │
  │   { sceneId }             ├─ Lấy scene data ─────────►│
  │                           │◄─ scene ─────────────────│
  │                           │                           │
  │                           ├─ Tạo session row ─────────►│
  │                           │◄─ sessionId ─────────────│
  │                           │                           │
  │                           ├─ buildSystemPrompt()      │
  │                           ├─ callLLM (opening msg) ──────────────────► LLM
  │                           │◄─ openingMessage ──────────────────────── LLM
  │                           │                           │
  │                           ├─ Lưu message (ai) ────────►│
  │◄─ { sessionId,            │                           │
  │     openingMessage } ─────┤                           │
```

### 11.2 Luồng gửi tin nhắn (quan trọng nhất)

```
Flutter              Backend               PostgreSQL      LLM
  │                     │                     │            │
  ├─ POST /message ────►│                     │            │
  │   { content }       ├─ Lưu msg (user) ──►│            │
  │                     │                     │            │
  │                     ├─ Promise.all([      │            │
  │                     │   callLLM (AI reply)├────────────►(1)
  │                     │   callLLM (eval)    ├────────────►(2)
  │                     │  ])                 │            │
  │                     │◄────────────────────────────────(1) aiResponse
  │                     │◄────────────────────────────────(2) evalJSON
  │                     │                     │            │
  │                     ├─ Lưu msg (ai) ─────►│            │
  │                     │   + feedbackData     │            │
  │                     │                     │            │
  │                     │ [if MISSION_COMPLETE]│            │
  │                     ├─ Tính điểm ─────────►│            │
  │                     ├─ Update session ────►│            │
  │                     │                     │            │
  │◄─ { aiMessage,      │                     │            │
  │     feedbackData,   │                     │            │
  │     missionComplete}┤                     │            │
```

### 11.3 Luồng tìm kiếm kịch bản

```
Flutter                Backend              Chroma         PostgreSQL
  │                       │                   │              │
  ├─ GET /scenes/search ─►│                   │              │
  │   ?q="go to hospital" │                   │              │
  │                       ├─ embed(query) ───────────────── OpenAI API
  │                       │◄─ queryVector                    │
  │                       │                   │              │
  │                       ├─ collection.query►│              │
  │                       │   queryVector      │              │
  │                       │◄─ [sceneId,...] ──┤              │
  │                       │                   │              │
  │                       ├─ findMany(ids) ────────────────►│
  │                       │◄─ scene objects ──────────────── │
  │                       │                   │              │
  │◄─ { scenes[] } ───────┤                   │              │
```

---

## 12. Môi trường & Cài đặt

### 12.1 Yêu cầu hệ thống

- Node.js 20.x LTS
- Flutter SDK 3.x
- Docker (chạy PostgreSQL và Chroma)
- API key: Claude hoặc OpenAI (cần cả hai nếu dùng Claude cho chat + OpenAI cho embedding)

### 12.2 Khởi động nhanh (Development)

```bash
# 1. Clone repo
git clone https://github.com/your-username/scenio.git
cd scenio

# 2. Khởi động PostgreSQL và Chroma bằng Docker
docker run -d --name scenio-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=scenio_db \
  -p 5432:5432 postgres:15

docker run -d --name scenio-chroma \
  -p 8000:8000 \
  chromadb/chroma

# 3. Cài đặt và chạy backend
cd scenio_be
cp .env.example .env
# Điền API keys vào .env
npm install
npm run db:migrate
npm run db:seed
npm run dev             # chạy trên port 3000

# 4. Cài đặt và chạy React admin
cd ../scenio_admin_fe
# Thư mục này hiện là placeholder, chưa có source React/Vite để chạy

# 5. Chạy Flutter app
cd ../scenio_client_mobile
flutter pub get
flutter run             # hiện mới là app scaffold/theme cơ bản
```

### 12.3 Thứ tự migrate schema

```bash
cd scenio_be

# Tạo migration mới khi thay đổi schema.prisma
npx prisma migrate dev --name "ten_migration"

# Apply migration lên DB có sẵn (không tạo file mới)
npx prisma migrate deploy

# Xem DB qua Prisma Studio (GUI)
npx prisma studio
```

### 12.4 Seed dữ liệu mẫu

File seed runner hiện tại là `scenio_be/prisma/seed.ts`.
Các seed được tách theo domain trong thư mục `scenio_be/prisma/seeds/`.

**Dữ liệu mẫu đang có trong repo:**
- 3 tài khoản mẫu: `admin@scenio.dev`, `learner@scenio.dev`, `beginner@scenio.dev` / mật khẩu `123456`
- 6 scene mẫu phủ các nhóm `WORK`, `TRAVEL`, `DAILY`, `SOCIAL`
- scene vocabulary cho toàn bộ scene seed
- 4 daily missions mẫu
- 5 badges mẫu
- refresh tokens, user missions, sessions, messages, user badges, user vocabulary để phục vụ test API nhanh

**Chưa có trong seed hiện tại:**
- bước sync embedding sang Chroma

---

## Ghi chú quan trọng cho developer

> Đọc kỹ những điểm này trước khi code để tránh sai kiến trúc.

1. **Không gọi LLM trực tiếp từ Flutter hay React.** Mọi LLM call đều qua Backend API.

2. **`[MISSION_COMPLETE]` marker:** AI nhân vật cần append marker này vào cuối câu trả lời khi phát hiện người dùng hoàn thành mục tiêu. Backend parse và xóa marker trước khi trả về client. Flutter dựa vào field `missionComplete: true` để chuyển màn hình kết quả.

3. **Feedback chỉ lưu trong `messages.feedbackData`**, không có bảng riêng. Field này là JSONB trong PostgreSQL.

4. **Chroma và PostgreSQL phải sync:** Khi tạo/sửa/xóa scene qua Admin Portal, backend phải đồng thời cập nhật cả hai. Nếu Chroma lỗi, ghi log nhưng không block việc lưu vào PostgreSQL.

5. **Flutter dùng `Get.arguments` để truyền dữ liệu giữa màn hình**, không dùng constructor. ViewModel đọc trong `onInit()`.

6. **Màn hình chat không được rebuild toàn bộ** mỗi khi nhận tin nhắn mới. Dùng `ListView.builder` với key để chỉ render item mới.

7. **Timeout LLM:** Set `receiveTimeout` của Dio là 30 giây. Hiển thị typing indicator trong lúc chờ để UX không bị "đứng".

8. **Vector search trả về IDs**, sau đó cần query PostgreSQL để lấy full data. Không lưu full scene data trong Chroma metadata.

---

*Tài liệu này phản ánh thiết kế tại thời điểm khởi động dự án. Cập nhật khi có thay đổi kiến trúc quan trọng.*
