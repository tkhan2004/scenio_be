# Scenio Backend - Realtime Voice / LLM Implementation Plan

> Date: 2026-04-14
> Scope: plan trien khai chuc nang noi chuyen truc tiep voi AI cho flow roleplay chinh

## 1. Muc tieu

Can bo sung core feature con thieu cua repo:

- noi chuyen truc tiep voi AI trong session roleplay
- ho tro audio 2 chieu, latency thap
- van luu duoc transcript, score, hint, mission completion vao backend hien tai
- khong pha vo convention route -> controller -> service -> repository

Hien trang repo:

- da co `POST /api/sessions/start`
- da co `POST /api/sessions/level-test`
- chua co `POST /api/sessions/:id/message`
- chua co `POST /api/sessions/:id/hint`
- `startSession()` moi tra opening message deterministic, chua goi roleplay LLM
- `src/config/llm.ts` hien dang hop cho text generation, chua hop cho realtime voice

## 2. Quyết định kien truc de xuat

### Chot huong cho phase dau

Su dung:

- OpenAI Realtime API cho speech-to-speech
- WebRTC cho duong audio chinh giua client va model
- Backend Express chi lo:
  - auth app user
  - tao `Session` trong DB
  - mint ephemeral realtime token / session config
  - persist transcript va app events
  - tinh score / complete mission / grant XP

### Khong de audio chay qua Socket.IO trong phase chinh

Socket.IO khong nen la duong audio chinh vi:

- tang latency
- backend phai goi / forward audio lien tuc
- ton bandwidth server
- phuc tap hon cho interruption, VAD, audio playback

Socket.IO neu dung thi chi de:

- dong bo trang thai session
- debug event
- stream transcript finalized ve UI neu can

### Inference quan trong

Day la suy luan tu hien trang repo + tai lieu chinh thuc:

- repo hien co abstraction Claude/OpenAI cho text
- nhung speech-to-speech realtime o giai doan hien tai phu hop nhat voi OpenAI Realtime
- vi vay nen voice realtime nen lam `OpenAI-only` o v1
- text endpoints hien co van co the giu provider abstraction cu

## 3. Kien truc tong the de xuat

```text
Flutter/Web client
  |
  | 1. POST /api/sessions/start
  v
Scenio Backend
  - tao Session ACTIVE
  - luu opening state
  |
  | 2. POST /api/sessions/:id/realtime-token
  v
Scenio Backend
  - auth user
  - validate session ownership
  - build realtime instructions tu scene + level + mission
  - tao ephemeral token / session config
  |
  | 3. WebRTC
  v
OpenAI Realtime API
  - nhan mic audio
  - tra audio + text events
  |
  | 4. client gui finalized transcript/event ve backend
  v
Scenio Backend
  - luu Message
  - tinh score
  - detect mission complete
  - expose GET result / POST hint / POST users/xp
```

## 4. Stack de xuat

### Backend

- `openai` package hien co san trong repo
- them `src/config/realtime.ts` de gom cau hinh realtime rieng
- neu can sideband server-to-server hoac proxy: them `ws`
- khong can them `socket.io` o phase 1 neu client tu sync transcript bang REST

### Client neu dung Flutter

- `flutter_webrtc`
- `permission_handler`
- `record` chi dung cho fallback mode upload audio, khong phai luong chinh realtime

### Client neu dung web

- uu tien native WebRTC cua browser, khong can socket lam audio transport

## 5. Tai sao chon WebRTC + Realtime

Theo tai lieu OpenAI:

- Realtime API duoc dung cho low-latency multimodal apps va speech-to-speech
- OpenAI khuyen nghi voice agents trong browser/mobile dung WebRTC
- WebSocket la huong cho server-side usage

Dieu nay rat hop voi bai toan Scenio:

- app can hoi thoai hai chieu nhanh
- can interrupt / user chen ngang
- can audio output tu AI ngay khi dang noi
- backend van phai giu quyet dinh business, scoring, XP, missions

## 6. Plan trien khai theo phase

### Phase A - Chot architecture va provider

Muc tieu:

- chot voice realtime v1 = OpenAI Realtime
- text-only logic hien tai van giu trong `src/config/llm.ts`
- tach realtime config khoi `llm.ts`

Can lam:

- tao `src/config/realtime.ts`
- them env vars moi:
  - `OPENAI_REALTIME_MODEL=gpt-realtime`
  - `OPENAI_REALTIME_VOICE=marin`
  - `OPENAI_REALTIME_TEMPERATURE=0.6`
- cap nhat `.env.example`
- viet doc nho trong repo ve provider support

Ket qua phase:

- team co 1 diem vao ro rang cho voice provider

### Phase B - Session foundation cho realtime

Muc tieu:

- giu `POST /api/sessions/start`
- bo sung endpoint de client xin realtime session config

API de xuat:

- `POST /api/sessions/start`
  - giu nguyen y nghia tao `Session`
  - co the tiep tuc tra `sessionId`
- `POST /api/sessions/:id/realtime-token`
  - auth bat buoc
  - validate owner + session `ACTIVE`
  - tra `ephemeralKey`, `model`, `voice`, `expiresAt`

Can lam o backend:

- schema Zod moi trong `src/schemas/sessions/`
- route moi trong `src/modules/sessions/sessions.routes.ts`
- controller moi
- service moi:
  - `createRealtimeToken(userId, sessionId)`
- repository method de lay:
  - session
  - scene
  - user level / learning goal

Instructions duoc build tu:

- `scene.systemPrompt`
- `scene.characterName`
- `scene.characterRole`
- `user.level`
- quy tac Scenio:
  - dong vai nhan vat
  - noi tieng Anh
  - giu do dai cau vua phai
  - danh dau khi mission complete
  - khong pha vai

### Phase C - Client realtime voice MVP

Muc tieu:

- client mo microphone
- noi truc tiep voi AI
- nghe audio AI tra ve

Neu client la Flutter:

- dung `flutter_webrtc` de:
  - xin mic permission
  - tao `RTCPeerConnection`
  - gui audio local stream
  - nhan remote audio stream
  - mo data channel neu can nhan event text / transcript

MVP flow:

1. user bam Start Session
2. app goi `/api/sessions/start`
3. app goi `/api/sessions/:id/realtime-token`
4. app tao WebRTC connection toi OpenAI Realtime
5. app bat mic stream
6. AI tra audio stream + text event
7. app render waveform / subtitle / transcript thoi gian thuc

### Phase D - Persist transcript va business events

Muc tieu:

- backend phai co transcript de tinh score va hien result

Quyet dinh de xuat cho v1:

- client lang nghe event text final tu Realtime API
- chi gui finalized text segment ve backend
- khong gui raw audio ve backend

API de xuat:

- `POST /api/sessions/:id/message`
  - day la endpoint business can co
  - body de xuat:
    - `source`: `USER_AUDIO | USER_TEXT | AI_AUDIO | AI_TEXT`
    - `content`
    - `turnIndex`
    - `isFinal`
    - `providerEventId` optional
    - `startedAt` / `endedAt` optional

Server lam gi:

- validate session owner
- create `Message`
- neu la message cua user thi danh dau candidate cho evaluator
- neu la message cua AI va co marker mission complete thi update session

Neu muon live sync cho nhieu client debug / monitor:

- backend co the them `Socket.IO` sau
- nhung chi publish event transcript/status
- khong stream mic audio qua socket

### Phase E - Evaluator, score, hint

Muc tieu:

- co feedback hoc tap, khong chi co conversation audio

De xuat cach lam:

1. realtime conversation:
   - uu tien response tu model realtime
2. evaluator:
   - chay background text-only sau moi user utterance finalized
   - dung model text trong `src/config/llm.ts`
3. hint:
   - `POST /api/sessions/:id/hint`
   - dua tren transcript hien tai + scene goal

Vi sao tach evaluator khoi audio model:

- de prompt feedback ro hon
- de output co JSON on dinh
- de tranh lam model voice vua dong vai vua tu cham diem

Flow evaluator de xuat:

1. client gui finalized user utterance vao `/sessions/:id/message`
2. backend queue 1 job evaluator nho
3. evaluator tra ve:
   - `hasError`
   - `errorType`
   - `originalPhrase`
   - `suggestion`
   - `explanation`
   - `isGood`
4. backend cap nhat `Message`

Hint flow:

1. user bam hint
2. backend lay:
   - scene
   - transcript gan nhat
   - so hint da dung
3. model sinh 1 goi y ngan
4. luu thanh `Message` voi `isHint = true`
5. tang `hintCount`

### Phase F - Session completion, scoring, XP

Muc tieu:

- session roleplay co ket thuc that
- diem duoc tinh
- grant XP / mission / badges tiep tuc tai dung flow hien co

Dieu kien complete de xuat:

- model tra event / marker mission complete
- hoac user bam End Session
- hoac backend detect da dat du so turn + goal

Can lam:

- viet `completeSession()` trong `sessions.service.ts`
- tinh:
  - `grammarScore`
  - `vocabularyScore`
  - `naturalnessScore`
  - `xpEarned`
- update `Session`
- sau do FE goi tiep `POST /api/users/xp`

## 7. File-level implementation plan trong repo

### Nen them moi

- `src/config/realtime.ts`
- `src/modules/sessions/sessions.realtime.service.ts`
- `src/schemas/sessions/create-realtime-token.schema.ts`
- `src/schemas/sessions/send-session-message.schema.ts`
- `src/schemas/sessions/session-hint.schema.ts`

### Nen sua

- `src/modules/sessions/sessions.routes.ts`
- `src/modules/sessions/sessions.controller.ts`
- `src/modules/sessions/sessions.service.ts`
- `src/modules/sessions/sessions.repository.ts`
- `src/config/llm.ts`
- `docs/API_ENDPOINT.md`
- Postman collection

### Neu can sideband/proxy ve sau

- `src/realtime/` folder rieng:
  - `realtime.gateway.ts`
  - `realtime.events.ts`
  - `realtime.types.ts`

## 8. Data model de xuat

V1 co the giu schema toi thieu, chua can doi DB lon.

Nhung neu muon trace tot hon, nen can nhac them:

### Session

- `providerSessionId String?`
- `modality String?` // `TEXT`, `VOICE`
- `completedReason String?` // `MISSION_COMPLETE`, `USER_ENDED`, `TIMEOUT`

### Message

- `providerEventId String?`
- `modality String?` // `TEXT`, `AUDIO_TRANSCRIPT`
- `audioStartMs Int?`
- `audioEndMs Int?`
- `isFinal Boolean?`

Inference:

- v1 van co the ship khong them het cac field nay
- nhung neu muon debug realtime cho production thi rat nen co it nhat `providerSessionId` va `isFinal`

## 9. Socket hay khong?

### De xuat chot

- Khong dung Socket.IO cho audio path chinh
- Co the chua dung Socket.IO o MVP
- Neu can live event cho UI:
  - them `Socket.IO` sau cho transcript/status

### Khi nao can `Socket.IO`

- 1 session can dong bo tren nhieu man hinh
- admin / observer muon xem live transcript
- app can nhan score/hint update ngay khi background evaluator xong

### Khi nao can `ws`

- khi backend muon giu sideband server-to-server connection toi OpenAI Realtime
- vi du de can thiep session, mute tool calls, hoac audit event sat hon

## 10. MVP rollout de xuat

### MVP 1 - Text roleplay truoc

Muc tieu:

- ship nhanh `POST /sessions/:id/message`
- ship `POST /sessions/:id/hint`
- roleplay text chay on
- score + result chay on

Ly do:

- dung lai duoc service/repository hien co
- de test business rules truoc khi them audio

### MVP 2 - Voice realtime

Muc tieu:

- them `/sessions/:id/realtime-token`
- client voice chat 2 chieu
- transcript finalized sync vao backend

### MVP 3 - Production hardening

- VAD tuning
- interrupt / barge-in
- retry / reconnect
- network downgrade
- fallback text mode
- fallback record-upload-transcribe mode

## 11. Fallback mode nen co

Neu WebRTC gap van de tren thiet bi / mang:

- client record 3-10 giay audio
- upload len backend
- backend transcribe
- backend goi text model
- backend goi TTS
- tra audio lai client

Fallback nay latency kem hon, nhung rat huu ich de:

- debug
- thiet bi khong support tot WebRTC
- feature flag rollback

## 12. Risk chinh

- audio UX phuc tap hon text UX rat nhieu
- neu cho ca evaluator, roleplay, scoring chay trong mot model voice se kho on dinh
- neu cho audio di qua backend se doi ops cost va latency len manh
- transcript khong sync final dung cach se lam `result`, `hint`, `xp` sai

## 13. Acceptance criteria de coi la xong phase chinh

Phase text roleplay xong khi:

- `POST /api/sessions/:id/message` chay on
- `POST /api/sessions/:id/hint` chay on
- `GET /api/sessions/:id/result` co transcript + score dung

Phase voice realtime xong khi:

- user co the noi truc tiep voi AI trong 1 session
- AI tra audio trong thoi gian ngan, user co the chen ngang
- finalized transcript duoc luu vao DB
- complete session xong van dung duoc `users/xp`, `missions`, `badges`

## 14. Recommendation cuoi cung

Neu muc tieu la ship nhanh chuc nang chinh:

1. Lam `sessions/:id/message` + `hint` bang text truoc
2. Sau do them voice realtime bang WebRTC
3. Khong stream mic audio qua Socket.IO
4. Voice v1 nen OpenAI-only
5. Evaluator / scoring nen tach khoi voice model va chay text-only background

## 15. Nguon tham khao

- OpenAI Realtime API: https://developers.openai.com/api/docs/guides/realtime
- OpenAI Text-to-Speech: https://developers.openai.com/api/docs/guides/text-to-speech
- flutter_webrtc package: https://pub.dev/packages/flutter_webrtc
