# Scenio — Architecture Document

> **Phiên bản:** 1.0 | **Cập nhật:** 2025 | **Mục đích:** Tài liệu kiến trúc hệ thống cho toàn bộ team developer.

---

## Mục lục

1. [High-Level Architecture](#1-high-level-architecture)
2. [Component Architecture](#2-component-architecture)
3. [Data Flow Architecture](#3-data-flow-architecture)
4. [Sequence Diagrams](#4-sequence-diagrams)
5. [Database Architecture](#5-database-architecture)
6. [AI Pipeline Architecture](#6-ai-pipeline-architecture)
7. [Mobile Architecture (MVVM+GetX)](#7-mobile-architecture-mvvmgetx)
8. [Security Architecture](#8-security-architecture)

---

## 1. High-Level Architecture

Scenio được xây dựng theo kiến trúc **3-tier** với sự tách biệt rõ ràng giữa Presentation, Business Logic và Data.

```
╔══════════════════════════════════════════════════════════════════════════╗
║                          PRESENTATION TIER                               ║
╠══════════════════════════╦═══════════════════════════════════════════════╣
║                          ║                                               ║
║   📱 Flutter Mobile App  ║          🌐 React Admin Portal                ║
║   ─────────────────────  ║          ──────────────────────               ║
║   • Android / iOS        ║          • Quản lý kịch bản                  ║
║   • MVVM + GetX          ║          • Xem thống kê                       ║
║   • Dio HTTP Client      ║          • Cấu hình AI nhân vật               ║
║                          ║          • Vite + Tailwind CSS                ║
╚══════════════════════════╩═══════════════════════════════════════════════╝
                    │                           │
                    │         REST API          │
                    │    (HTTP/JSON, JWT Auth)   │
                    ▼                           ▼
╔══════════════════════════════════════════════════════════════════════════╗
║                         BUSINESS LOGIC TIER                              ║
║                                                                          ║
║                    🖥️  Express.js Backend (Node.js)                      ║
║                    ────────────────────────────────                      ║
║                                                                          ║
║   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               ║
║   │   Auth   │  │  Scenes  │  │ Sessions │  │  Users   │               ║
║   │  Module  │  │  Module  │  │  Module  │  │  Module  │               ║
║   └──────────┘  └──────────┘  └──────────┘  └──────────┘               ║
║                                                                          ║
║   ┌──────────────────────┐     ┌───────────────────────┐                ║
║   │   Roleplay Engine    │     │   Language Evaluator  │                ║
║   │  (Prompt Builder)    │     │   (Feedback Engine)   │                ║
║   └──────────────────────┘     └───────────────────────┘                ║
╚══════════════════════════════════════════════════════════════════════════╝
          │                    │                    │
          ▼                    ▼                    ▼
╔═════════════════╗  ╔══════════════════╗  ╔══════════════════════╗
║   DATA TIER     ║  ║   VECTOR TIER    ║  ║     AI TIER          ║
║                 ║  ║                  ║  ║                      ║
║  🐘 PostgreSQL  ║  ║  🔍 Chroma DB    ║  ║  🤖 LLM API          ║
║  ─────────────  ║  ║  ─────────────   ║  ║  ─────────────────   ║
║  • Users        ║  ║  • Scene         ║  ║  • Claude Sonnet     ║
║  • Scenes       ║  ║    Embeddings    ║  ║    (hội thoại)       ║
║  • Sessions     ║  ║  • Semantic      ║  ║  • GPT / OpenAI      ║
║  • Messages     ║  ║    Search        ║  ║    (embedding)       ║
║  • Missions     ║  ║  • Recommend     ║  ║                      ║
║  • Vocabulary   ║  ╚══════════════════╝  ╚══════════════════════╝
║  • Badges       ║
╚═════════════════╝
```

### Nguyên tắc kiến trúc

| Nguyên tắc | Mô tả |
|-----------|-------|
| **Separation of Concerns** | Flutter và React không gọi trực tiếp LLM hay Database. Tất cả qua Backend API |
| **Stateless API** | Backend không lưu session trong memory. Trạng thái lưu trong DB hoặc JWT |
| **Parallel AI Calls** | Mỗi lượt hội thoại thực hiện 2 LLM call song song (`Promise.all`) để giảm latency |
| **Dual Storage** | PostgreSQL cho structured data, Chroma cho vector search — không thay thế nhau |
| **Single Responsibility** | Mỗi module backend chỉ xử lý một domain: auth, scenes, sessions, users, missions |

---

## 2. Component Architecture

### 2.1 Backend — Module Structure

```
Express.js Backend
│
├── Middleware Layer
│   ├── helmet()              — Security headers
│   ├── cors()                — Cross-origin control
│   ├── express.json()        — Body parsing
│   ├── authMiddleware        — JWT verification (áp dụng cho mọi route trừ /auth)
│   ├── validateMiddleware    — Zod schema validation
│   └── errorHandler          — Global error catch-all
│
├── Module: Auth
│   ├── POST /auth/login       → Trả về access token + refresh token
│   └── GET  /auth/verify-token → Kiểm tra token còn hợp lệ
│
├── Module: Scenes
│   ├── GET  /scenes           → Danh sách (filter, paginate)
│   ├── GET  /scenes/search    → Semantic search qua Chroma
│   ├── GET  /scenes/recommend → Gợi ý theo điểm yếu user
│   └── GET  /scenes/:id       → Chi tiết kịch bản
│
├── Module: Sessions  ◄── Core module, phức tạp nhất
│   ├── POST /sessions/start       → Khởi tạo phiên, sinh opening message
│   ├── POST /sessions/level-test  → Bài test trình độ
│   ├── POST /sessions/:id/message → Gửi tin nhắn (dual LLM call)
│   └── GET  /sessions/:id/result  → Kết quả + transcript
│
├── Module: Users
│   ├── POST /users/xp         → Cộng XP, update streak
│   └── GET  /users/progress   → Biểu đồ tiến độ
│
├── Module: Missions
│   └── GET  /home/dashboard   → Missions + recommendations + in-progress session
│
└── Module: Admin (yêu cầu isAdmin = true)
    ├── POST   /admin/scenes     → Tạo scene + embed vào Chroma
    ├── PUT    /admin/scenes/:id → Sửa scene + re-embed
    └── DELETE /admin/scenes/:id → Xóa scene + xóa khỏi Chroma
```

### 2.2 Mobile — Screen & Layer Structure

```
Flutter App
│
├── Core Layer (không phụ thuộc vào feature nào)
│   ├── AppColors        — Design tokens màu sắc
│   ├── AppTextStyles    — Typography system (Lora + Inter)
│   ├── AppDimensions    — Spacing, radius, sizes
│   ├── AppTheme         — MaterialApp ThemeData
│   ├── ApiClient        — Dio singleton + Auth interceptor
│   └── StorageService   — GetStorage wrapper (lưu token local)
│
├── Data Layer
│   ├── Models           — Pure Dart classes (fromJson / toJson)
│   ├── Services         — HTTP calls thuần (chỉ gọi ApiClient)
│   └── Repositories     — Interface + Implementation
│                          (ViewModel phụ thuộc Interface, không phụ thuộc Implementation)
│
├── Modules (mỗi module = 1 màn hình hoặc 1 nhóm liên quan)
│   │
│   ├── splash/          onInit → check token → navigate
│   ├── onboarding/      swipe 3 slides → navigate to auth
│   ├── auth/            login form → POST /auth/login → save token
│   ├── level_test/      chat UI đơn giản → POST /sessions/level-test × 5
│   │
│   ├── home/            ← Bottom NavigationBar shell
│   │   ├── scenes_tab   Browse + search kịch bản
│   │   ├── progress_tab Biểu đồ XP, skill breakdown
│   │   ├── missions_tab Daily missions + achievements
│   │   └── profile_tab  Cài đặt, đăng xuất
│   │
│   ├── scene_detail/    Preview kịch bản → "Start scene"
│   │
│   ├── chat/            ← Màn hình cốt lõi
│   │   ├── ChatView     ListView.builder (messages)
│   │   ├── ChatViewModel sendMessage() + state management
│   │   └── Widgets/
│   │       ├── MessageBubble   — AI (trắng) vs User (navy)
│   │       ├── FeedbackStrip   — Amber (lỗi) / Green (tốt)
│   │       ├── TypingIndicator — 3 dots animate
│   │       ├── MissionPill     — Header reminder
│   │       └── HintButton      — Gợi ý câu (max 3 lần)
│   │
│   └── result/          Score ring + skill bars + transcript viewer
│
└── Routes
    ├── AppRoutes        — static const String values
    └── AppPages         — GetPage list với Bindings
```

### 2.3 React Admin — Page Structure

```
React Admin Portal
│
├── /login           — Đăng nhập admin (không có register)
│
├── /dashboard       — Thống kê: tổng user, session hôm nay, scene phổ biến
│
├── /scenes          — Danh sách kịch bản (bảng, search, filter theo category)
│   ├── /scenes/new  — Form tạo kịch bản mới
│   └── /scenes/:id  — Form sửa kịch bản
│
└── /users           — Danh sách người dùng (chỉ xem, không sửa)
```

---

## 3. Data Flow Architecture

### 3.1 Request Flow — Mỗi API call đi qua các lớp theo thứ tự

```
Flutter / React
      │
      │  HTTP Request (Bearer Token)
      ▼
┌─────────────────────────────────────────┐
│             Express.js                  │
│                                         │
│  1. helmet + cors                       │
│  2. express.json() — parse body         │
│  3. authMiddleware — verify JWT         │  ◄── 401 nếu token invalid
│  4. validateMiddleware — Zod schema     │  ◄── 400 nếu body sai
│  5. Router → Controller                 │
│  6. Controller → Service                │
│  7. Service → Prisma / Chroma / LLM     │
│  8. Service trả về data                 │
│  9. Controller → ok(res, data)          │
│ 10. errorHandler (nếu throw)            │
└─────────────────────────────────────────┘
      │
      │  HTTP Response { success, data } hoặc { success, error }
      ▼
Flutter / React
```

### 3.2 State Flow — Flutter (MVVM + GetX)

```
User Action (tap, type, submit)
      │
      ▼
   View (GetView<VM>)
      │  gọi controller.method()
      ▼
   ViewModel (GetxController)
      │  thay đổi RxVariable.value = ...
      │  gọi repository.method()
      ▼
   Repository (Interface)
      │  gọi service.method()
      ▼
   Service
      │  gọi ApiClient.post/get(...)
      ▼
   ApiClient (Dio)
      │  HTTP request
      ▼
   Backend API
      │  HTTP response
      ▼
   ApiClient
      │  trả về Response
      ▼
   Service → Repository → ViewModel
      │  RxVariable.value = newData  ← trigger reactive update
      ▼
   Obx(() => Widget)   ← tự rebuild chỉ phần này
      │
      ▼
   UI cập nhật
```

---

## 4. Sequence Diagrams

### 4.1 Đăng nhập và khởi tạo

```
┌──────────┐      ┌─────────┐      ┌──────────┐      ┌──────────┐
│  Flutter │      │ Backend │      │PostgreSQL│      │  Chroma  │
└────┬─────┘      └────┬────┘      └────┬─────┘      └────┬─────┘
     │                 │                │                  │
     │  [App mở lần đầu]               │                  │
     │                 │                │                  │
     │─── GET /auth/verify-token ──────►│                  │
     │◄── 401 Unauthorized ────────────┤                  │
     │                 │                │                  │
     │  [Navigate → Onboarding → Auth] │                  │
     │                 │                │                  │
     │─── POST /auth/login ────────────►│                  │
     │    { email, password }           │                  │
     │                 │─── findUser ──►│                  │
     │                 │◄── user row ───┤                  │
     │                 │                │                  │
     │                 │  bcrypt.compare(password, hash)   │
     │                 │  jwt.sign(...) cho accessToken    │
     │                 │  jwt.sign(...) cho refreshToken   │
     │                 │                │                  │
     │◄── 200 { accessToken, refreshToken, user } ────────┤                  │
     │                 │                │                  │
     │  [Lưu token vào GetStorage]      │                  │
     │                 │                │                  │
     │─── GET /home/dashboard ─────────►│                  │
     │    Authorization: Bearer <token> │                  │
     │                 │─── missions ──►│                  │
     │                 │─── sessions ──►│                  │
     │                 │                │                  │
     │                 │─── embed(userWeakSkills) ────────►│
     │                 │◄── topSceneIds ───────────────────┤
     │                 │─── findMany(ids) ──────────────── ►│
     │                 │◄── scenes ─────────────────────── ┤
     │                 │                │                  │
     │◄── 200 { missions, recommendedScenes, ... } ────────┤
     │                 │                │                  │
```

---

### 4.2 Bắt đầu phiên học (Start Scene)

```
┌──────────┐      ┌─────────┐      ┌──────────┐      ┌────────────┐
│  Flutter │      │ Backend │      │PostgreSQL│      │  LLM API   │
└────┬─────┘      └────┬────┘      └────┬─────┘      └─────┬──────┘
     │                 │                │                   │
     │  [User tap "Start Scene"]        │                   │
     │                 │                │                   │
     │─── POST /sessions/start ────────►│                   │
     │    { sceneId: "uuid" }           │                   │
     │                 │                │                   │
     │                 │─── findScene ─►│                   │
     │                 │◄── scene data ─┤                   │
     │                 │                │                   │
     │                 │─── createSession ────────────────► │
     │                 │    { userId, sceneId, status:"active" }
     │                 │◄── sessionId ──┤                   │
     │                 │                │                   │
     │                 │  buildSystemPrompt(scene)          │
     │                 │                │                   │
     │                 │─── messages.create (claude) ──────►│
     │                 │    system: systemPrompt            │
     │                 │    user: "start"                   │
     │                 │◄── openingMessage ─────────────────┤
     │                 │                │                   │
     │                 │─── createMessage ─────────────────►│
     │                 │    { role:"ai", content:opening }  │
     │                 │◄── ok ─────────────────────────────┤
     │                 │                │                   │
     │◄── 200 ─────────┤                │                   │
     │    { sessionId, │                │                   │
     │      openingMessage }            │                   │
     │                 │                │                   │
     │  [Hiển thị opening message]      │                   │
     │  [Hiển thị MissionPill ở header] │                   │
     │                 │                │                   │
```

---

### 4.3 Gửi tin nhắn trong phiên học (Core Flow)

> Đây là sequence phức tạp nhất — 2 LLM call chạy song song.

```
┌──────────┐   ┌─────────┐   ┌──────────┐   ┌──────────────────────┐
│  Flutter │   │ Backend │   │PostgreSQL│   │      LLM API         │
└────┬─────┘   └────┬────┘   └────┬─────┘   └──────┬───────┬───────┘
     │              │              │                 │       │
     │  [User nhập text và tap Send]               (1)     (2)
     │              │              │            Roleplay  Evaluator
     │── POST /sessions/:id/message ──────────►  │       │
     │   { content: "I'd like a table for 4" }   │       │
     │              │              │              │       │
     │              │── findSession + messages ──►│       │
     │              │◄── session + history ────── ┤       │
     │              │              │              │       │
     │              │── createMessage ───────────►│       │
     │              │   { role:"user", content }  │       │
     │              │◄── ok ─────────────────────-┤       │
     │              │              │              │       │
     │              │  ┌─ Promise.all([           │       │
     │              │  │                          │       │
     │              │  ├─ callLLM(systemPrompt,   │       │
     │              │  │         history) ────────────────►(1)
     │              │  │                          │       │
     │              │  └─ callLLM(evaluatorPrompt,│       │
     │              │            userMsg) ────────────────►(2)
     │              │  ])                         │       │
     │              │              │       (1)◄── aiResponse
     │              │              │       (2)◄── evalJSON
     │              │              │              │       │
     │              │  parse evalJSON → feedbackData      │
     │              │  check aiResponse.includes('[MISSION_COMPLETE]')
     │              │              │              │       │
     │              │── createMessage ───────────►│       │
     │              │   { role:"ai",              │       │
     │              │     content: cleanResponse, │       │
     │              │     feedbackData }           │       │
     │              │◄── ok ──────────────────────┤       │
     │              │              │              │       │
     │              │  [if missionComplete]        │       │
     │              │── calculateScores() ────────►│       │
     │              │── updateSession(completed) ─►│       │
     │              │◄── ok ──────────────────────┤       │
     │              │              │              │       │
     │◄── 200 ───── ┤              │              │       │
     │  { aiMessage,│              │              │       │
     │    feedbackData,            │              │       │
     │    missionComplete }        │              │       │
     │              │              │              │       │
     │  [Hiện bubble AI]           │              │       │
     │  [Hiện FeedbackStrip nếu có lỗi]           │       │
     │  [Nếu missionComplete → delay 2s → navigate to Result]
     │              │              │              │       │
```

---

### 4.4 Tìm kiếm kịch bản theo ngữ nghĩa

```
┌──────────┐    ┌─────────┐    ┌──────────┐    ┌──────────┐    ┌────────────┐
│  Flutter │    │ Backend │    │PostgreSQL│    │  Chroma  │    │OpenAI Embed│
└────┬─────┘    └────┬────┘    └────┬─────┘    └────┬─────┘    └─────┬──────┘
     │               │              │               │                 │
     │  [User gõ "practice at hospital"]            │                 │
     │               │              │               │                 │
     │── GET /scenes/search?q=... ─►│               │                 │
     │               │              │               │                 │
     │               │── embed(query) ──────────────────────────────►│
     │               │              │               │    model: text-embedding-3-small
     │               │◄── vector[1536] ────────────────────────────── ┤
     │               │              │               │                 │
     │               │── collection.query ──────────►│               │
     │               │   queryEmbeddings: [vector]   │               │
     │               │   nResults: 5                 │               │
     │               │   where: { difficulty: {      │               │
     │               │     $in: ["A1","A2","B1"] } }  │               │
     │               │◄── [ sceneId1, sceneId2, ... ]─┤               │
     │               │    (sorted by cosine similarity)               │
     │               │              │               │                 │
     │               │── findMany({ id: { in: ids }}) ──────────────►│
     │               │◄── scene objects ────────────────────────────-─┤
     │               │              │               │                 │
     │◄── 200 ────── ┤              │               │                 │
     │   { scenes[] }│              │               │                 │
     │   (ordered by │              │               │                 │
     │    relevance) │              │               │                 │
     │               │              │               │                 │
```

---

### 4.5 Admin tạo kịch bản mới

```
┌───────────┐    ┌─────────┐    ┌──────────┐    ┌──────────┐    ┌────────────┐
│React Admin│    │ Backend │    │PostgreSQL│    │  Chroma  │    │OpenAI Embed│
└─────┬─────┘    └────┬────┘    └────┬─────┘    └────┬─────┘    └─────┬──────┘
      │               │              │               │                 │
      │  [Admin điền form và submit] │               │                 │
      │               │              │               │                 │
      │── POST /admin/scenes ───────►│               │                 │
      │   { title, category,         │               │                 │
      │     description, missionText,│               │                 │
      │     systemPrompt, vocabulary,│               │                 │
      │     ... }                    │               │                 │
      │               │              │               │                 │
      │               │── Zod validate()             │                 │
      │               │              │               │                 │
      │               │── createScene ──────────────►│                 │
      │               │◄── scene { id, ... } ────── ─┤                 │
      │               │              │               │                 │
      │               │  sceneToText(scene)          │                 │
      │               │  = "{title}. {desc}. Goal: {mission}. Keywords: {vocab}"
      │               │              │               │                 │
      │               │── embed(sceneText) ──────────────────────────►│
      │               │◄── vector[1536] ────────────────────────────── ┤
      │               │              │               │                 │
      │               │── collection.upsert ─────────►│               │
      │               │   { id, embedding, metadata } │               │
      │               │◄── ok ───────────────────────┤               │
      │               │              │               │                 │
      │◄── 201 ────── ┤              │               │                 │
      │   { scene }   │              │               │                 │
      │               │              │               │                 │
      │  [Hiện toast "Scene created successfully"]   │                 │
      │  [Redirect → /scenes list]   │               │                 │
      │               │              │               │                 │
```

---

### 4.6 Kết thúc phiên và xem kết quả

```
┌──────────┐      ┌─────────┐      ┌──────────┐
│  Flutter │      │ Backend │      │PostgreSQL│
└────┬─────┘      └────┬────┘      └────┬─────┘
     │                 │                │
     │  [missionComplete = true từ bước 4.3]
     │                 │                │
     │  [delay 2 giây, hiện overlay "Mission Complete!"]
     │                 │                │
     │── GET /sessions/:id/result ─────►│
     │                 │                │
     │                 │── findSession ─►│
     │                 │── findMessages ►│
     │                 │◄── session     │
     │                 │◄── messages[]  │
     │                 │                │
     │                 │  annotateTranscript(messages)
     │                 │  ┌─ Mỗi message user:
     │                 │  │  đọc feedbackData đã lưu sẵn
     │                 │  │  map sang màu:
     │                 │  │   hasError → amber highlight
     │                 │  │   isGood   → green highlight
     │                 │  └─ Trả về messages có annotationColor
     │                 │                │
     │◄── 200 ─────────┤                │
     │   { session: {  │                │
     │       grammarScore,              │
     │       vocabularyScore,           │
     │       naturalnessScore },        │
     │     messages: [                  │
     │       { ...msg,                  │
     │         annotationColor,         │
     │         feedbackData }           │
     │     ],                           │
     │     newWords: ["vocab1", ...] }  │
     │                 │                │
     │── POST /users/xp ───────────────►│
     │   { sessionId }                  │
     │                 │── updateUser ──►│
     │                 │   totalXp += earned
     │                 │   streakDays check
     │                 │── checkMissions ►│
     │                 │◄── completedMissions[]
     │                 │                │
     │◄── 200 { totalXp, streakDays, completedMissions[] }
     │                 │                │
     │  [Animate score ring 0→82]       │
     │  [Hiện skill bars với animation] │
     │  [Nếu completedMissions → confetti + XP toast]
     │                 │                │
```

---

### 4.7 Kiểm tra trình độ (Level Test)

```
┌──────────┐      ┌─────────┐      ┌──────────┐      ┌────────────┐
│  Flutter │      │ Backend │      │PostgreSQL│      │  LLM API   │
└────┬─────┘      └────┬────┘      └────┬─────┘      └─────┬──────┘
     │                 │                │                   │
     │  [Lần đầu đăng nhập, chưa có level]                 │
     │                 │                │                   │
     │── POST /sessions/level-test ────►│                   │
     │   { message: null, turnIndex: 0 }│                   │
     │                 │                │                   │
     │                 │  LEVEL_TEST_SYSTEM_PROMPT          │
     │                 │  "Ask 5 questions, then return JSON"
     │                 │                │                   │
     │                 │── callLLM(system, []) ────────────►│
     │                 │◄── "Hi! Tell me about yourself." ──┤
     │                 │                │                   │
     │◄── { aiMessage: "Hi! Tell me about yourself.",
     │      isComplete: false }         │                   │
     │                 │                │                   │
     │  [User: "I am student in Vietnam, study IT"]        │
     │                 │                │                   │
     │── POST /sessions/level-test ────►│                   │
     │   { message: "I am student...", │                   │
     │     turnIndex: 1,                │                   │
     │     history: [...] }             │                   │
     │                 │                │                   │
     │                 │── callLLM(system, history+msg) ───►│
     │                 │◄── next question ──────────────────┤
     │                 │                │                   │
     │  ... (lặp lại 5 lượt) ...       │                   │
     │                 │                │                   │
     │── POST /sessions/level-test ────►│                   │
     │   { turnIndex: 5, ... }          │                   │
     │                 │                │                   │
     │                 │── callLLM(system, fullHistory) ───►│
     │                 │◄── { "level": "A2",               │
     │                 │      "rationale": "..." }          │
     │                 │                │                   │
     │                 │  parse JSON response               │
     │                 │── updateUser(level: "A2") ────────►│
     │                 │◄── ok ─────────────────────────────┤
     │                 │                │                   │
     │◄── { aiMessage: "Great! You're B1 level.",
     │      isComplete: true,           │                   │
     │      level: "A2" }               │                   │
     │                 │                │                   │
     │  [Navigate → Home]               │                   │
     │                 │                │                   │
```

---

## 5. Database Architecture

### 5.1 Entity Relationship Diagram

```
┌───────────────────┐         ┌──────────────────────────────┐
│      users        │         │           scenes             │
├───────────────────┤         ├──────────────────────────────┤
│ id (PK, uuid)     │         │ id (PK, uuid)                │
│ email (unique)    │         │ title                        │
│ passwordHash      │         │ category                     │
│ displayName       │         │ description                  │
│ avatarUrl         │         │ missionText                  │
│ level (A1-B2)     │         │ difficulty (ENUM)            │
│ totalXp           │         │ estimatedMinutes             │
│ streakDays        │         │ characterName                │
│ lastActiveDate    │         │ characterRole                │
│ isAdmin           │         │ systemPrompt (long text)     │
│ createdAt         │         │ isActive                     │
│ updatedAt         │         │ createdAt / updatedAt        │
└────────┬──────────┘         └───────┬──────────────────────┘
         │                            │ 1
         │                            │
         │ 1                          │ has many
         │                     ┌──────▼──────────────────┐
         │ has many            │    scene_vocabulary      │
         │                     ├─────────────────────────┤
    ┌────▼──────────────┐      │ id (PK)                  │
    │     sessions      │      │ sceneId (FK → scenes)   │
    ├───────────────────┤      │ word                     │
    │ id (PK, uuid)     │      │ definition               │
    │ userId (FK)  ─────┘      │ example                  │
    │ sceneId (FK) ────────────►                          │
    │ status                   └─────────────────────────┘
    │ grammarScore
    │ vocabularyScore
    │ naturalnessScore
    │ xpEarned
    │ startedAt
    │ endedAt
    └────────┬──────────┘
             │ 1
             │
             │ has many
    ┌────────▼──────────┐
    │     messages      │
    ├───────────────────┤
    │ id (PK, uuid)     │
    │ sessionId (FK)    │
    │ role              │  "USER" | "AI"
    │ content           │
    │ turnIndex         │
    │ feedbackColumns   │  hasError, errorType, suggestion,
    │ createdAt         │  explanation, isGood, isHint }

┌───────────────────┐         ┌──────────────────────┐
│   daily_missions  │         │    user_missions      │
├───────────────────┤         ├──────────────────────┤
│ id (PK)           │◄────────│ id (PK)              │
│ title             │ 1    M  │ userId (FK)          │
│ description       │         │ missionId (FK)       │
│ missionType       │         │ date (YYYY-MM-DD)    │
│ targetValue       │         │ isCompleted          │
│ xpReward          │         │ completedAt          │
│ isActive          │         │                      │
└───────────────────┘         │ UNIQUE(userId,       │
                               │        missionId,    │
                               │        date)         │
                               └──────────────────────┘
```

### 5.2 Chroma Vector DB Schema

```
Collection: "scenio_scenes"
│
├── Document 1
│   ├── id:         "uuid-scene-1"   ← khớp với scenes.id trong PostgreSQL
│   ├── embedding:  [0.023, -0.114, ...]  ← vector 1536 chiều
│   ├── document:   "At the restaurant. You are at a casual restaurant...
│   │               Goal: Successfully order food for 2 people.
│   │               Keywords: menu, order, recommend, bill, tip"
│   └── metadata:   { category: "daily", difficulty: "A2",
│                     characterName: "Jake" }
│
├── Document 2
│   ├── id:         "uuid-scene-2"
│   └── ...
│
└── Document N
    └── ...

Query flow:
  Input query: "tôi muốn luyện nói chuyện ở bệnh viện"
        │
        ▼
  embed(query) → vector[1536]
        │
        ▼
  cosine_similarity(queryVector, allEmbeddings)
        │
        ▼
  top-k results: ["uuid-scene-7", "uuid-scene-3", ...]
        │
        ▼
  PostgreSQL: SELECT * FROM scenes WHERE id IN (...)
        │
        ▼
  Return scenes ordered by similarity score
```

---

## 6. AI Pipeline Architecture

### 6.1 Roleplay Engine

```
Scene Data
    │
    ▼
┌─────────────────────────────────────┐
│         buildSystemPrompt()         │
│                                     │
│  Template:                          │
│  "You are {characterName},          │
│   a {characterRole}.                │
│                                     │
│   CONTEXT: {description}            │
│   MISSION (hidden): {missionText}   │
│   DIFFICULTY: {difficulty}          │
│                                     │
│   RULES:                            │
│   - Stay in character always        │
│   - 2-4 sentences per response      │
│   - Append [MISSION_COMPLETE]       │
│     when user finishes task"        │
└─────────────────────────────────────┘
    │
    ▼
callLLM(systemPrompt, messageHistory)
    │
    ▼
Raw AI Response
    │
    ├── contains [MISSION_COMPLETE]?
    │       YES → set missionComplete = true
    │             strip marker from text
    │       NO  → continue
    │
    ▼
Clean AI Response → lưu vào messages table
```

### 6.2 Language Evaluator

```
User Message
    │
    ▼
┌─────────────────────────────────────┐
│        buildEvaluatorPrompt()       │
│                                     │
│  "Evaluate: '{userMessage}'         │
│   Context: {sceneDescription}       │
│   Learner level: {difficulty}       │
│                                     │
│   Return ONLY JSON:                 │
│   {                                 │
│     hasError: bool,                 │
│     errorType: grammar|naturalness  │
│               |vocabulary|null,     │
│     originalPhrase: string|null,    │
│     suggestion: string|null,        │
│     explanation: string|null,       │
│     isGood: bool                    │
│   }"                                │
└─────────────────────────────────────┘
    │
    ▼
callLLM(evaluatorSystem, [{ role:"user", content: prompt }])
    │
    ▼
Raw JSON string
    │
    ▼
JSON.parse()
    │
    ├── Parse thành công → feedbackData object
    └── Parse lỗi       → feedbackData = null (silent fail)
    │
    ▼
Lưu các cột feedback (hasError, suggestion, ...) vào table messages
```

### 6.3 Parallel Execution

```javascript
// Hai LLM call chạy song song — KHÔNG chạy tuần tự
const [aiResponse, evalRaw] = await Promise.all([
    callLLM(roleplaySystem, messageHistory),   // ~1.5-2s
    callLLM(evaluatorSystem, [evalPrompt]),    // ~1-1.5s
]);
// Tổng thời gian: ~2s thay vì ~3.5s nếu chạy tuần tự
```

---

## 7. Mobile Architecture (MVVM+GetX)

### 7.1 Layer Dependencies

```
       ┌─────────────┐
       │    View     │  extends GetView<VM>
       │  (Widget)   │  dùng Obx() cho reactive UI
       └──────┬──────┘
              │  controller.method()
              ▼
       ┌─────────────┐
       │  ViewModel  │  extends GetxController
       │  (GetxCtrl) │  state: RxBool, RxList, Rx<T>
       └──────┬──────┘
              │  repository.method()
              ▼
       ┌─────────────┐
       │  Repository │  abstract interface
       │  Interface  │  ← ViewModel phụ thuộc vào đây
       └──────┬──────┘
              │  implements
              ▼
       ┌─────────────┐
       │  Repository │  concrete implementation
       │    Impl     │  gọi Service
       └──────┬──────┘
              │  service.method()
              ▼
       ┌─────────────┐
       │   Service   │  chỉ gọi ApiClient
       │             │  không có business logic
       └──────┬──────┘
              │  apiClient.post/get()
              ▼
       ┌─────────────┐
       │  ApiClient  │  Dio singleton
       │   (Dio)     │  + Auth interceptor
       └─────────────┘
```

### 7.2 Binding & Dependency Injection

```
GetPage(
  name: Routes.chat,
  page: () => ChatView(),
  binding: ChatBinding(),   ← được gọi TRƯỚC khi View được tạo
)

ChatBinding.dependencies() {
  Get.lazyPut<ApiClient>     → đã register global trong main.dart
  Get.lazyPut<SessionService> → new SessionService(Get.find<ApiClient>())
  Get.lazyPut<SessionRepository> → new SessionRepositoryImpl(Get.find())
  Get.lazyPut<ChatViewModel>  → new ChatViewModel(Get.find())
}

ChatView extends GetView<ChatViewModel> {
  // controller = Get.find<ChatViewModel>() tự động
}
```

### 7.3 Chat Screen State Machine

```
                    ┌──────────────────┐
                    │    INITIALIZING  │
                    │  _startSession() │
                    └────────┬─────────┘
                             │ session created
                             │ opening message received
                             ▼
                    ┌──────────────────┐
               ┌───►│     CHATTING     │◄──────────────────┐
               │    │  isSending=false │                   │
               │    └────────┬─────────┘                   │
               │             │ user sends message          │
               │             ▼                             │
               │    ┌──────────────────┐                   │
               │    │    SENDING       │                   │
               │    │  isSending=true  │                   │
               │    │  isTyping=true   │                   │
               │    └────────┬─────────┘                   │
               │             │                             │
               │      ┌──────┴──────┐                     │
               │      │             │                      │
               │   success        error                    │
               │      │             │                      │
               │      ▼             ▼                      │
               │  received      show snackbar              │
               │  aiMessage ──────────────────────────────►┤
               │  feedbackData                             │
               │      │                                    │
               │   missionComplete?                        │
               │      │                                    │
               │   YES │  NO                               │
               │      ▼   └──────────────────────────────►┘
               │   delay 2s
               │      │
               └──────┘ → navigate to Result
```

---

## 8. Security Architecture

### 8.1 Authentication Flow

```
Client                    Backend
  │                          │
  │── POST /auth/login ─────►│
  │   { email, password }    │
  │                          │  1. findUser(email)
  │                          │  2. bcrypt.compare(password, hash)
  │                          │  3. jwt.sign(...) cho accessToken
  │                          │  4. jwt.sign(...) cho refreshToken
  │◄── { accessToken, refreshToken, user } ──────┤
  │                          │
  │  [Lưu token trong]       │
  │  [GetStorage (mobile)]   │
  │  [localStorage (admin)]  │
  │                          │
  │── GET /any-protected ───►│
  │   Authorization: Bearer  │
  │   <token>                │
  │                          │  1. token = req.headers.authorization.split(' ')[1]
  │                          │  2. jwt.verify(token, SECRET)
  │                          │  3. req.user = payload
  │                          │  4. next()
  │◄── 200 data ─────────────┤
  │                          │
  │  [Access token hết hạn theo JWT_EXPIRES_IN, mặc định 15m] │
  │── GET /any-protected ───►│
  │   Authorization: Bearer  │
  │   <expired-token>        │
  │                          │  jwt.verify → throw TokenExpiredError
  │◄── 401 UNAUTHORIZED ─────┤
  │                          │
  │  [ApiClient interceptor] │
  │  [→ GetStorage.clear()]  │
  │  [→ Get.offAllNamed(/auth)]
```

### 8.2 Admin Authorization

```
Request: POST /admin/scenes
    │
    ▼
authMiddleware (verify JWT)
    │ req.user = { userId, isAdmin: true/false }
    ▼
adminGuard middleware
    │
    ├── req.user.isAdmin === true → next()
    └── req.user.isAdmin === false → 403 FORBIDDEN
```

### 8.3 Luồng xử lý lỗi

```
Error xảy ra ở Service layer
    │
    throw new Error('SESSION_NOT_FOUND')  hoặc  throw apiError
    │
    ▼
Controller try/catch
    │
    ├── known error → fail(res, message, code, status)
    └── unknown error → next(error) → errorHandler middleware
                              │
                              ▼
                    errorHandler(err, req, res, next)
                    NODE_ENV === 'production'
                    ├── YES → generic message (không lộ stack)
                    └── NO  → chi tiết lỗi (dev only)
```

---

*Tài liệu kiến trúc này được cập nhật theo thiết kế tại thời điểm khởi động dự án. Cập nhật file này khi có thay đổi về kiến trúc, module mới hoặc thay đổi flow quan trọng.*
