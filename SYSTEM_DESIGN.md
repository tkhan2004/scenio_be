# Mô Tả Hệ Thống Scenio

> **Mục đích file này:** Tài liệu thiết kế hệ thống đầy đủ của ứng dụng Scenio.
> Agent sử dụng file này như nguồn sự thật duy nhất để code, thiết kế màn hình,
> viết API, và đưa ra mọi quyết định kỹ thuật liên quan đến dự án.

---

## CHƯƠNG 1: GIỚI THIỆU

### 1.1. Bối cảnh và lý do chọn đề tài

Học ngoại ngữ, đặc biệt là tiếng Anh, là nhu cầu thiết yếu trong bối cảnh toàn cầu hóa. Tuy nhiên, nhiều người học gặp khó khăn vì thiếu môi trường thực hành giao tiếp thực tế. Các ứng dụng học ngôn ngữ hiện tại như Duolingo hay Babbel tập trung vào từ vựng và ngữ pháp nhưng ít cung cấp cơ hội thực hành hội thoại tự do trong ngữ cảnh thực. Các dịch vụ gia sư trực tuyến giải quyết vấn đề này nhưng có chi phí cao và không linh hoạt về thời gian.

Với sự phát triển của Mô hình Ngôn ngữ Lớn (LLM), giờ đây có thể xây dựng một đối tác hội thoại AI có khả năng duy trì vai trò nhân vật và đưa ra phản hồi tự nhiên trong thời gian thực. Đây là cơ sở để đề tài đề xuất hệ thống Scenio.

### 1.2. Mục tiêu đề tài

Xây dựng hệ thống học ngoại ngữ qua hội thoại nhập vai theo ngữ cảnh thực, bao gồm:
- Ứng dụng di động Flutter cho phép người dùng thực hành hội thoại với nhân vật AI trong các kịch bản giao tiếp cụ thể
- Backend Node.js tích hợp LLM để tạo phản hồi hội thoại và phân tích ngôn ngữ tự động
- Hệ thống tìm kiếm kịch bản theo ngữ nghĩa sử dụng Vector Database
- Cổng quản trị web cho phép nhập và quản lý nội dung kịch bản

### 1.3. Phạm vi đề tài

| Phạm vi | Chi tiết |
|---------|---------|
| **Nằm trong phạm vi** | Hội thoại nhập vai 1-1 (người dùng ↔ nhân vật AI) |
| | Bài kiểm tra và phân loại trình độ ban đầu |
| | Phản hồi ngôn ngữ tự động sau mỗi lượt hội thoại |
| | Hệ thống XP và nhiệm vụ học tập cơ bản |
| | Tìm kiếm kịch bản theo ngữ nghĩa |
| | Gợi ý kịch bản dựa trên điểm yếu |
| **Nằm ngoài phạm vi** | Hội thoại nhóm nhiều người dùng |
| | Nhận diện giọng nói (Speech-to-Text) |
| | Tổng hợp giọng nói (Text-to-Speech) |
| | Thanh toán và mô hình kinh doanh |
| | Triển khai trên production (chỉ môi trường phát triển) |

---

## CHƯƠNG 2: PHÂN TÍCH YÊU CẦU

### 2.1. Yêu cầu chức năng

#### 🔐 Quản lý người dùng

| ID | Chức năng |
|----|-----------|
| F01 | Đăng nhập bằng Google OAuth hoặc email/mật khẩu |
| F02 | Kiểm tra trình độ ban đầu qua hội thoại ngắn với AI |
| F03 | Quản lý hồ sơ người dùng và cài đặt |

#### 🎭 Hệ thống kịch bản

| ID | Chức năng |
|----|-----------|
| F04 | Xem danh sách kịch bản được lọc theo trình độ và chủ đề |
| F05 | Tìm kiếm kịch bản theo từ khóa ngữ nghĩa (Vector Search) |
| F06 | Xem chi tiết kịch bản trước khi bắt đầu |
| F07 | Gợi ý kịch bản phù hợp dựa trên điểm yếu của người học |

#### 💬 Hội thoại nhập vai

| ID | Chức năng |
|----|-----------|
| F08 | Bắt đầu phiên hội thoại mới với nhân vật AI |
| F09 | Gửi và nhận tin nhắn trong thời gian thực |
| F10 | Nhận phản hồi ngôn ngữ tự động (lỗi ngữ pháp, gợi ý cải thiện) |
| F11 | Nhận cờ hiệu khi hoàn thành nhiệm vụ trong kịch bản |

#### 📊 Kết quả và tiến độ

| ID | Chức năng |
|----|-----------|
| F12 | Xem điểm số và phân tích kỹ năng sau mỗi phiên học |
| F13 | Đọc lại bản ghi hội thoại có chú thích phản hồi ngôn ngữ |
| F14 | Nhận điểm XP sau mỗi phiên học hoàn thành |
| F15 | Xem tiến độ học tập (streak, XP, lịch sử phiên học) |

#### 🛠️ Quản trị (Admin Portal)

| ID | Chức năng |
|----|-----------|
| F16 | Tạo, sửa, xóa kịch bản và nội dung hội thoại mẫu |
| F17 | Nhúng (embed) kịch bản vào Vector Database |
| F18 | Xem báo cáo thống kê sử dụng hệ thống |

### 2.2. Yêu cầu phi chức năng

| Loại | Yêu cầu |
|------|---------|
| **Hiệu năng** | Thời gian phản hồi mỗi lượt chat ≤ 5 giây (bao gồm LLM latency) |
| **Khả dụng** | Ứng dụng hoạt động ổn định trên Android (API 21+) và iOS (13+) |
| **Bảo mật** | Xác thực JWT; mật khẩu mã hóa bcrypt; HTTPS toàn bộ API |
| **Khả năng mở rộng** | Kiến trúc module cho phép thêm kịch bản và ngôn ngữ mới dễ dàng |
| **Khả năng bảo trì** | Code tuân theo chuẩn MVVM+GetX; có API documentation (Swagger) |

---

## CHƯƠNG 3: THIẾT KẾ HỆ THỐNG

### 3.1. Kiến trúc tổng thể

Hệ thống Scenio bao gồm bốn thành phần chính giao tiếp với nhau:

```
┌─────────────────────┐     HTTPS/REST      ┌────────────────────────────┐
│   Flutter Mobile    │ ──────────────────▶ │   Express.js Backend       │
│   (MVVM + GetX)     │ ◀────────────────── │   (Node.js)                │
└─────────────────────┘                     └────────────┬───────────────┘
                                                         │
                        ┌─────────────────┐             │ SQL / Vector Query
┌─────────────────────┐ │  LLM API        │             ▼
│   React Admin       │ │  (OpenAI /      │ ┌────────────────────────────┐
│   Portal            │ │   Gemini)       │ │  PostgreSQL  +  Chroma DB  │
└─────────────────────┘ └────────┬────────┘ └────────────────────────────┘
                                 │ HTTP calls
                     ┌───────────▼──────────┐
                     │  Backend gọi LLM API │
                     └──────────────────────┘
```

### 3.2. Thiết kế cơ sở dữ liệu

#### Các bảng chính (PostgreSQL)

**Bảng `users`**

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID PK | Định danh người dùng |
| `email` | VARCHAR UNIQUE | Email đăng nhập |
| `password_hash` | VARCHAR | Mật khẩu (bcrypt/null if Google) |
| `google_id` | VARCHAR UNIQUE | ID từ Google OAuth |
| `display_name` | VARCHAR | Tên hiển thị |
| `avatar_url` | VARCHAR | URL ảnh đại diện |
| `level` | ENUM | Trình độ: `A1`, `A2`, `B1`, `B2` |
| `total_xp` | INT | Tổng điểm kinh nghiệm |
| `streak_days` | INT | Số ngày học liên tiếp |
| `last_active_date` | DATE | Ngày học gần nhất |
| `is_admin` | BOOLEAN | Quyền quản trị |

**Bảng `scenes`**

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID PK | Định danh kịch bản |
| `title` | VARCHAR | Tên kịch bản |
| `category` | ENUM | `WORK`, `TRAVEL`, `DAILY`, `SOCIAL` |
| `description` | TEXT | Mô tả ngắn |
| `mission_text` | TEXT | Nội dung nhiệm vụ |
| `difficulty` | ENUM | Trình độ phù hợp (`A1`-`B2`) |
| `estimated_minutes` | INT | Thời gian ước tính |
| `character_name` | VARCHAR | Tên nhân vật AI |
| `character_role` | VARCHAR | Vai trò nhân vật |
| `system_prompt` | TEXT | Prompt hệ thống cho LLM |
| `is_active` | BOOLEAN | Trạng thái hiển thị |

**Bảng `sessions`**

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID PK | Định danh phiên học |
| `user_id` | UUID FK | Người dùng |
| `scene_id` | UUID FK | Kịch bản |
| `status` | ENUM | `ACTIVE`, `COMPLETED`, `ABANDONED` |
| `grammar_score` | FLOAT | Điểm ngữ pháp (0–100) |
| `vocabulary_score` | FLOAT | Điểm từ vựng (0–100) |
| `naturalness_score` | FLOAT | Điểm tự nhiên (0–100) |
| `xp_earned` | INT | XP nhận được từ phiên này |
| `hint_count` | INT | Số lần dùng gợi ý |
| `started_at` | TIMESTAMP | Thời điểm bắt đầu |
| `ended_at` | TIMESTAMP | Thời điểm kết thúc |

**Bảng `messages`**

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID PK | Định danh tin nhắn |
| `session_id` | UUID FK | Phiên học |
| `role` | ENUM | `USER`, `AI` |
| `content` | TEXT | Nội dung tin nhắn |
| `turn_index` | INT | Thứ tự tin nhắn |
| `has_error` | BOOLEAN | Có lỗi hay không (cho USER) |
| `error_type` | ENUM | `GRAMMAR`, `NATURALNESS`, `VOCABULARY` |
| `original_phrase`| VARCHAR | Cụm từ gốc có lỗi |
| `suggestion` | VARCHAR | Gợi ý sửa lỗi |
| `explanation` | TEXT | Giải thích lỗi |
| `is_good` | BOOLEAN | Đánh giá câu tốt |
| `is_hint` | BOOLEAN | Tin nhắn thuộc dạng gợi ý |
| `created_at` | TIMESTAMP | Thời điểm gửi |

**Bảng `daily_missions`**

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID PK | |
| `title` | VARCHAR | |
| `description` | TEXT | |
| `mission_type` | ENUM | `COMPLETE_SCENE`, `ACHIEVE_SCORE`, ... |
| `target_value` | INT | Ngưỡng cần đạt |
| `xp_reward` | INT | |
| `is_active` | BOOLEAN | |

**Bảng `user_missions`**

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK | |
| `mission_id` | UUID FK | |
| `date` | VARCHAR | YYYY-MM-DD |
| `current_value` | INT | |
| `is_completed` | BOOLEAN | |

**Bảng `scene_vocabulary`**

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID PK | |
| `scene_id` | UUID FK | |
| `word` | VARCHAR | |
| `definition` | TEXT | |
| `example` | TEXT | |

**Bảng `user_vocabulary`**

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK | |
| `scene_vocab_id`| UUID FK | |
| `word` | VARCHAR | |
| `is_mastered` | BOOLEAN | |

#### Vector Database (Chroma)

Mỗi kịch bản được nhúng (embed) thành vector từ trường `title + description + situation + tags` và lưu vào Chroma với metadata:

```json
{
  "id": "scene-uuid",
  "document": "Job Interview at Tech Company — Practice a formal job interview with a senior HR manager...",
  "metadata": {
    "scene_id": "uuid",
    "level": "intermediate",
    "topic": "business",
    "tags": ["interview", "formal", "HR"]
  }
}
```

### 3.3. Roleplay Engine (Backend Core)

Roleplay Engine là thành phần trung tâm của backend, chịu trách nhiệm xây dựng prompt và tương tác với LLM:

#### System Prompt Template

```
You are {character_name}, {character_role}.
Situation: {situation}
The user's mission is: {mission_description}
Success criteria: {success_criteria}

Rules:
- Stay in character at all times. Never break the 4th wall.
- Use vocabulary appropriate for {level} English learners.
- Keep responses under 80 words unless the user asks for more detail.
- If the user completes the mission, include the JSON flag: {"mission_complete": true}
```

#### Language Feedback Prompt

Prompt đánh giá riêng biệt, chỉ nhận tin nhắn của người dùng (không có lịch sử chat):

```
Analyze the following English message from a {level} learner (A1, A2, B1, or B2).
Check for grammar, vocabulary, and naturalness errors.
Return a JSON object ONLY, no other text:
{
  "has_error": boolean,
  "error_type": "GRAMMAR" | "NATURALNESS" | "VOCABULARY" | null,
  "original_phrase": "string or null",
  "suggestion": "string or null",
  "explanation": "brief explanation in Vietnamese or null",
  "is_good": boolean
}

User message: "{user_message}"
```

### 3.4. Luồng xử lý chính

#### 3.4.1. Luồng khởi tạo phiên hội thoại

```
Mobile App                    Backend                        LLM API
    │                            │                              │
    │── POST /api/sessions/start ──▶                            │
    │   { sceneId, userId }       │                              │
    │                             │── Build system prompt ──▶   │
    │                             │                    Generate opening message
    │                             │◀── Opening message ─────────│
    │                             │── Save session to PostgreSQL │
    │◀── { sessionId, opening } ──│                              │
    │   Display chat screen        │                              │
```

**Chi tiết:**
1. Mobile gửi `POST /api/sessions/start` kèm `sceneId` và `userId`
2. Backend tạo bản ghi phiên học mới trong PostgreSQL với `status: "active"`
3. Backend xây dựng system prompt từ thông tin kịch bản
4. Backend gọi LLM API để sinh tin nhắn mở đầu của nhân vật AI
5. Trả về `{ sessionId, openingMessage }` cho mobile

#### 3.4.2. Luồng xử lý mỗi lượt hội thoại

```
Mobile App                Backend                        LLM API (Parallel)
    │                        │                               │
    │── POST /sessions/:id/message ──▶                       │
    │   { content }           │                               │
    │                         │── Task 1: Chat history + new ──▶ Generate AI reply
    │                         │── Task 2: User message only  ──▶ Language feedback
    │                         │      (Promise.all — parallel execution)
    │                         │◀── AI reply + feedback ───────│
    │                         │── Save messages to PostgreSQL  │
    │◀── { aiMessage, feedback, missionComplete } ──│         │
```

**Chi tiết:**
1. Mobile gửi `POST /api/sessions/:id/message` với nội dung tin nhắn người dùng
2. Backend thực hiện **song song** hai tác vụ:
   - **Task 1:** Gửi toàn bộ lịch sử hội thoại + tin nhắn mới → LLM → sinh phản hồi nhân vật
   - **Task 2:** Gửi chỉ tin nhắn người dùng → LLM → phân tích lỗi ngôn ngữ
3. Dùng `Promise.all` để chạy song song, giảm thời gian chờ
4. Lưu cả hai tin nhắn (user + AI) và feedback vào PostgreSQL
5. Trả về `{ aiMessage, feedback, missionComplete }` trong một response duy nhất

#### 3.4.3. Luồng tìm kiếm kịch bản theo ngữ nghĩa

```
Mobile App                Backend                    Embedding API    Chroma DB
    │                        │                             │               │
    │── GET /api/scenes/search?q={query} ──▶              │               │
    │                        │── Convert query to vector ──▶              │
    │                        │◀── embedding vector ────────│               │
    │                        │── Query similar vectors ──────────────────▶│
    │                        │◀── top-k results ─────────────────────────│
    │                        │── Filter by user level                      │
    │◀── sorted scene list ──│                             │               │
```

### 3.5. Thiết kế API

**Base URL:** `http://localhost:3000/api`  
**Auth:** JWT Bearer Token trong header `Authorization: Bearer <token>`

#### Auth

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `POST` | `/auth/login` | Đăng nhập, trả về access token + refresh token | ❌ |
| `GET` | `/auth/verify-token` | Kiểm tra tính hợp lệ của JWT token | ✅ |

#### Sessions

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `POST` | `/sessions/level-test` | Khởi tạo bài kiểm tra trình độ ban đầu | ✅ |
| `POST` | `/sessions/start` | Bắt đầu phiên học mới | ✅ |
| `POST` | `/sessions/:id/message` | Gửi tin nhắn trong phiên học | ✅ |
| `GET` | `/sessions/:id/result` | Lấy kết quả và phân tích phiên học | ✅ |

#### Scenes

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `GET` | `/scenes` | Lấy danh sách kịch bản theo bộ lọc | ✅ |
| `GET` | `/scenes/search` | Tìm kiếm kịch bản theo ngữ nghĩa | ✅ |
| `GET` | `/scenes/recommend` | Gợi ý kịch bản dựa trên điểm yếu | ✅ |
| `GET` | `/scenes/:id` | Lấy chi tiết một kịch bản | ✅ |

#### Users

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `GET` | `/home/dashboard` | Lấy dữ liệu trang chủ (missions, recommendations) | ✅ |
| `POST` | `/users/xp` | Cộng điểm kinh nghiệm sau phiên học | ✅ |
| `GET` | `/users/progress` | Lấy dữ liệu tiến độ học tập | ✅ |

#### API Response Format

Mọi response đều theo cấu trúc chuẩn:

```json
// Success
{
  "success": true,
  "data": { ... }
}

// Error
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "JWT token is invalid or expired."
  }
}
```

---

### 3.6. Thiết kế giao diện ứng dụng di động

#### 3.6.1. Nguyên tắc thiết kế

**Màu sắc — Ocean Depth Palette:**

| Token | Hex | Dùng cho |
|-------|-----|---------|
| Primary (Navy) | `#0C447C` | Header, app bar, nút chính |
| Primary Light | `#E6F1FB` | Nền scaffold, card background |
| Accent (Amber) | `#EF9F27` | XP pill, streak dot, highlight |
| Text Primary | `#2C2C2A` | Nội dung chính |
| Text Secondary | `#5F5E5A` | Caption, subtitle |
| Error | `#E24B4A` | Lỗi ngôn ngữ, cảnh báo |
| Success | `#1D9E75` | Phản hồi tốt, hoàn thành |

**Typography:**
- **Display / Heading:** `Lora` (Serif, Google Fonts) — dùng cho logo, tiêu đề lớn
- **Body / UI:** `Inter` (Sans-serif, Google Fonts) — dùng cho mọi nội dung khác

**Bố cục:**
- Material You — góc bo tròn nhất quán (`8px` chip, `12px` input, `16px` card)
- Khoảng cách cơ sở: `16px`

#### 3.6.2. Màn hình và luồng điều hướng

```
App Start
    │
    ▼
[Splash Screen]  ──── kiểm tra token ────▶  [Home Screen] (đã đăng nhập)
    │                                              │
    │ (chưa đăng nhập / lần đầu)                  ▼
    ▼                                    ┌─────────────────────┐
[Onboarding]  (3 slides, lần đầu only)   │  Tab Bar (4 tabs):  │
    │                                    │  • Scenes           │
    ▼                                    │  • Progress         │
[Login Screen]                           │  • Missions         │
    │                                    │  • Profile          │
    ▼                                    └────────┬────────────┘
[Level Test] ──── hội thoại với AI ──▶            │
    │              xác định trình độ     [Scene Detail Screen]
    ▼                                             │
[Home Screen] ◀────────────────────────          ▼
                                         [Chat Screen]  ◀──▶ Backend/LLM
                                                  │
                                                  ▼
                                         [Result Screen]
```

**Chi tiết từng màn hình:**

| Màn hình | Route | Mô tả |
|----------|-------|-------|
| **Splash** | `/` | Logo 1.5s + kiểm tra JWT token → điều hướng |
| **Onboarding** | `/onboarding` | 3 slides giới thiệu, chỉ hiển thị lần đầu |
| **Login** | `/auth` | Google OAuth + email/password |
| **Level Test** | `/level-test` (embedded trong `/auth`) | Hội thoại ngắn với AI để xác định trình độ |
| **Home** | `/home` | Tab bar shell (4 tabs) |
| **Scene Detail** | `/scene-detail` | Thông tin kịch bản + nút Start |
| **Chat** | `/chat` | Giao diện hội thoại nhập vai chính |
| **Result** | `/result` | Điểm số + phân tích + transcript |

#### 3.6.3. Chi tiết màn hình Chat (màn hình quan trọng nhất)

**Layout:**
```
┌─────────────────────────────────┐
│  AppBar: Tên kịch bản + Avatar  │  ← AppColor.primary800
├─────────────────────────────────┤
│                                 │
│  [AI bubble]  Xin chào! Tôi... │  ← Bubble trắng, viền primary200
│                                 │
│     [User bubble] Hello, I...  │  ← Bubble primary700 (phải)
│  ┌─────────────────────────────┐│
│  │ ⚠ "I work here since 2 y..." ││  ← FeedbackStrip (amber)
│  │ Try: "I have worked here..." ││
│  └─────────────────────────────┘│
│                                 │
│  [AI bubble] Oh, that's...     │
│                                 │
│     [User bubble] Actually...  │
│  ┌─────────────────────────────┐│
│  │ ✅ Great use of "actually"! ││  ← FeedbackStrip (green)
│  └─────────────────────────────┘│
│                                 │
│  ✨ Mission Complete!           │  ← Hiện khi hoàn thành
├─────────────────────────────────┤
│  [💡 Hint] [          Input  ] │  ← Input bar
└─────────────────────────────────┘
```

**Message Bubble rules:**
- AI bubble: nền trắng, viền `primary200`, bo góc `4 16 16 16` (top-left phẳng), text `primary800`
- User bubble: nền `primary700`, không viền, bo góc `16 4 16 16` (top-right phẳng), text trắng
- Max width = 74% màn hình
- FeedbackStrip hiện ngay bên dưới user bubble nếu có lỗi

#### 3.6.4. Kiến trúc ứng dụng di động

```
View (GetView<VM>)
    │  gọi method, đọc Rx state
    ▼
ViewModel (GetxController)
    │  gọi repository interface
    ▼
Repository (abstract + impl)
    │  gọi service
    ▼
Service (ApiClient / Mock)
    │  HTTP call (Dio)
    ▼
Backend API
```

| Layer | Trách nhiệm |
|-------|------------|
| **View** | Chỉ hiển thị UI, lắng nghe sự kiện người dùng, dùng `Obx()` |
| **ViewModel** | Logic nghiệp vụ phía client, quản lý `Rx` state, điều phối API call, navigate |
| **Repository** | Lớp trừu tượng giữa ViewModel và data, transform data |
| **Service** | Thực hiện HTTP call qua Dio, không có business logic |

> ⚠️ **TUYỆT ĐỐI KHÔNG** viết API call hoặc business logic trong View/Widget.

---

## CHƯƠNG 4: TRIỂN KHAI VÀ KẾT QUẢ

### 4.1. Môi trường phát triển

| Thành phần | Cấu hình |
|-----------|---------|
| Hệ điều hành | macOS / Windows 11 |
| Flutter SDK | 3.x trở lên |
| Node.js | 20.x LTS |
| PostgreSQL | 15.x (local Docker) |
| Chroma Vector DB | 0.4.x (local Docker) |
| IDE | Visual Studio Code + Flutter Extension |
| Thiết bị kiểm thử | Android Emulator API 34, iOS Simulator 17 |

### 4.2. Kế hoạch thực hiện (60 ngày)

| Giai đoạn | Thời gian | Nội dung |
|-----------|-----------|---------|
| **Giai đoạn 1:** Nghiên cứu & Thiết kế | Ngày 1 – 10 | Nghiên cứu Vector DB, LLM, prompt engineering. Thiết kế DB schema, ERD, API contract, wireframe |
| **Giai đoạn 2:** Backend & AI | Ngày 11 – 30 | Xây dựng Express.js backend, PostgreSQL, tích hợp LLM API, Roleplay Engine, language feedback pipeline, Vector DB |
| **Giai đoạn 3:** Mobile App | Ngày 31 – 45 | Phát triển Flutter (MVVM+GetX), hoàn thiện tất cả màn hình từ Splash đến Result |
| **Giai đoạn 4:** Admin Portal & Testing | Ngày 46 – 55 | React Admin Portal, kiểm thử end-to-end, sửa lỗi, tối ưu hiệu năng |
| **Giai đoạn 5:** Báo cáo | Ngày 56 – 60 | Hoàn thiện luận văn, API docs, chuẩn bị demo |

### 4.3. Kết quả dự kiến

- ✅ Ứng dụng Flutter chạy được trên Android & iOS với **≥ 10 kịch bản** hội thoại
- ✅ Cổng quản trị React.js quản lý nội dung và xem báo cáo
- ✅ Backend Express.js với **13 endpoints API** đầy đủ + Swagger docs
- ✅ Báo cáo luận văn bao gồm so sánh Vector DB vs full-text search, đánh giá chất lượng LLM
- ✅ Mã nguồn trên GitHub + hướng dẫn cài đặt

---

## KẾT LUẬN

Hệ thống Scenio có **ba đóng góp khác biệt** so với ứng dụng học ngôn ngữ hiện tại:

1. **Mục tiêu giao tiếp cụ thể** — Mỗi kịch bản có nhiệm vụ rõ ràng, người học có định hướng và cảm nhận tiến bộ sau mỗi phiên.

2. **Vòng học tập khép kín** — Phản hồi ngôn ngữ ngay trong hội thoại + ôn tập qua transcript có chú thích giúp người học nhận ra và sửa lỗi trong ngữ cảnh thực.

3. **Vector Database cho gợi ý cá nhân hóa** — Ứng dụng Vector DB vào bài toán gợi ý kịch bản theo điểm yếu là hướng tiếp cận mới có tiềm năng mở rộng sang các ứng dụng giáo dục khác.

---

*Tài liệu này được tạo từ `Mo_Ta_He_Thong_Scenio.docx` — Cập nhật lần cuối: 2026-03-23*
