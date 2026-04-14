# Scenio — Tài liệu bổ sung: Onboarding, Level Test & Scene System

---

## Mục lục

1. [Onboarding Survey](#1-onboarding-survey)
2. [Level Test](#2-level-test)
3. [Hệ thống kịch bản — Scene System](#3-hệ-thống-kịch-bản--scene-system)
4. [Thay đổi Database Schema](#4-thay-đổi-database-schema)
5. [Thay đổi API](#5-thay-đổi-api)
6. [Luồng hoàn chỉnh từ đầu đến Home](#6-luồng-hoàn-chỉnh-từ-đầu-đến-home)

---

## 1. Onboarding Survey

### 1.1 Mục đích

Thu thập 3 thông tin mà Level Test không thể biết được, dùng để:
- Ưu tiên gợi ý kịch bản theo đúng mục tiêu của user
- Set daily mission phù hợp với tần suất học
- Cá nhân hóa thông điệp khuyến khích trong app

### 1.2 Có cần bảng DB riêng không?

**Không.** Chỉ thêm 3 cột vào bảng `users` hiện tại:

```sql
-- Thêm vào bảng users
learningGoal     VARCHAR   -- WORK | TRAVEL | DAILY | ALL
studyFrequency   VARCHAR   -- LIGHT(2-3/tuần) | REGULAR(5-6/tuần) | INTENSIVE(mỗi ngày)
selfAssessment   VARCHAR   -- VOCABULARY | GRAMMAR | NATURALNESS | CONFIDENCE
```

Cả 3 cột đều `nullable` — user được phép skip survey.

### 1.3 Nội dung 3 câu hỏi

```
Câu 1: "Bạn muốn cải thiện tiếng Anh để làm gì?"
  - WORK      → "Công việc & phỏng vấn"
  - TRAVEL    → "Du lịch & đi nước ngoài"
  - DAILY     → "Cuộc sống hàng ngày"
  - ALL       → "Tất cả đều cần"

Câu 2: "Bạn muốn luyện tập bao nhiêu lần mỗi tuần?"
  - LIGHT       → "2–3 lần / tuần"
  - REGULAR     → "5–6 lần / tuần"
  - INTENSIVE   → "Mỗi ngày"

Câu 3: "Bạn tự thấy mình yếu nhất ở đâu?"
  - VOCABULARY  → "Từ vựng còn ít"
  - GRAMMAR     → "Ngữ pháp hay sai"
  - NATURALNESS → "Nói không tự nhiên"
  - CONFIDENCE  → "Thiếu tự tin khi nói"
```

### 1.4 Cách dùng dữ liệu survey

**`learningGoal`** → Filter category khi gợi ý scene lần đầu:

| learningGoal | Ưu tiên category |
|---|---|
| WORK | WORK trước, rồi SOCIAL |
| TRAVEL | TRAVEL trước, rồi DAILY |
| DAILY | DAILY trước, rồi SOCIAL |
| ALL | Không filter, mix đều |

> Sau khi user có đủ 5 sessions, bỏ qua `learningGoal` và dùng điểm yếu thực tế thay thế.

**`studyFrequency`** → Số mission được tạo mỗi ngày:

| studyFrequency | Số mission/ngày |
|---|---|
| LIGHT | 2 missions |
| REGULAR | 3 missions |
| INTENSIVE | 3 missions + 1 weekly challenge |

**`selfAssessment`** → Ưu tiên kịch bản trước khi có dữ liệu thực:

| selfAssessment | Hành động |
|---|---|
| VOCABULARY | Ưu tiên scene có nhiều vocabulary list |
| GRAMMAR | Ưu tiên scene A2 để luyện cấu trúc câu |
| NATURALNESS | Ưu tiên scene có nhiều smalltalk |
| CONFIDENCE | Bắt đầu từ scene dễ nhất (A1/A2) |

### 1.5 Flutter flow

```
OnboardingSurveyView
  - 3 màn hình slide, mỗi slide 1 câu hỏi
  - Nút "Skip" ở mỗi slide (bỏ qua toàn bộ)
  - Nút "Next" sau khi chọn đáp án
  - Slide cuối: nút "Let's start!" → gọi API → navigate đến LevelTest

  State cần lưu trong ViewModel:
    - learningGoal: String?
    - studyFrequency: String?
    - selfAssessment: String?
    - currentSlide: int (0, 1, 2)
```

---

## 2. Level Test

### 2.1 Mục đích

Xác định trình độ tiếng Anh thực tế của user (A1–B2) thông qua hội thoại tự nhiên 5 lượt, không để user biết mình đang bị "test".

### 2.2 Có cần bảng DB riêng không?

**Không.** Level test là stateless — không lưu lịch sử hội thoại vào DB. Chỉ lưu kết quả cuối cùng (`user.level`) vào bảng `users`.

Flutter giữ `history` trong bộ nhớ ViewModel và gửi lên mỗi lượt. Khi app bị kill giữa chừng, test reset từ đầu — chấp nhận được vì chỉ có 5 lượt.

### 2.3 Cần thêm gì vào bảng `users`?

Thêm 2 cột:

```sql
needsLevelTest   BOOLEAN   DEFAULT TRUE   -- false sau khi hoàn thành test
levelTestedAt    TIMESTAMP NULL           -- thời điểm hoàn thành test
```

### 2.4 System prompt cho Level Test AI

Đây là prompt backend gửi cho LLM để điều khiển cuộc hội thoại kiểm tra trình độ:

```
You are a friendly English conversation partner named Alex.
Your hidden task is to assess the user's English level (A1, A2, B1, or B2)
through natural conversation — do NOT mention you are doing a test.

CONVERSATION RULES:
- Start with a simple warm greeting and an easy question
- Ask exactly 5 questions total, gradually increasing complexity
- React naturally to their answers (show interest, ask follow-ups)
- Keep your own sentences short and clear
- Do NOT correct their English during the conversation

QUESTION PROGRESSION:
- Turn 1: Very simple (name, where they're from, what they do)
- Turn 2: Simple present (hobbies, daily routine)
- Turn 3: Past tense (recent experience, last weekend)
- Turn 4: Opinion / preference (compare things, give reasons)
- Turn 5: Hypothetical or complex (future plans, if you could...)

ASSESSMENT CRITERIA:
After the 5th user response, analyze ALL their messages and determine:
- A1: Very basic words only, many errors, short sentences
- A2: Simple sentences, common vocabulary, some errors
- B1: Can express ideas, some complex sentences, occasional errors
- B2: Fluent expression, good grammar, varied vocabulary

FINAL RESPONSE FORMAT:
After assessing, end the conversation naturally, then on a NEW LINE append ONLY this JSON
(no other text after it):
[LEVEL_RESULT]{"level":"B1","rationale":"Có thể diễn đạt ý tưởng rõ ràng, đôi khi còn lỗi nhỏ"}[/LEVEL_RESULT]
```

### 2.5 Backend xử lý Level Test như thế nào

```
POST /sessions/level-test
  body: { message, turnIndex, history }

Backend:
  1. Gọi LLM với system prompt level test + history + message mới
  2. Nhận response từ LLM
  3. Kiểm tra response có chứa [LEVEL_RESULT]...[/LEVEL_RESULT] không
  4. Nếu có:
       - Parse JSON bên trong marker
       - Cập nhật user.level = result.level
       - Cập nhật user.needsLevelTest = false
       - Cập nhật user.levelTestedAt = now()
       - Strip marker khỏi aiMessage trước khi trả về Flutter
       - Trả về { isComplete: true, level: "B1", ... }
  5. Nếu không có:
       - Trả về { isComplete: false }
```

### 2.6 Flutter xử lý Level Test như thế nào

```dart
// LevelTestViewModel
class LevelTestViewModel extends GetxController {
  final RxList<Map<String, String>> history = <Map<String, String>>[].obs;
  final RxList<MessageModel> messages = <MessageModel>[].obs;
  final RxBool isComplete = false.obs;
  final RxBool isTyping = false.obs;
  int turnIndex = 0;

  @override
  void onInit() {
    super.onInit();
    _startTest(); // gọi lượt đầu tiên với message = null
  }

  Future<void> _startTest() async {
    // Lần đầu: gọi API không có message, chỉ để AI chào
    final result = await _repo.sendLevelTestMessage(
      message: null,
      turnIndex: 0,
      history: [],
    );
    _handleResponse(result);
  }

  Future<void> sendMessage(String text) async {
    isTyping.value = true;
    history.add({ 'role': 'USER', 'content': text });
    messages.add(MessageModel(role: 'user', content: text));

    final result = await _repo.sendLevelTestMessage(
      message: text,
      turnIndex: ++turnIndex,
      history: history,
    );
    _handleResponse(result);
  }

  void _handleResponse(LevelTestResult result) {
    isTyping.value = false;
    history.add({ 'role': 'AI', 'content': result.aiMessage });
    messages.add(MessageModel(role: 'ai', content: result.aiMessage));

    if (result.isComplete) {
      isComplete.value = true;
      Future.delayed(2.seconds, () {
        Get.offAllNamed(Routes.home); // xóa toàn bộ stack, vào Home
      });
    }
  }
}
```

### 2.7 UX Level Test

```
Màn hình LevelTestView trông giống ChatView bình thường:
  - Header: "Chat with Alex" (không ghi "Level Test")
  - Progress dots: ● ○ ○ ○ ○ (5 dots, fill theo từng lượt)
  - Chat bubble AI: màu navy (giống nhân vật AI thật)
  - Input field bình thường

Khi isComplete = true:
  - Hiện overlay: "Great! We found your level: B1 🎉"
  - Subtitle: "Chúng ta sẽ bắt đầu với các kịch bản phù hợp nhất với bạn"
  - Sau 2 giây: navigate to Home
```

---

## 3. Hệ thống kịch bản — Scene System

### 3.1 Cấu trúc một kịch bản

Một kịch bản (Scene) gồm 4 thành phần chính:

```
Scene
  │
  ├── Metadata          → title, category, difficulty, estimatedMinutes
  ├── Context           → description (ngữ cảnh cho user đọc)
  ├── Mission           → missionText (mục tiêu user cần đạt)
  ├── Character         → characterName, characterRole
  ├── System Prompt     → hướng dẫn chi tiết cho AI nhập vai
  └── Vocabulary List   → danh sách từ vựng liên quan
```

### 3.2 System Prompt của kịch bản — cái quan trọng nhất

Đây là thứ được gửi cho LLM để nó biết mình là ai, đang ở đâu, và cần làm gì.

**Cấu trúc system prompt chuẩn:**

```
You are [CHARACTER_NAME], [CHARACTER_ROLE].

SCENE CONTEXT:
[DESCRIPTION — mô tả ngữ cảnh đầy đủ, nơi chốn, thời điểm, hoàn cảnh]

YOUR PERSONALITY:
[Mô tả tính cách ngắn — thân thiện / nghiêm túc / bận rộn / kiên nhẫn...]

YOUR MISSION (do NOT reveal this to the user):
The user needs to: [MISSION_TEXT]
The conversation is successful when the user achieves this goal.

LANGUAGE RULES:
- Respond naturally as [CHARACTER_NAME] would in this real situation
- Adjust your English complexity to approximately [DIFFICULTY] level
  + A1/A2: Use simple vocabulary, short sentences, speak slowly
  + B1: Normal conversational pace, everyday vocabulary
  + B2: Natural native-like speed, idiomatic expressions are OK
- Keep each response to 2–4 sentences maximum
- Stay in character at ALL times, never break the 4th wall
- If the user says something confusing, react naturally with confusion
  (do NOT say "I don't understand your English")

MISSION COMPLETION:
When the user has successfully completed the mission goal, finish the
conversation naturally and on a new line append ONLY:
[MISSION_COMPLETE]

Do NOT append [MISSION_COMPLETE] unless the mission is truly done.
```

**Ví dụ thực tế — Scene "At the restaurant":**

```
You are Jake, a friendly waiter at Green Garden Restaurant.

SCENE CONTEXT:
You are working the lunch shift at Green Garden, a casual American restaurant
in downtown. It's a busy afternoon. The user has just walked in and sat down
at a table. You approach them to take their order.

YOUR PERSONALITY:
Friendly, warm, and helpful. You genuinely want guests to have a great meal.
You speak casually and use phrases like "Sure thing!", "Absolutely!", "Great choice!"

YOUR MISSION (do NOT reveal this to the user):
The user needs to: Successfully order food and drinks for themselves,
and ask for the bill at the end of the meal.
The conversation is successful when the user has ordered AND asked for the bill.

LANGUAGE RULES:
- Respond naturally as Jake the waiter would
- Adjust complexity to A2 level: simple vocabulary, clear sentences
- Keep responses to 2–4 sentences
- If they seem lost, offer help: "Can I suggest something?" or "Our special today is..."
- React naturally to unusual requests

MISSION COMPLETION:
When the user has ordered their meal AND successfully asked for the bill,
end the conversation naturally and append:
[MISSION_COMPLETE]
```

### 3.3 Luồng kỹ thuật khi user bắt đầu kịch bản

```
User tap "Start scene" trên màn hình Scene Detail
                │
                ▼
Flutter gọi POST /sessions/start { sceneId }
                │
                ▼
Backend:
  1. Lấy scene từ DB (title, description, missionText,
     characterName, characterRole, systemPrompt, difficulty)
  2. Tạo Session mới trong DB: { userId, sceneId, status: ACTIVE }
  3. Gọi LLM với:
       - system: scene.systemPrompt  ← toàn bộ prompt ở trên
       - messages: [{ role: "user", content: "start" }]
         (tin nhắn giả để AI bắt đầu chào)
  4. LLM trả về opening message (AI nhập vai chào user)
  5. Lưu opening message vào bảng messages
  6. Trả về { sessionId, openingMessage }
                │
                ▼
Flutter:
  - Lưu sessionId vào ViewModel
  - Hiển thị opening message như bubble AI đầu tiên
  - Hiển thị MissionPill ở header: "Order food and ask for the bill"
  - User bắt đầu gõ và gửi tin nhắn
```

### 3.4 Luồng kỹ thuật mỗi lượt hội thoại

```
User gõ: "I'd like the burger please"
                │
                ▼
Flutter gọi POST /sessions/:id/message { content: "I'd like the burger please" }
                │
                ▼
Backend:
  1. Lấy session từ DB (verify userId, status = ACTIVE)
  2. Lấy toàn bộ messages của session (để build history)
  3. Lưu tin nhắn user vào DB: { role: USER, content, turnIndex }
  4. Build message history cho LLM:
       [
         { role: "user", content: "start" },       ← tin nhắn giả ban đầu
         { role: "assistant", content: "Hi! Welcome to Green Garden..." },
         { role: "user", content: "I'd like the burger please" }
       ]
  5. Gọi Promise.all([
       // Call 1: Roleplay — AI phản hồi tiếp tục hội thoại
       LLM({ system: scene.systemPrompt, messages: history }),

       // Call 2: Evaluator — đánh giá câu user vừa nói
       LLM({ system: EVALUATOR_SYSTEM, messages: [{
         role: "user",
         content: evaluatorPrompt(userMessage, scene.description, scene.difficulty)
       }]})
     ])
  6. Từ Call 1: aiResponse = "Sure thing! How would you like it cooked?"
     Kiểm tra aiResponse.includes("[MISSION_COMPLETE]")
       → Nếu có: missionComplete = true, strip marker
       → Nếu không: missionComplete = false
  7. Từ Call 2: parse JSON → feedbackData
  8. Lưu AI message vào DB: { role: AI, content, feedbackData fields... }
  9. Nếu missionComplete:
       → Tính điểm từ tất cả messages trong session
       → Update session: { status: COMPLETED, grammarScore, vocabularyScore, naturalnessScore, xpEarned }
 10. Trả về { aiMessage, feedback, missionComplete }
```

### 3.5 Evaluator Prompt — cách AI đánh giá ngôn ngữ

Backend gọi LLM lần 2 với prompt này để đánh giá câu user vừa nói:

```
You are an English language evaluator for a [LEVEL] learner.

Evaluate this message from the learner:
"[USER_MESSAGE]"

Scene context: [SCENE_DESCRIPTION — 1 câu ngắn]

EVALUATION RULES:
- Only flag errors that are CLEARLY wrong and worth correcting
- For A1/A2 learners: accept minor errors, only flag major grammar mistakes
- For B1/B2 learners: flag naturalness issues too
- Never flag creative or unusual word choices as errors
- isGood = true only if phrasing is natural AND correct
- Never set hasError AND isGood both to true

Respond ONLY with this JSON, no other text:
{
  "hasError": boolean,
  "errorType": "GRAMMAR" | "NATURALNESS" | "VOCABULARY" | null,
  "originalPhrase": "the problematic phrase or null",
  "suggestion": "corrected version or null",
  "explanation": "giải thích ngắn bằng tiếng Việt, tối đa 12 từ, hoặc null",
  "isGood": boolean
}
```

**Ví dụ input/output:**

```
Input: "I'd like the burger please"
Output:
{
  "hasError": false,
  "errorType": null,
  "originalPhrase": null,
  "suggestion": null,
  "explanation": null,
  "isGood": true
}

Input: "I want order the burger"
Output:
{
  "hasError": true,
  "errorType": "GRAMMAR",
  "originalPhrase": "I want order",
  "suggestion": "I'd like to order",
  "explanation": "Sau 'want' cần thêm 'to' trước động từ",
  "isGood": false
}
```

### 3.6 Tính điểm sau khi kết thúc session

Backend tính điểm từ tất cả messages của user trong session:

```javascript
function calculateScores(messages) {
  const userMessages = messages.filter(m => m.role === 'USER' && !m.isHint);
  const total = userMessages.length;
  if (total === 0) return { grammar: 0, vocabulary: 0, naturalness: 0 };

  // Grammar score: % câu không có lỗi GRAMMAR
  const grammarErrors = userMessages.filter(m => m.errorType === 'GRAMMAR').length;
  const grammarScore = Math.round(((total - grammarErrors) / total) * 100);

  // Vocabulary score: % câu không có lỗi VOCABULARY
  const vocabErrors = userMessages.filter(m => m.errorType === 'VOCABULARY').length;
  const vocabularyScore = Math.round(((total - vocabErrors) / total) * 100);

  // Naturalness score: % câu được đánh dấu isGood
  const goodCount = userMessages.filter(m => m.isGood === true).length;
  const naturalnessScore = Math.round((goodCount / total) * 100);

  // XP earned: dựa trên average score
  const avgScore = Math.round((grammarScore + vocabularyScore + naturalnessScore) / 3);
  const xpEarned = Math.round(avgScore * 0.6); // max 60 XP per session

  return { grammarScore, vocabularyScore, naturalnessScore, xpEarned };
}
```

### 3.7 Ví dụ dữ liệu 1 kịch bản hoàn chỉnh (để seed DB)

```json
{
  "title": "At the restaurant",
  "category": "DAILY",
  "difficulty": "A2",
  "description": "Bạn đang vào một nhà hàng casual ở Mỹ lần đầu tiên. Một người phục vụ sẽ đến chào và nhận order của bạn.",
  "missionText": "Gọi món ăn và đồ uống, sau đó gọi tính tiền khi xong bữa",
  "estimatedMinutes": 5,
  "characterName": "Jake",
  "characterRole": "Waiter at Green Garden Restaurant",
  "systemPrompt": "You are Jake, a friendly waiter at Green Garden Restaurant...\n[full prompt như mục 3.2]",
  "vocabulary": [
    { "word": "menu", "definition": "Thực đơn", "example": "Can I see the menu?", "sortOrder": 1 },
    { "word": "recommend", "definition": "Gợi ý, giới thiệu", "example": "What do you recommend?", "sortOrder": 2 },
    { "word": "order", "definition": "Gọi món", "example": "I'd like to order the pasta.", "sortOrder": 3 },
    { "word": "bill", "definition": "Hoá đơn", "example": "Could I have the bill, please?", "sortOrder": 4 },
    { "word": "tip", "definition": "Tiền boa", "example": "Is the tip included?", "sortOrder": 5 }
  ]
}
```

---

## 4. Thay đổi Database Schema

### 4.1 Cập nhật bảng `users` — thêm 5 cột mới

```prisma
model User {
  // ... các cột hiện tại ...

  // Onboarding Survey
  learningGoal    String?   // WORK | TRAVEL | DAILY | ALL
  studyFrequency  String?   // LIGHT | REGULAR | INTENSIVE
  selfAssessment  String?   // VOCABULARY | GRAMMAR | NATURALNESS | CONFIDENCE

  // Level Test
  needsLevelTest  Boolean   @default(true)
  levelTestedAt   DateTime?

  // ... relations ...
}
```

> Ghi chú triển khai backend: để hỗ trợ trường hợp user bấm skip toàn bộ survey nhưng không bị lặp lại onboarding ở lần mở app sau, implementation có thể thêm `onboardingCompletedAt TIMESTAMP NULL` như một cờ hoàn thành survey.

### 4.2 Không cần bảng mới nào

| Tính năng | Cần bảng mới? | Lý do |
|---|---|---|
| Onboarding Survey | Không | 3 cột vào `users` là đủ |
| Level Test | Không | Stateless, chỉ lưu kết quả vào `users.level` |
| Scene System | Đã có | `scenes` + `scene_vocabulary` đủ rồi |

### 4.3 Migration command

```bash
# Sau khi cập nhật schema.prisma
npx prisma migrate dev --name "add_onboarding_and_level_test_fields"
```

---

## 5. Thay đổi API

### 5.1 Endpoint mới cần thêm

#### PATCH `/users/me/onboarding`

Lưu kết quả survey sau khi user hoàn thành 3 câu hỏi.

**Request**
```json
{
  "learningGoal": "WORK",
  "studyFrequency": "REGULAR",
  "selfAssessment": "GRAMMAR"
}
```

> Tất cả 3 field đều optional — user có thể skip một hoặc nhiều câu.

**Response 200**
```json
{
  "success": true,
  "data": {
    "updated": true
  }
}
```

#### POST `/sessions/level-test` ← đã có trong API_ENDPOINTS.md

Xem chi tiết tại file `API_ENDPOINTS.md` mục số 10.

### 5.2 Endpoint thay đổi

#### POST `/auth/register` và POST `/auth/google` — thêm field mới trong response

```json
{
  "success": true,
  "data": {
    "token": "...",
    "user": { ... },
    "isNewUser": true,           // ← mới
    "needsLevelTest": true,      // ← mới: Flutter dùng để quyết định routing
    "needsOnboarding": true      // ← mới: Flutter dùng để quyết định show survey
  }
}
```

#### GET `/home/dashboard` — `recommendedScenes` dùng `learningGoal`

Backend logic gợi ý scene thay đổi:

```javascript
// Nếu user chưa có sessions (mới vào)
if (totalSessions === 0) {
  // Dùng learningGoal để filter category
  const categoryFilter = mapGoalToCategory(user.learningGoal);
  scenes = await findScenesByCategory(categoryFilter, user.level);
} else {
  // Dùng điểm yếu thực tế từ sessions
  scenes = await findScenesByWeakSkill(user.id, user.level);
}
```

---

## 6. Luồng hoàn chỉnh từ đầu đến Home

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER MỚI — LẦN ĐẦU DÙNG APP               │
└─────────────────────────────────────────────────────────────────┘

  [1] Splash Screen (1.5s)
       → GET /auth/verify-token → 401 (chưa có token)
       → Navigate đến Onboarding slides

  [2] Onboarding Slides (3 slides giới thiệu tính năng)
       → Nút "Get started" → Navigate đến Auth screen

  [3] Auth Screen
       → Chọn "Sign up with email" HOẶC "Continue with Google"

  [3a] Email register:
        → POST /auth/register
        → Response: { isNewUser: true, needsLevelTest: true, needsOnboarding: true }

  [3b] Google login:
        → Lấy idToken từ google_sign_in
        → POST /auth/google
        → Response: { isNewUser: true, needsLevelTest: true, needsOnboarding: true }

  [4] OnboardingSurvey Screen (nếu needsOnboarding = true)
       → 3 slides, mỗi slide 1 câu hỏi
       → User chọn hoặc skip
       → PATCH /users/me/onboarding
       → Navigate đến Level Test

  [5] LevelTest Screen (nếu needsLevelTest = true)
       → Giao diện chat bình thường với "Alex"
       → POST /sessions/level-test × 5 lượt
       → Response lượt 5: { isComplete: true, level: "B1" }
       → Hiện overlay "Your level: B1!"
       → Sau 2s: Navigate đến Home (offAllNamed)

  [6] Home Screen
       → GET /home/dashboard
       → Hiển thị recommended scenes dựa trên level + learningGoal


┌─────────────────────────────────────────────────────────────────┐
│                  USER CŨ — MỞ LẠI APP                          │
└─────────────────────────────────────────────────────────────────┘

  [1] Splash Screen (1.5s)
       → GET /auth/verify-token → 200 { user, needsLevelTest: false }
       → Navigate thẳng đến Home


┌─────────────────────────────────────────────────────────────────┐
│               FLUTTER ROUTING LOGIC (SplashViewModel)           │
└─────────────────────────────────────────────────────────────────┘

  void onInit() {
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final token = storage.getToken();
    if (token == null) {
      Get.offAllNamed(Routes.onboarding);
      return;
    }

    final result = await authRepo.verifyToken();
    if (!result.success) {
      storage.clearToken();
      Get.offAllNamed(Routes.auth);
      return;
    }

    final user = result.user;
    if (user.needsOnboarding) {
      Get.offAllNamed(Routes.onboardingSurvey);
    } else if (user.needsLevelTest) {
      Get.offAllNamed(Routes.levelTest);
    } else {
      Get.offAllNamed(Routes.home);
    }
  }
```

---

## Tóm tắt những thứ cần làm thêm so với tài liệu cũ

| Hạng mục | Việc cần làm |
|---|---|
| **DB** | Thêm 5 cột vào `users`: `learningGoal`, `studyFrequency`, `selfAssessment`, `needsLevelTest`, `levelTestedAt` |
| **Backend** | Thêm endpoint `PATCH /users/me/onboarding` |
| **Backend** | Cập nhật response của `/auth/register` và `/auth/google` để trả thêm `isNewUser`, `needsLevelTest`, `needsOnboarding` |
| **Backend** | Cập nhật logic `/home/dashboard` để dùng `learningGoal` khi user chưa có sessions |
| **Backend** | Viết system prompt cho Level Test AI (mục 2.4) |
| **Backend** | Viết Evaluator prompt (mục 3.5) |
| **Backend** | Viết hàm `calculateScores()` (mục 3.6) |
| **Flutter** | Thêm màn hình `OnboardingSurveyView` + `OnboardingSurveyViewModel` |
| **Flutter** | Thêm màn hình `LevelTestView` + `LevelTestViewModel` |
| **Flutter** | Cập nhật routing logic trong `SplashViewModel` (mục 6) |
| **Seed data** | Tạo ít nhất 10 kịch bản đầy đủ (title, description, missionText, systemPrompt, vocabulary) |
