# Mobile Learning Loop Handoff

Tài liệu này nối phần backend hiện tại sang client mobile để Scenio không chỉ là app trò chuyện với AI, mà là một app học giao tiếp có vòng lặp: luyện tập -> chấm điểm -> chỉ lỗi -> sửa câu -> ôn lại -> gợi ý bài tiếp theo.

## 1. Mục tiêu sản phẩm cần demo

Luận văn/demo nên thể hiện được một vòng học hoàn chỉnh:

1. User chọn scene hoặc custom practice.
2. User hội thoại bằng text hoặc voice.
3. Client sync transcript/message về backend.
4. User kết thúc session.
5. Backend chấm điểm grammar, vocabulary, naturalness.
6. Backend trả feedback cho từng câu user nói/nhập.
7. Mobile hiển thị lỗi, câu sửa, giải thích, điểm số, XP.
8. Mobile đề xuất hành động học tiếp theo.

Điểm quan trọng: mobile phải biến dữ liệu BE thành trải nghiệm học tập. Nếu chỉ hiện chat transcript và điểm tổng thì app dễ bị nhìn như chatbot. Nếu hiện correction từng câu, giải thích, vocabulary save, và next practice thì app đúng chất learning app.

## 2. Backend hiện đã có gì

### Session completion

Endpoint:

```http
POST /api/sessions/:id/complete
```

Backend sẽ:

- Lấy transcript final của session.
- Gọi evaluator AI theo model setting admin.
- Nếu provider lỗi, fallback heuristic.
- Tính:
  - `grammarScore`
  - `vocabularyScore`
  - `naturalnessScore`
  - `xpEarned`
- Lưu feedback vào từng `USER` message.
- Đánh dấu session là `COMPLETED`.
- Grant XP, streak, mission progress.

### Session result

Endpoint:

```http
GET /api/sessions/:id/result
```

Backend trả:

- `session`: metadata session, XP, source scene/custom practice.
- `messages`: transcript đầy đủ.
- `scores`: 3 điểm chính.
- `spokenCoaching`: coaching tổng hợp cho voice/transcript.

Mỗi message có các field học tập:

```json
{
  "id": "uuid",
  "role": "USER",
  "content": "I go yesterday",
  "turnIndex": 3,
  "hasError": true,
  "errorType": "GRAMMAR",
  "originalPhrase": "I go yesterday",
  "suggestion": "I went yesterday",
  "explanation": "Sai thì quá khứ",
  "isGood": false,
  "feedbackDetails": {
    "issues": [
      {
        "type": "GRAMMAR",
        "subtype": "TENSE",
        "originalPhrase": "go yesterday",
        "suggestion": "went yesterday",
        "explanation": "Sai thì quá khứ",
        "startIndex": null,
        "endIndex": null
      }
    ]
  }
}
```

Nếu câu tốt:

```json
{
  "hasError": false,
  "errorType": null,
  "originalPhrase": null,
  "suggestion": null,
  "explanation": null,
  "isGood": true
}
```

## 3. Backend chưa có gì

Hiện evaluator đang trả một feedback chính cho mỗi `USER` message, chưa phải grammar checker chi tiết theo từng token.

Chưa có:

- Auto tạo vocabulary deck từ evaluator.
- Pronunciation assessment thật từ audio waveform.

Nhưng để demo luận văn, hiện trạng đã đủ để client render:

- điểm tổng,
- câu sai,
- loại lỗi,
- câu sửa,
- giải thích tiếng Việt,
- nhiều issue chi tiết qua `feedbackDetails.issues`,
- next learning action từ BE,
- coaching nói dựa trên transcript.

## 4. Mobile cần làm flow nào

### Flow text session

1. Start session:

```http
POST /api/sessions/start
```

2. Render opening message từ response.
3. Mỗi lượt user gửi text:

```http
POST /api/sessions/:id/message
```

Body:

```json
{
  "source": "USER_TEXT",
  "content": "I go yesterday",
  "isFinal": true
}
```

4. Nếu client có AI reply từ realtime/text flow thì sync AI reply:

```json
{
  "source": "AI_TEXT",
  "content": "When did you go there?",
  "isFinal": true
}
```

5. Khi user bấm Finish:

```http
POST /api/sessions/:id/complete
```

6. Điều hướng sang result:

```http
GET /api/sessions/:id/result
```

### Flow voice session

1. Start session với modality voice nếu flow hiện tại có chọn voice.
2. Mint realtime token:

```http
POST /api/sessions/:id/realtime-token
```

3. Client kết nối OpenAI Realtime/WebRTC.
4. Chỉ sync final transcript về backend, không sync partial.
5. User final transcript:

```json
{
  "source": "USER_AUDIO",
  "content": "I need check in one bag",
  "isFinal": true,
  "providerEventId": "provider_event_id",
  "audioStartMs": 1200,
  "audioEndMs": 4200
}
```

6. AI final transcript:

```json
{
  "source": "AI_AUDIO",
  "content": "Sure. May I see your passport?",
  "isFinal": true,
  "providerEventId": "provider_ai_event_id",
  "audioStartMs": 4300,
  "audioEndMs": 6900
}
```

7. Khi kết thúc:

```http
POST /api/sessions/:id/complete
GET /api/sessions/:id/result
```

## 5. Mobile screens cần có

### 5.1. Practice screen

Mục tiêu: user luyện tập, không bị ngắt mạch bởi correction quá sớm.

Nên hiển thị:

- AI opening message.
- Transcript/chat bubbles.
- Hint button.
- Finish button.
- Voice state nếu là voice: listening, speaking, connecting, reconnecting.

Không nên spam correction realtime trong phase này. Feedback nên để cuối session để user tập trung hội thoại.

### 5.2. Session result overview

Mục tiêu: user thấy mình làm tốt/chưa tốt ở đâu.

Nên có:

- Score cards:
  - Grammar
  - Vocabulary
  - Naturalness
- XP earned.
- Streak/mission reward nếu có.
- Summary từ `spokenCoaching.summary`.
- Strengths từ `spokenCoaching.strengths`.
- Improvements từ `spokenCoaching.improvements`.

Suggested UI copy:

- `Grammar`
- `Vocabulary`
- `Naturalness`
- `What went well`
- `Try improving`

### 5.3. Transcript correction screen

Mục tiêu: biến transcript thành bài học.

Mỗi `USER` message nên render một correction card:

Nếu `isGood = true`:

- Badge: `Good`
- Original sentence.
- Optional note: `This sentence worked well in context.`

Nếu `hasError = true`:

- Badge theo `errorType`:
  - `GRAMMAR`
  - `VOCABULARY`
  - `NATURALNESS`
- Original phrase hoặc full content.
- Suggested sentence.
- Vietnamese explanation.
- Action:
  - `Practice this sentence`
  - `Save vocabulary`
  - `Try again`

Mapping gợi ý:

| BE field | Mobile display |
|---|---|
| `content` | Câu gốc trong transcript |
| `hasError` | Có hiển thị correction hay không |
| `errorType` | Màu/badge lỗi |
| `originalPhrase` | Cụm bị sai |
| `suggestion` | Câu/cụm nên dùng |
| `explanation` | Giải thích ngắn tiếng Việt |
| `isGood` | Badge câu tốt |
| `feedbackDetails.issues` | Danh sách lỗi chi tiết trong một câu |

### 5.4. Spoken coaching panel

Mục tiêu: riêng voice session, user hiểu chất lượng nói dựa trên transcript.

Dùng `spokenCoaching`:

- `scores.expression`
- `scores.clarity`
- `scores.confidence`
- `turnHighlights`
- `behaviorSignals`

Lưu ý wording trên UI: hiện đây là transcript-based coaching, không phải pronunciation score thật.

UI nên ghi nhẹ:

`Based on your transcript and response flow, not a pronunciation test yet.`

### 5.5. Next learning action

Mục tiêu: user biết làm gì sau khi xem lỗi.

Client có thể tự suy ra từ `scores`:

- Grammar thấp nhất -> CTA `Practice grammar in a similar scene`.
- Vocabulary thấp nhất -> CTA `Review useful phrases`.
- Naturalness thấp nhất -> CTA `Try a more natural conversation`.

Suggested logic:

```text
weakestSkill = min(grammar, vocabulary, naturalness)

grammar -> show grammar practice CTA
vocabulary -> show save/review vocabulary CTA
naturalness -> show retry scene / similar social scene CTA
```

Backend cũng trả sẵn `nextLearningAction` trong result. Nếu field này có dữ liệu, mobile nên ưu tiên dùng field BE thay vì tự suy luận.

```json
{
  "nextLearningAction": {
    "type": "GRAMMAR_PRACTICE",
    "focus": "GRAMMAR",
    "title": "Practice cleaner sentence structure",
    "reason": "Grammar is your lowest score (72) with 2 grammar issue(s).",
    "ctaLabel": "Practice grammar",
    "suggestedSceneQuery": "Airport Check-in grammar follow-up"
  }
}
```

## 6. Client models nên tạo

Tên chỉ là gợi ý, bám architecture mobile hiện tại: Model -> Repository -> ViewModel -> View.

```dart
class SessionResultModel {
  final SessionSummaryModel session;
  final List<SessionMessageModel> messages;
  final SessionScoresModel scores;
  final SpokenCoachingModel? spokenCoaching;
}

class SessionMessageModel {
  final String id;
  final String role;
  final String content;
  final int turnIndex;
  final String modality;
  final bool isFinal;
  final bool? hasError;
  final String? errorType;
  final String? originalPhrase;
  final String? suggestion;
  final String? explanation;
  final bool? isGood;
  final Map<String, dynamic>? feedbackDetails;
  final bool isHint;
}

class SessionScoresModel {
  final int? grammar;
  final int? vocabulary;
  final int? naturalness;
}
```

## 7. Repository methods mobile cần có

```dart
Future<SessionStartResult> startSession(String sceneId);
Future<SessionStartResult> startCustomSession(StartCustomPracticeRequest request);
Future<SessionMessageResult> syncSessionMessage(String sessionId, SyncMessageRequest request);
Future<SessionCompletionResult> completeSession(String sessionId);
Future<SessionResultModel> getSessionResult(String sessionId);
Future<SessionHintResult> requestHint(String sessionId, {String? focus});
Future<void> abandonSession(String sessionId);
```

Với voice:

```dart
Future<RealtimeTokenResult> createRealtimeToken(String sessionId);
```

## 8. ViewModel state gợi ý

Practice ViewModel:

```text
idle
starting
active
syncingMessage
requestingHint
completing
completed
error
```

Result ViewModel:

```text
loading
loaded
retryingLoad
error
```

Voice ViewModel:

```text
connecting
connected
listening
userSpeaking
aiSpeaking
reconnecting
ended
error
```

## 9. Cách client biết user sai gì

Client không tự chấm. Client đọc từ result:

```text
GET /sessions/:id/result
  -> messages[]
    -> role == USER
    -> hasError == true
    -> errorType
    -> originalPhrase
    -> suggestion
    -> explanation
    -> feedbackDetails.issues[]
```

Render rule:

- `hasError = true`: hiện correction card.
- `isGood = true`: hiện positive card.
- `errorType = GRAMMAR`: màu/label grammar.
- `errorType = VOCABULARY`: gợi ý lưu từ/cụm từ.
- `errorType = NATURALNESS`: gợi ý câu tự nhiên hơn.
- `feedbackDetails.issues` có nhiều item: render danh sách lỗi nhỏ trong correction detail.

Nếu `hasError`, `isGood` đều null thì message đó chưa được evaluator xử lý. UI nên hiển thị transcript bình thường, không hiện correction.

## 10. Vocabulary loop

Hiện BE có module vocabulary, client có thể dùng ngay để lưu từ/cụm từ sau correction.

Khi `errorType = VOCABULARY`, mobile có thể hiển thị nút:

`Save phrase`

Client có thể lấy:

- phrase: `originalPhrase` hoặc phrase trong `suggestion`
- definition: tạm để user nhập hoặc dùng explanation
- example: `suggestion`

Nếu muốn làm đúng hơn ở phase sau, BE nên thêm endpoint auto-extract vocabulary từ session result.

## 11. Demo script cho luận văn

Kịch bản demo nên đi như sau:

1. Login learner.
2. Chọn scene `Airport Check-in`.
3. Start voice/text session.
4. User nói/nhập vài câu có lỗi:
   - `I need check in one bag`
   - `I go to Paris yesterday`
   - `Where gate?`
5. Kết thúc session.
6. Mobile hiện:
   - Grammar/Vocabulary/Naturalness score.
   - XP earned.
   - Transcript từng lượt.
   - Câu sửa:
     - `I need to check in one bag.`
     - `I went to Paris yesterday.`
     - `Which gate should I go to?`
   - Giải thích tiếng Việt ngắn.
7. User bấm save phrase hoặc try similar scene.

Thông điệp báo cáo:

`Scenio không chỉ tạo hội thoại AI, mà còn biến transcript thành dữ liệu học tập: chấm điểm, chỉ lỗi, gợi ý câu đúng, và điều hướng bài học tiếp theo.`

## 12. Việc nên làm tiếp theo

### Ưu tiên 1: mobile result/correction UI

Làm trước vì BE đã có dữ liệu. Đây là phần giúp demo khác chatbot.

Deliverables:

- Result overview screen.
- Transcript correction list.
- Correction detail bottom sheet.
- CTA next learning action.

### Ưu tiên 2: cải tiến evaluator schema

Sau khi UI chạy được, nâng BE để feedback chi tiết hơn:

```json
{
  "messageId": "uuid",
  "issues": [
    {
      "type": "GRAMMAR",
      "subtype": "TENSE",
      "originalPhrase": "I go yesterday",
      "suggestion": "I went yesterday",
      "explanation": "Sai thì quá khứ"
    }
  ]
}
```

Lúc đó mobile có thể render nhiều lỗi trong một câu.

### Ưu tiên 3: next learning recommendation từ BE

BE có thể trả thêm:

```json
{
  "nextLearningAction": {
    "type": "GRAMMAR_PRACTICE",
    "title": "Practice past tense in a travel scene",
    "reason": "Grammar is your lowest score today."
  }
}
```

### Ưu tiên 4: vector recommend

Dùng Gemini embedding + Chroma để recommend scene theo lỗi thật của user:

- Grammar yếu -> scene cần nhiều câu hỏi/câu quá khứ.
- Vocabulary yếu -> scene cùng topic để ôn cụm từ.
- Naturalness yếu -> scene social/daily giúp luyện phản xạ.

## 13. Definition of Done cho learning loop

Một vòng học được xem là đủ demo khi:

- User hoàn thành được session.
- Backend tự chấm điểm, client không tự truyền score làm nguồn chính.
- Result screen hiện score và XP.
- Ít nhất 3 user messages có feedback hoặc good badge.
- User nhìn thấy câu gốc, câu sửa, giải thích.
- User có hành động học tiếp theo sau result.
