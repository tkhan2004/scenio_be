# Non-LLM Endpoints Handoff

Tài liệu này ghi lại phần backend đã được thêm/sửa để triển khai các endpoint chưa đụng tới LLM trong repo hiện tại, để người tiếp theo có thể follow nhanh mà không phải rà lại toàn bộ diff.

## 1. Scope đã làm

Đã triển khai hoặc wire xong các endpoint sau:

- `GET /api/scenes/recommend`
- `POST /api/sessions/start`
- `GET /api/sessions/:id/result`
- `PATCH /api/sessions/:id/abandon`
- `POST /api/users/xp`
- `GET /api/vocabulary`
- `POST /api/vocabulary`
- `DELETE /api/vocabulary/:id`

Phần vẫn chưa làm vì có dính LLM / roleplay thật:

- `POST /api/sessions/:id/message`
- `POST /api/sessions/:id/hint`

## 2. Hành vi hiện tại của các endpoint mới

### `GET /api/scenes/recommend`

- Đã có route/controller/service/repository riêng trong module `scenes`.
- Recommend hiện là **heuristic DB-only**, chưa dùng Chroma/vector search.
- Logic hiện tại:
  - Lấy 5 completed sessions gần nhất.
  - Suy ra skill yếu nhất từ `grammar / vocabulary / naturalness`.
  - Fallback sang `selfAssessment` nếu user chưa có completed session.
  - Rank scene theo:
    - `learningGoal`
    - category ưu tiên theo weak skill
    - độ gần level
    - số lượng vocabulary
    - keyword heuristic trong `title/description/missionText`

### `POST /api/sessions/start`

- Đã tạo session mới và lưu opening message vào bảng `messages` với `turnIndex = 0`.
- **Chưa gọi LLM** để sinh opening message.
- Opening message hiện là **template deterministic** theo `scene.category` + `characterName` + `characterRole`.
- Có chặn nhiều session `ACTIVE` song song cho cùng user:
  - nếu user đang có một session `ACTIVE` bất kỳ thì trả `SESSION_ALREADY_ACTIVE`.

### `GET /api/sessions/:id/result`

- Chỉ cho phép lấy kết quả của session đã kết thúc.
- Nếu session còn `ACTIVE` thì trả `SESSION_NOT_FINISHED`.
- Trả:
  - `session`
  - `messages`
  - `scores`

### `PATCH /api/sessions/:id/abandon`

- Nếu session `ACTIVE` thì update sang `ABANDONED` và set `endedAt`.
- Nếu đã `ABANDONED` thì xử lý idempotent, vẫn trả thành công.
- Nếu đã `COMPLETED` thì trả conflict.

### `POST /api/users/xp`

- Đã có transaction để:
  - cộng XP của session
  - update `streakDays`
  - update progress daily missions cho:
    - `COMPLETE_SCENE`
    - `ACHIEVE_SCORE`
    - `MAINTAIN_STREAK`
  - award badge nếu đủ điều kiện
- Đã thêm cột `Session.xpGrantedAt` để chống cộng XP lặp.
- Nếu cùng một session gọi lại endpoint này, logic sẽ **idempotent**:
  - không cộng thêm XP lần nữa
  - trả state hiện tại của `totalXp` và `streakDays`

### Module `vocabulary`

- Đã tạo mới module hoàn chỉnh:
  - route
  - controller
  - service
  - repository
  - schema
- `POST /api/vocabulary` hỗ trợ 2 mode:
  - auto save qua `sceneVocabularyId`
  - manual save qua `word + definition`
- Có check duplicate theo từ và theo `sceneVocabularyId`.
- Khi save từ mới:
  - update mission `SAVE_VOCABULARY`
  - xét badge `VOCAB_SAVED`
  - cộng XP thưởng nếu mission/badge vừa complete

## 3. Prisma / DB changes

### Schema change

Đã thêm field mới trong `Session`:

```prisma
xpGrantedAt DateTime?
```

### Migration

Đã thêm migration:

- `prisma/migrations/20260413113000_add_session_xp_granted_at/migration.sql`

Nội dung migration chỉ là:

```sql
ALTER TABLE "sessions"
ADD COLUMN "xpGrantedAt" TIMESTAMP(3);
```

### Seed change

Đã update seed helper để hỗ trợ `xpGrantedAt`:

- `prisma/seeds/helpers.ts`
- `prisma/seeds/activity.seed.ts`

Seed completed sessions hiện set `xpGrantedAt` để tránh dữ liệu seed bị cộng XP lại khi test `POST /users/xp`.

## 4. File đã thêm / sửa

### File mới

- `docs/NON_LLM_ENDPOINTS_HANDOFF.md`
- `prisma/migrations/20260413113000_add_session_xp_granted_at/migration.sql`
- `src/modules/vocabulary/vocabulary.routes.ts`
- `src/modules/vocabulary/vocabulary.controller.ts`
- `src/modules/vocabulary/vocabulary.service.ts`
- `src/modules/vocabulary/vocabulary.repository.ts`
- `src/schemas/scenes/recommend-scenes.schema.ts`
- `src/schemas/sessions/start-session.schema.ts`
- `src/schemas/sessions/get-session-result.schema.ts`
- `src/schemas/sessions/abandon-session.schema.ts`
- `src/schemas/users/add-xp.schema.ts`
- `src/schemas/vocabulary/list-vocabulary.schema.ts`
- `src/schemas/vocabulary/create-vocabulary.schema.ts`
- `src/schemas/vocabulary/delete-vocabulary.schema.ts`
- `src/schemas/vocabulary/index.ts`

### File sửa chính

- `src/app.ts`
- `prisma/schema.prisma`
- `prisma/seeds/helpers.ts`
- `prisma/seeds/activity.seed.ts`
- `src/modules/scenes/scenes.routes.ts`
- `src/modules/scenes/scenes.controller.ts`
- `src/modules/scenes/scenes.repository.ts`
- `src/modules/scenes/scenes.service.ts`
- `src/modules/sessions/sessions.routes.ts`
- `src/modules/sessions/sessions.controller.ts`
- `src/modules/sessions/sessions.repository.ts`
- `src/modules/sessions/sessions.service.ts`
- `src/modules/users/users.routes.ts`
- `src/modules/users/users.controller.ts`
- `src/modules/users/users.repository.ts`
- `src/modules/users/users.service.ts`
- `src/schemas/scenes/index.ts`
- `src/schemas/sessions/index.ts`
- `src/schemas/users/index.ts`

## 5. Route wiring hiện tại

### `src/app.ts`

Đã register thêm:

```ts
app.use('/api/vocabulary', vocabularyRoutes);
```

### `src/modules/scenes/scenes.routes.ts`

Đã thêm:

```ts
router.get('/recommend', auth, validate(recommendScenesSchema), scenesController.recommendScenes);
```

### `src/modules/sessions/sessions.routes.ts`

Đã thêm:

```ts
router.post('/start', auth, validate(startSessionSchema), startSessionController);
router.get('/:id/result', auth, validate(getSessionResultSchema), getSessionResultController);
router.patch('/:id/abandon', auth, validate(abandonSessionSchema), abandonSessionController);
```

### `src/modules/users/users.routes.ts`

Đã thêm:

```ts
router.post('/xp', auth, validate(addXpSchema), addXpController);
```

## 6. Verification đã chạy

Đã chạy thành công:

- `npx prisma format`
- `npx prisma generate`
- `npm run build`
- `npx prisma validate`
- `npx prisma migrate status`
- `npx prisma migrate dev --name sanity_check_non_llm_endpoints`
  - kết quả: `Already in sync`
- `npm run db:seed`

## 7. Điều cần biết trước khi code tiếp

### `sessions/start` mới chỉ là bản tạm không dùng LLM

Nếu người tiếp theo bắt đầu làm roleplay thật, chỗ cần thay chủ yếu là:

- `src/modules/sessions/sessions.service.ts`
- helper `buildOpeningMessage(...)`

Target cuối cùng nên là:

- lấy `scene.systemPrompt`
- gọi model để sinh opening message
- vẫn giữ flow create `session` + save message ban đầu

### `scenes/recommend` chưa phải bản cuối

Hiện tại là heuristic DB-only. Khi chuyển sang bản final dùng vector search, khả năng chủ yếu sẽ phải sửa:

- `src/modules/scenes/scenes.service.ts`
- hoặc tách thêm integration với `src/config/chroma.ts`

Route và shape response hiện tại có thể giữ nguyên.

### `users/xp` đang là nơi cộng XP theo session

Điểm quan trọng:

- session XP idempotent nhờ `xpGrantedAt`
- mission/badge reward cũng được xử lý trong flow này

Nếu sau này có endpoint roleplay completion thật, đừng bỏ qua `xpGrantedAt`, nếu không sẽ rất dễ double reward.

### `vocabulary` đã đụng mission/badge

Người tiếp theo cần nhớ:

- `POST /api/vocabulary` không chỉ là CRUD
- nó đang có side effect lên:
  - `user_missions`
  - `user_badges`
  - `users.totalXp`

Nếu refactor module reward/gamification sau này, đây là một điểm nên gom lại thành shared helper/service.

## 8. Phần chưa sync xong

Chưa sync trong task này:

- `docs/API_ENDPOINT.md`
- Postman collection

Lý do:

- Ưu tiên hoàn tất code + migrate + build trước
- chưa có bước chốt lại contract cuối cùng sau khi user interrupt vòng smoke test route-level

## 9. Gợi ý bước tiếp theo cho người follow

Thứ tự nên làm tiếp:

1. Sync `docs/API_ENDPOINT.md` theo behavior hiện tại.
2. Sync Postman collection.
3. Chạy smoke test endpoint thật bằng HTTP:
   - `GET /api/scenes/recommend`
   - `POST /api/sessions/start`
   - `PATCH /api/sessions/:id/abandon`
   - `GET /api/sessions/:id/result`
   - `POST /api/users/xp`
   - `GET|POST|DELETE /api/vocabulary`
4. Sau đó mới tiếp tục phần LLM:
   - `POST /sessions/:id/message`
   - `POST /sessions/:id/hint`
   - thay template opening message bằng opening message từ model

## 10. Lưu ý về worktree hiện tại

Ngoài diff backend ở trên, worktree hiện còn có một số thay đổi khác không phải trọng tâm của batch này:

- `docker-compose.yml`
- `prisma.config.ts`
- `package-lock.json`
- một số file `.md` untracked ở root repo

Người tiếp theo nên kiểm tra kỹ trước khi commit chung, để tránh gộp nhầm các thay đổi ngoài scope.
