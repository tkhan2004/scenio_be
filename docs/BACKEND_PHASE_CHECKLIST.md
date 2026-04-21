# Backend Phase Checklist

**Ngày tạo:** 2026-04-21  
**Phạm vi:** `scenio_be`  
**Mục đích:** file checklist ưu tiên để team backend bám theo từ giờ về sau. Cái nào làm xong thì tick trực tiếp trong file này.

---

## 1. Cách dùng file này

- Ưu tiên làm từ trên xuống dưới
- Chỉ mở phase tiếp theo khi phase phía trên đã đủ ổn
- Nếu một task đã làm xong thật trong code và đã verify, tick `[x]`
- Nếu mới có ý tưởng hoặc mới viết doc mà chưa có code chạy thật, giữ `[ ]`

### Quy ước ưu tiên

- `P0`: cực kỳ quan trọng, nên làm trước
- `P1`: quan trọng, làm ngay sau `P0`
- `P2`: nên làm sau khi core loop đã ổn
- `P3`: polish / hardening / scale

---

## 2. Baseline hiện tại

Phần này là những gì backend **đã có nền thật** theo audit hiện tại.

### Core backend

- [x] Auth email/password
- [x] Google login
- [x] Refresh token / logout / verify token
- [x] Home dashboard
- [x] Users profile / onboarding / progress / badges / XP
- [x] Missions today
- [x] Scenes list / detail / text search / heuristic recommend
- [x] Sessions start / start-custom / result / abandon
- [x] Vocabulary dictionary / deck / review
- [x] Voices catalog / preview
- [x] Admin overview / users / scenes / missions / badges / voices

### AI / voice foundation

- [x] LLM provider abstraction (`claude` / `openai`)
- [x] Level test bằng LLM
- [x] Hint generation bằng LLM
- [x] Custom practice prompt composition
- [x] OpenAI realtime token minting
- [x] Voice preview qua ElevenLabs hoặc OpenAI TTS fallback

### Những gì **chưa được xem là hoàn thành**

- [ ] Backend-owned AI roleplay loop hoàn chỉnh
- [ ] Backend-owned scoring / evaluator loop hoàn chỉnh
- [ ] Pronunciation assessment thật
- [ ] Semantic vector search bằng Chroma
- [ ] Hybrid recommend bằng vector + heuristic

---

## 3. Phase 1 - Hoàn thiện AI Session Loop

**Ưu tiên:** `P0`  
**Lý do:** đây là lõi sản phẩm. Nếu chưa chốt được session AI loop thì voice, scoring, và UX học tập sẽ vẫn bị hở.

### 3.1. Chốt kiến trúc session loop

- [ ] Chốt rõ luồng `AI reply` cho session:
  - `Realtime provider trực tiếp`
  - hay `backend text orchestrator`
  - hoặc `hybrid`
- [ ] Chốt rõ trách nhiệm của backend và client trong flow chat/voice
- [ ] Chốt rõ source of truth cho `session completion`
- [ ] Chốt rõ source of truth cho `scores` và `xpEarned`

### 3.2. Hoàn thiện endpoint message/session sync

- [x] Refactor `POST /api/sessions/:id/message` để phản ánh đúng vai trò cuối cùng
- [x] Tách rõ `transcript sync` và `evaluation trigger` nếu cần
- [x] Chặn việc client tự “tiêm” score tùy ý nếu đây không còn là hướng cuối cùng
- [ ] Lưu đủ metadata để debug session sau này
- [ ] Bổ sung idempotency strategy rõ hơn cho realtime/provider events

### 3.3. Hoàn thiện evaluator backend

- [x] Tạo evaluator service riêng cho session
- [x] Tính `grammarScore` từ transcript / messages
- [x] Tính `vocabularyScore` từ transcript / messages
- [x] Tính `naturalnessScore` từ transcript / messages
- [ ] Chuẩn hóa cách convert evaluator output -> score 0..100
- [x] Tự tính `xpEarned` từ backend
- [ ] Chốt rule `mission complete` từ backend

### 3.4. Hoàn thiện feedback per-turn

- [x] Populate `Message.hasError`
- [x] Populate `Message.errorType`
- [x] Populate `Message.originalPhrase`
- [x] Populate `Message.suggestion`
- [x] Populate `Message.explanation`
- [x] Populate `Message.isGood`
- [ ] Chốt khi nào feedback hiển thị realtime, khi nào để cuối session

### 3.5. Verify phase

- [ ] Test session text end-to-end
- [ ] Test custom practice end-to-end
- [ ] Test complete session mà không cần client gửi score tay
- [ ] Test result screen lấy score/feedback đúng từ backend
- [x] Update `API_ENDPOINT.md` nếu contract thay đổi
- [ ] Update Postman nếu endpoint/body thay đổi

### Definition of Done

- [ ] Backend tự quyết định được `score`, `xp`, `mission complete`
- [ ] Client không còn phải truyền score như nguồn sự thật chính
- [ ] Session result có thể dựng hoàn chỉnh từ dữ liệu backend

---

## 4. Phase 2 - Voice Learning Completion

**Ưu tiên:** `P1`  
**Lý do:** Scenio là app học giao tiếp. Sau khi AI session loop ổn, cần chốt phần voice learning cho đúng tinh thần sản phẩm.

### 4.1. Realtime conversation hardening

- [ ] Chốt luồng realtime production chính thức
- [ ] Chuẩn hóa event model realtime
- [ ] Lưu rõ `providerSessionId`
- [ ] Lưu rõ transcript final / partial strategy
- [ ] Quy định rõ `VOICE` session khác `TEXT` session ở đâu

### 4.2. Speech / pronunciation

- [ ] Chọn provider pronunciation assessment
- [ ] Viết module pronunciation assessment
- [ ] Lưu pronunciation score theo session
- [ ] Lưu pronunciation detail nếu cần word-level
- [ ] Map pronunciation result sang UI-friendly payload

### 4.3. STT / audio pipeline

- [ ] Chốt có cần fallback upload-audio path không
- [ ] Nếu có, tạo endpoint upload/process audio
- [ ] Chốt audio format support
- [ ] Chốt transcript normalization trước khi evaluate

### 4.4. Voice persona / role adherence

- [ ] Chuẩn hóa prompt rules cho voice roleplay
- [ ] Đảm bảo scene/custom practice đều truyền được persona đầy đủ
- [ ] Chốt cách chọn voice theo:
  - scene preset
  - custom practice gender / persona
  - explicit user selection
- [ ] Xem lại abstraction realtime provider nếu sau này muốn đổi vendor

### 4.5. Verify phase

- [ ] Test voice session realtime cơ bản
- [ ] Test transcript lưu đúng
- [ ] Test hint trong session voice
- [ ] Test abandon/complete voice session
- [ ] Update docs/Postman nếu contract thay đổi

### Definition of Done

- [ ] Voice session không chỉ “nói được”, mà còn trả dữ liệu học tập đủ dùng
- [ ] Có đường đi rõ ràng cho pronunciation / speaking assessment

---

## 5. Phase 3 - Chroma / Vector DB Completion

**Ưu tiên:** `P1`  
**Lý do:** hiện tại đây là phần docs nói có nhưng code chưa có thật. Cần làm để search/recommend đúng tầm sản phẩm.

### 5.1. Embedding foundation

- [ ] Tạo embedding service riêng
- [ ] Tạo helper build text cho scene embedding
- [ ] Chốt metadata schema cho vector document
- [ ] Chốt document id strategy (`sceneId`)

### 5.2. Sync scene <-> Chroma

- [ ] Upsert scene vào Chroma khi create scene
- [ ] Update embedding khi update scene
- [ ] Remove / disable vector khi scene inactive hoặc delete
- [ ] Có script backfill embeddings cho toàn bộ scenes hiện có
- [ ] Có cách re-sync full collection khi cần

### 5.3. Semantic search thật

- [ ] Refactor `GET /api/scenes/search` sang vector search thật
- [ ] Giữ level filtering sau khi vector query
- [ ] Giữ response shape ổn định cho frontend nếu có thể
- [ ] Có fallback text search nếu Chroma/provider lỗi

### 5.4. Recommend hybrid

- [ ] Refactor `GET /api/scenes/recommend`
- [ ] Kết hợp heuristic + vector similarity
- [ ] Dùng history/session context để improve recommendation
- [ ] Giữ fallback DB-only khi vector unavailable

### 5.5. Verify phase

- [ ] Test create/update scene -> vector sync
- [ ] Test semantic search với query không trùng keyword trực tiếp
- [ ] Test recommend trả kết quả hợp lý hơn heuristic-only
- [ ] Update README/API docs/Postman nếu behavior thay đổi

### Definition of Done

- [ ] Chroma không còn chỉ là config
- [ ] `/scenes/search` và/hoặc `/scenes/recommend` dùng vector thật trong nghiệp vụ

---

## 6. Phase 4 - Production Hardening

**Ưu tiên:** `P2`

### 6.1. Reliability

- [ ] Retry / timeout strategy cho LLM provider
- [ ] Retry / timeout strategy cho voice provider
- [ ] Retry / timeout strategy cho Chroma
- [ ] Error mapping nhất quán giữa providers

### 6.2. Observability

- [ ] Thêm structured logs cho session/voice/vector flow
- [ ] Log provider latency
- [ ] Log provider errors rõ ràng
- [ ] Có trace cơ bản cho session lifecycle

### 6.3. Security / cost guardrails

- [ ] Rate limit cho AI-heavy endpoints
- [ ] Guardrails cho prompt/body size
- [ ] Guardrails cho max session duration nếu cần
- [ ] Kiểm soát cost cho realtime / TTS / vector sync

### 6.4. Testing

- [ ] Integration test cho session flow
- [ ] Integration test cho vector search
- [ ] Integration test cho admin critical paths
- [ ] Smoke test script cho local dev

### Definition of Done

- [ ] Backend AI/voice/vector đủ ổn định để team mobile/admin bám lâu dài

---

## 7. Phase 5 - Docs Alignment

**Ưu tiên:** `P2`

### 7.1. Dọn docs cho khớp code thật

- [ ] Sửa README backend để không overclaim phần vector/LLM
- [ ] Ghi rõ đâu là `implemented`, đâu là `planned`
- [ ] Đồng bộ `API_ENDPOINT.md`
- [ ] Đồng bộ docs voice / realtime / vocabulary nếu contract đổi

### 7.2. Handoff docs

- [ ] Viết doc “AI session flow” cho mobile
- [ ] Viết doc “voice session contract” cho mobile
- [ ] Viết doc “semantic search behavior” cho team

### Definition of Done

- [ ] Team đọc docs sẽ không bị hiểu rằng vector search đã xong nếu code chưa có

---

## 8. Thứ tự thực hiện khuyến nghị

Làm theo đúng thứ tự này:

1. **Phase 1 - Hoàn thiện AI Session Loop**
2. **Phase 2 - Voice Learning Completion**
3. **Phase 3 - Chroma / Vector DB Completion**
4. **Phase 4 - Production Hardening**
5. **Phase 5 - Docs Alignment**

### Vì sao ưu tiên như vậy

- AI session loop là lõi gameplay của sản phẩm
- Voice learning là lớp sản phẩm kế tiếp đúng bản chất Scenio
- Vector DB rất quan trọng, nhưng chưa chặn việc hoàn thiện vòng học chính
- Hardening và docs nên làm sau khi core behavior đã chốt

---

## 9. Next Action

Nếu bắt đầu ngay từ bây giờ, task đầu tiên nên mở là:

- [ ] Viết thiết kế chi tiết cho `backend-owned evaluator + score pipeline`

Đây là bước mở đầu tốt nhất vì nó sẽ ảnh hưởng trực tiếp tới:

- session result
- XP
- missions
- feedback
- voice learning
