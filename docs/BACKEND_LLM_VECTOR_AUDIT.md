# Backend Audit - LLM, Voice, Vector DB

**Ngày audit:** 2026-04-21  
**Phạm vi:** backend `scenio_be`  
**Mục tiêu:** trả lời thẳng câu hỏi “backend đã hoàn thành đến đâu, đặc biệt là LLM và vector DB?”

---

## 1. Kết luận nhanh

**Kết luận ngắn:** backend **chưa hoàn thành fully** nếu nhìn theo vision gốc của Scenio.

### Trạng thái thực tế theo code hiện tại

- **Core REST backend:** khá đầy đủ
- **LLM text features:** đã có nền, nhưng **mới hoàn thành một phần**
- **Realtime voice foundation:** đã có nền, nhưng **chưa phải full production loop**
- **Vector DB / Chroma / embeddings:** **chưa hoàn thành**, gần như mới ở mức config + định hướng

### Kết luận gọn nhất

- Nếu hỏi: **“backend app đã dùng được chưa?”**
  - **Có**, cho rất nhiều flow non-LLM và một phần flow AI/voice
- Nếu hỏi: **“đã xong vision AI roleplay + semantic vector search chưa?”**
  - **Chưa**

---

## 2. Cách mình đánh giá

Tài liệu này bám theo:

- route thực tế trong `src/app.ts`
- logic thật trong `src/modules/**`
- config thật trong `src/config/**`
- schema Prisma thật trong `prisma/schema.prisma`

Nói cách khác:

- **ưu tiên code hiện tại**
- **không ưu tiên mô tả marketing trong README**

---

## 3. Phần backend đã làm xong tương đối tốt

## 3.1. Core business backend

Các phần này nhìn chung đã có route, controller, service, repository và contract khá rõ:

- auth
- users
- home
- scenes
- sessions
- missions
- vocabulary
- voices
- admin

### Những endpoint/backend flow đã có thật

- auth email/password + Google + refresh + logout + verify token
- onboarding
- level test
- home dashboard
- scene list / detail / search / recommend
- start session
- start custom practice session
- mint realtime token
- session result / abandon
- vocabulary dictionary + decks + review
- voice catalog + preview
- admin overview / users / scenes / missions / badges / voices

### Kết luận phần này

Backend **không còn ở trạng thái skeleton** nữa.  
Nó đã là một backend có cấu trúc thật, có thể nuôi được mobile/admin khá xa.

---

## 4. Phần LLM đã làm tới đâu

## 4.1. Những gì đã có

### 1. Có abstraction text provider

File:

- `src/config/llm.ts`

Hiện backend đã có:

- chọn provider qua `LLM_PROVIDER`
- hỗ trợ `claude`
- hỗ trợ `openai`
- validate API key

### 2. Level test có gọi LLM thật

File chính:

- `src/modules/sessions/sessions.service.ts`

Hiện đã có:

- prompt cho level test
- parse `[LEVEL_RESULT]...[/LEVEL_RESULT]`
- update level cho user khi hoàn tất

Tức là:

- đây là **LLM flow thật**
- không còn chỉ là placeholder

### 3. Hint có gọi LLM thật

File chính:

- `src/modules/sessions/sessions.service.ts`

Hiện đã có:

- lấy transcript gần nhất
- build prompt hint
- gọi Claude/OpenAI
- fallback deterministic nếu provider lỗi

### 4. Custom practice đã có prompt composition tốt

File chính:

- `src/modules/sessions/sessions.service.ts`

Hiện đã có:

- structured brief
- context
- role
- gender presentation
- voice tone
- difficulty
- focus skills
- must-use vocabulary
- avoid topics
- system prompt cho custom practice

Điểm này rất tốt vì nó đúng tinh thần đề tài.

### 5. Realtime voice token đã có

File chính:

- `src/config/realtime.ts`
- `src/modules/sessions/sessions.realtime.service.ts`
- `src/modules/sessions/sessions.service.ts`

Hiện đã có:

- mint OpenAI realtime client secret
- build realtime instructions từ scene/custom practice + learner level + voice persona
- lưu `providerSessionId`

### 6. Voice preview / TTS đã có

File chính:

- `src/config/tts.ts`
- `src/modules/voices/voices.service.ts`

Hiện đã có:

- preview bằng ElevenLabs nếu có `providerVoiceId`
- fallback sang OpenAI TTS

---

## 4.2. Những gì **chưa xong** ở phần LLM

Đây là phần quan trọng nhất.

### 1. Session roleplay turn-by-turn chưa có “server LLM conversation loop”

Hiện tại:

- `startSession()` tạo **opening message deterministic**
- `startCustomSession()` cũng tạo **opening message deterministic**

Nghĩa là:

- backend **chưa tự gọi LLM để sinh từng câu AI reply** trong flow chat chuẩn
- live conversation hiện đang nghiêng về việc **client nói trực tiếp với realtime provider**

### 2. `POST /sessions/:id/message` hiện là sync transcript, không phải AI engine

Hiện tại endpoint này chủ yếu:

- nhận finalized transcript/text từ client
- lưu vào DB
- optional complete session

Nó **không phải** endpoint:

- nhận user message
- gọi LLM
- sinh AI reply
- chấm lỗi ngôn ngữ
- trả reply hoàn chỉnh

Tức là:

- tên route nghe giống “chat engine”
- nhưng thực tế hiện tại là **transcript persistence + session sync**

### 3. Scoring/evaluation chưa do backend tự tính bằng AI

Trong `sendSessionMessageSchema` hiện có:

- `completeSession.grammarScore`
- `completeSession.vocabularyScore`
- `completeSession.naturalnessScore`
- `completeSession.xpEarned`

Điều này cho thấy ở trạng thái hiện tại:

- backend **chưa có evaluator riêng đủ hoàn chỉnh**
- score đang được **đẩy vào từ phía client hoặc flow khác**

Đây là một gap lớn.

### 4. Chưa có grammar/vocabulary feedback engine hoàn chỉnh

Trong schema DB, `Message` đã có sẵn các field như:

- `hasError`
- `errorType`
- `originalPhrase`
- `suggestion`
- `explanation`
- `isGood`

Nhưng ở flow lưu message hiện tại:

- các field này **chưa được populate đầy đủ bởi AI**

Nghĩa là:

- data model đã chuẩn bị
- nhưng business logic feedback per-turn **chưa hoàn thiện**

### 5. Chưa có pronunciation assessment thật

Hiện tại repo chưa thấy integration production nào cho:

- Azure Pronunciation Assessment
- hoặc engine pronunciation scoring tương đương

Điều này quan trọng vì Scenio là app học giao tiếp bằng voice.

### 6. Chưa có STT pipeline backend-owned

Hiện tại backend đang theo hướng:

- client / realtime provider xử lý speech
- backend nhận transcript final để lưu

Tức là backend chưa sở hữu:

- upload audio
- STT riêng
- alignment / word timing
- pronunciation scoring pipeline

### 7. Realtime hiện là OpenAI-only, chưa có provider abstraction thật sự

`src/config/realtime.ts` hiện đang gắn chặt vào:

- OpenAI Realtime

Điều này không sai cho MVP, nhưng nó có nghĩa:

- chưa có abstraction tốt cho việc đổi qua provider khác như ElevenLabs Agent / Gemini Live sau này

---

## 4.3. Đánh giá phần LLM hiện tại

Nếu tách nhỏ:

- **LLM text utility:** khá ổn
- **LLM conversation brain hoàn chỉnh:** chưa xong
- **AI evaluation / scoring / feedback:** chưa xong
- **voice learning intelligence:** chưa xong

### Nhận định thực dụng

Backend hiện tại đã có:

- **AI foundation**

nhưng chưa có:

- **AI gameplay loop hoàn chỉnh**

---

## 5. Phần vector DB / Chroma đã làm tới đâu

## 5.1. Những gì đã có

### 1. Có config Chroma

File:

- `src/config/chroma.ts`

Hiện có:

- `ChromaClient`
- `getOrCreateCollection()`

### 2. Có env cho Chroma và embedding

Trong `.env.example` có:

- `CHROMA_HOST`
- `CHROMA_PORT`
- `CHROMA_COLLECTION`
- `EMBEDDING_MODEL=text-embedding-3-small`

### 3. README và docs có nhắc mạnh tới semantic search

Ví dụ:

- README nói backend là cầu nối tới Chroma
- README nói `/api/scenes/search` là semantic vector search
- docs phase cũ cũng nói tới embedding / Chroma search

---

## 5.2. Những gì **chưa có thật** ở phần vector DB

Đây là chỗ lệch lớn nhất giữa docs và code.

### 1. `src/config/chroma.ts` đang chưa được dùng trong business flow nào

Khi rà import/use trong code hiện tại:

- không thấy `chroma.ts` được import vào `scenes`, `home`, `sessions`, `recommend`, hay script sync nào

Nghĩa là:

- **Chroma đang tồn tại về mặt config**
- nhưng **chưa tham gia vào nghiệp vụ**

### 2. Chưa có service embeddings

Hiện chưa thấy:

- `scenes.embedding.service.ts`
- `embedScene(...)`
- `upsertSceneEmbedding(...)`
- `searchSimilarScenes(...)`

### 3. Chưa có flow sync scene -> Chroma

Hiện chưa thấy:

- khi create/update scene thì upsert sang Chroma
- khi deactivate/delete scene thì remove khỏi Chroma
- seed scene xong thì sync embeddings

### 4. Chưa có query semantic search thật

`GET /api/scenes/search` hiện tại là:

- text search bằng PostgreSQL `contains`
- internal ranking bằng heuristic score

Không phải:

- embedding query
- nearest-neighbor search
- semantic similarity search

### 5. Chưa có recommend bằng vector similarity

`GET /api/scenes/recommend` hiện tại là:

- heuristic DB-only
- dựa trên user level
- recent completed sessions
- weak skill heuristic
- category priority

Không phải:

- vector similarity giữa learner profile / session history và scene embeddings

### 6. Chưa có metadata/ID strategy cho Chroma documents

Hiện chưa thấy:

- document id mapping `sceneId -> vector doc`
- metadata schema cho category/difficulty/isActive
- filter layer kết hợp vector + relational filter

---

## 5.3. Đánh giá phần vector DB hiện tại

Nếu nói thẳng:

- **Chroma chưa được triển khai thật**

Nó đang ở trạng thái:

- config có
- env có
- ý tưởng có
- docs có
- nhưng **nghiệp vụ chưa có**

### Kết luận thực dụng

Phần vector DB hiện tại nên được xem là:

- **planned**
- **not implemented**

---

## 6. Những chỗ docs hiện tại đang “đi trước code”

## 6.1. README đang nói mạnh hơn code thật

README hiện mô tả:

- semantic scene search bằng Chroma
- embeddings
- dual-LLM roleplay engine

Nhưng code hiện tại mới đúng hơn là:

- scene search text-based
- recommend heuristic-based
- LLM dùng cho level test + hint + realtime token foundation
- chưa có roleplay evaluator loop hoàn chỉnh

## 6.2. API docs đã trung thực hơn README

Điểm tốt là `docs/API_ENDPOINT.md` hiện đã ghi rõ:

- `search` hiện là text search
- `recommend` hiện là heuristic DB-only

Tức là:

- **API docs đáng tin hơn README** ở phần này

---

## 7. Mức độ hoàn thành theo từng mảng

> Các tỷ lệ dưới đây là **ước lượng kỹ thuật từ code hiện tại**, không phải số đo chính thức.

| Mảng | Mức độ | Ghi chú |
|---|---:|---|
| Core backend REST | 85% | khá đầy đủ cho mobile/admin |
| Auth / user / missions / vocabulary / admin | 85-90% | dùng tốt |
| Scene & session data model | 80% | tốt cho MVP |
| LLM text utilities | 65% | level test + hint ổn |
| Realtime voice foundation | 60% | có token + persona + voice selection |
| Roleplay AI loop hoàn chỉnh | 35% | chưa có full evaluator / reply orchestration ở backend |
| Pronunciation / speech assessment | 10% | gần như chưa làm |
| Vector DB / semantic search | 10% | config có, flow thật chưa có |

---

## 8. Những việc còn thiếu nên ưu tiên

## 8.1. Ưu tiên 1 - Chốt AI loop của session

Nên làm tiếp:

- xác định rõ `AI reply` đi theo đường nào:
  - realtime provider trực tiếp
  - hay backend text orchestrator
- tách rõ:
  - `roleplay model`
  - `evaluator/scoring model`
- backend tự chốt:
  - score
  - feedback
  - mission complete
  - XP

### Mục tiêu

Để session không còn phụ thuộc vào client gửi score vào.

---

## 8.2. Ưu tiên 2 - Hoàn thiện voice learning

Nên làm tiếp:

- pronunciation assessment
- STT fallback / upload-audio path
- better transcript event model
- word-level / utterance-level feedback

---

## 8.3. Ưu tiên 3 - Triển khai vector DB thật

Nên làm tiếp:

- viết service embeddings cho scene
- sync create/update/delete scene với Chroma
- viết search bằng embedding
- nâng `recommendScenes` từ heuristic sang hybrid:
  - heuristic + vector similarity

---

## 8.4. Ưu tiên 4 - Dọn docs cho khớp code

Nên làm tiếp:

- hạ mức khẳng định trong README
- ghi rõ đâu là `implemented`, đâu là `planned`

---

## 9. Backlog kỹ thuật gợi ý

## Phase A - LLM session completion

- [ ] backend-owned evaluator cho session result
- [ ] tự tính `grammarScore`, `vocabularyScore`, `naturalnessScore`
- [ ] tự grant XP từ backend
- [ ] populate feedback fields trong `Message`

## Phase B - Voice learning completion

- [ ] pronunciation assessment
- [ ] speech scoring
- [ ] transcript timing tốt hơn
- [ ] finalization flow rõ giữa realtime provider và backend

## Phase C - Vector DB completion

- [ ] scene embedding service
- [ ] scene -> Chroma sync job
- [ ] semantic `searchScenes`
- [ ] hybrid `recommendScenes`

## Phase D - Docs alignment

- [ ] sửa README để bớt overclaim
- [ ] cập nhật architecture docs theo code thật

---

## 10. Chốt lại một câu

Nếu nói thật theo code hiện tại:

- **LLM đã có nền thật, nhưng chưa hoàn thành gameplay loop đầy đủ**
- **vector DB/Chroma chưa được triển khai nghiệp vụ thật**

Nói ngắn nhất:

- **backend core: khá ổn**
- **AI/voice: đang ở giữa đường**
- **vector search: chưa xong**
