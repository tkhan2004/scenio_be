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
| 9 | GET | `/scenes/search` | ✓ | Tìm kiếm kịch bản theo từ khóa | ✅ Done |
| 10 | GET | `/scenes/recommend` | ✓ | Gợi ý kịch bản theo điểm yếu | ⏳ Todo |
| 11 | GET | `/scenes/:id` | ✓ | Chi tiết kịch bản đầy đủ | ✅ Done |
| **SESSIONS** |
| 12 | POST | `/sessions/level-test` | ✓ | Bài kiểm tra trình độ AI (5 lượt) | ✅ Done |
| 13 | POST | `/sessions/start` | ✓ | Bắt đầu phiên học mới | ⏳ Todo |
| 14 | POST | `/sessions/:id/message` | ✓ | Gửi tin nhắn & Nhận feedback AI | ⏳ Todo |
| 15 | POST | `/sessions/:id/hint` | ✓ | Dùng hint (tối đa 3 hint/phiên) | ⏳ Todo |
| 16 | GET | `/sessions/:id/result` | ✓ | Lấy kết quả & Transcript chi tiết | ⏳ Todo |
| 17 | PATCH | `/sessions/:id/abandon` | ✓ | Thoát phiên giữa chừng | ⏳ Todo |
| **USERS** |
| 18 | GET | `/users/me` | ✓ | Lấy thông tin Profile cá nhân | ✅ Done |
| 18a | PATCH | `/users/me/onboarding` | ✓ | Lưu kết quả onboarding survey | ✅ Done |
| 19 | PATCH | `/users/me` | ✓ | Cập nhật displayName, avatarUrl | ✅ Done |
| 20 | POST | `/users/xp` | ✓ | Cộng XP + cập nhật streak + missions | ⏳ Todo |
| 21 | GET | `/users/progress` | ✓ | Thống kê học tập (XP/Skill chart) | ✅ Done |
| 22 | GET | `/users/badges` | ✓ | Danh sách Achievements/Badges | ✅ Done |
| **MISSIONS** |
| 23 | GET | `/missions/today` | ✓ | Danh sách nhiệm vụ hằng ngày | ✅ Done |
| **VOCABULARY** |
| 24 | GET | `/vocabulary` | ✓ | Danh sách từ vựng đã lưu | ⏳ Todo |
| 25 | POST | `/vocabulary` | ✓ | Thêm từ vựng mới (Auto/Manual) | ⏳ Todo |
| 26 | DELETE | `/vocabulary/:id` | ✓ | Xóa từ khỏi danh sách học | ⏳ Todo |

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
Tìm scene theo từ khóa cho user hiện tại. Bản hiện tại dùng text search trong PostgreSQL; vector search sẽ được nâng cấp sau nhưng vẫn giữ nguyên route và response shape.

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
        "characterRole": "Check-in Staff"
      }
    ]
  }
}
```

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

---

### 14. POST `/sessions/:id/message`
Hệ thống gọi đồng thời 2 LLM: AI Character Chat + Evaluator Feedback.

**Feedback Object:**
- `hasError`: boolean
- `correction`: Chuỗi sửa lại đúng ngữ pháp.
- `explanation`: Tại sao lại sai và dùng từ nào hay hơn.
- `annotationColor`: `amber` (có lỗi), `green` (rất tốt), `null` (bình thường).

---

### 16. GET `/sessions/:id/result`
Lấy báo cáo tổng kết & Transcript annotated.

**Scores:** `{ "grammar": 88, "vocabulary": 75, "naturalness": 82 }`
**Annotation Colors:** Dùng để Front-end hightlight nội dung câu của User.

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

---

## 4. Bảng mã lỗi (Standardized Error Codes)
- `VALIDATION_ERROR` (400): Input không đúng định dạng Zod.
- `INVALID_CREDENTIALS` (401): Sai email hoặc mật khẩu.
- `UNAUTHORIZED` (401): Access Token hết hạn/sai.
- `FORBIDDEN` (403): Không có quyền truy cập (vd: Admin API).
- `SCENE_NOT_FOUND` (404): ID kịch bản không hợp lệ.
- `SESSION_ALREADY_ACTIVE` (409): Người dùng đang có session chưa hoàn thành cho scene này.
- `AI_ENGINE_ERROR` (502): LLM Server gặp sự cố.
