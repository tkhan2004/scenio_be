# Pgvector + Learning Plan Implementation Plan

Tài liệu này là handoff cho coding agent triển khai phần còn thiếu để Scenio trở thành app học tập hoàn chỉnh hơn: semantic search/recommend bằng PostgreSQL pgvector, learning roadmap cá nhân hóa sau onboarding/level test, và cập nhật lộ trình sau mỗi session.

## 1. Product Goal

Scenio cần chứng minh vòng học hoàn chỉnh:

```text
Onboarding -> Level test -> Personalized learning plan -> Recommended scene
-> Practice session -> AI evaluation -> Corrections -> Next learning action
-> Updated learning plan
```

Client mobile không gọi vector DB, không gọi LLM trực tiếp. Backend sở hữu logic học tập, vector search, fallback, và persistence. Mobile chỉ render API response và điều hướng.

## 2. Architecture Decision

Use **PostgreSQL + pgvector** instead of Chroma.

Reason:

- Repo already uses PostgreSQL + Prisma.
- Scene/user/session data lives in Postgres.
- Recommend needs relational filters: `isActive`, `difficulty`, `category`, user level, completed sessions.
- One database is easier for thesis demo and local setup.
- pgvector supports vector similarity search and indexes like HNSW/IVFFlat.

Chroma can be removed from the target architecture unless a later scale requirement appears.

## 3. Current Backend Reality

Already implemented:

- User onboarding storage:
  - `learningGoal`
  - `studyFrequency`
  - `selfAssessment`
- Level test updates `user.level`.
- Session complete runs evaluator and stores:
  - `grammarScore`
  - `vocabularyScore`
  - `naturalnessScore`
  - `xpEarned`
  - per-message correction fields
  - `feedbackDetails.issues`
  - `nextLearningAction`
- AI model settings/admin config exist.
- Gemini Embedding 2 support exists through `src/modules/ai-models/ai-models.service.ts`.

Not implemented yet:

- pgvector extension/migration.
- Scene embedding table.
- Embedding backfill/resync script.
- Semantic `/scenes/search`.
- Hybrid `/scenes/recommend`.
- Learning plan tables/API.
- Learning plan generation after onboarding/level test.
- Learning plan update after session complete.

## 4. Implementation Phases

### Phase 1 - Replace Chroma Direction With pgvector

Goal: make Postgres the vector store.

Tasks:

- Update `docker-compose.yml` Postgres image to a pgvector-capable image, for example `pgvector/pgvector`.
- Add migration:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

- Do not delete old Chroma config immediately if other code imports it. Mark as unused/planned removal in docs.
- Update docs that mention Chroma as primary vector DB.

Verification:

```bash
npx prisma migrate dev
npx prisma validate
npm run build
```

Manual SQL check:

```sql
SELECT extname FROM pg_extension WHERE extname = 'vector';
```

### Phase 2 - Scene Embedding Storage

Goal: store one active semantic embedding per scene.

Recommended schema:

```prisma
model SceneEmbedding {
  id                 String   @id @default(uuid())
  sceneId            String   @unique
  provider           AiProvider
  modelId            String
  outputDimension    Int
  embeddingText      String   @db.Text
  embeddingHash      String
  metadata           Json?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  scene Scene @relation(fields: [sceneId], references: [id], onDelete: Cascade)

  @@index([provider, modelId])
  @@map("scene_embeddings")
}
```

Important Prisma note:

- Prisma may not natively model pgvector type cleanly.
- Use raw SQL migration to add vector column:

```sql
ALTER TABLE "scene_embeddings"
ADD COLUMN "embedding" vector(1536);
```

- Query similarity using `$queryRaw` in repository.
- Keep scalar metadata in Prisma model; use raw SQL for vector operations.

Recommended SQL index:

```sql
CREATE INDEX scene_embeddings_embedding_hnsw_idx
ON "scene_embeddings"
USING hnsw ("embedding" vector_cosine_ops);
```

If local pgvector version/image does not support HNSW, use IVFFlat:

```sql
CREATE INDEX scene_embeddings_embedding_ivfflat_idx
ON "scene_embeddings"
USING ivfflat ("embedding" vector_cosine_ops)
WITH (lists = 100);
```

### Phase 3 - Embedding Service

Goal: centralize scene embedding logic.

Create module:

```text
src/modules/scene-embeddings/
├── scene-embeddings.repository.ts
├── scene-embeddings.service.ts
└── scene-embeddings.types.ts
```

Service functions:

```ts
buildSceneEmbeddingText(scene): string
upsertSceneEmbedding(sceneId: string): Promise<void>
deleteSceneEmbedding(sceneId: string): Promise<void>
backfillSceneEmbeddings(): Promise<{ total: number; updated: number; failed: number }>
searchSimilarScenes(input): Promise<SemanticSceneMatch[]>
```

Embedding text should include:

```text
Title: ...
Category: ...
Difficulty: ...
Description: ...
Mission: ...
Character: name + role
System prompt summary or full prompt
Vocabulary: word - definition - example
```

Use existing:

```ts
embedText({
  text,
  title: scene.title,
  mode: 'DOCUMENT',
})
```

For query search:

```ts
embedText({
  text: query,
  mode: 'QUERY',
})
```

Fallback:

- If embedding provider fails, do not break scene create/update.
- Record failure in logs and allow manual/backfill retry.
- Search/recommend should fallback to current text/heuristic behavior.

### Phase 4 - Backfill Script

Goal: make all active scenes searchable before demo.

Add script:

```text
scripts/backfill-scene-embeddings.ts
```

Package script:

```json
{
  "embeddings:backfill": "ts-node scripts/backfill-scene-embeddings.ts"
}
```

Behavior:

- Load all active scenes with vocabulary.
- Build embedding text.
- Hash embedding text.
- Skip if `embeddingHash` unchanged unless `--force`.
- Call active embedding model.
- Upsert vector + metadata.
- Print summary.

Command:

```bash
npm run embeddings:backfill
npm run embeddings:backfill -- --force
```

### Phase 5 - Sync Scene Embeddings From Admin CRUD

Goal: keep vector store fresh.

Hook into admin scene service:

- `createScene`: after DB create, call `upsertSceneEmbedding(scene.id)` best-effort.
- `updateScene`: after update/vocabulary update, call `upsertSceneEmbedding(scene.id)` best-effort.
- `toggleScene`:
  - if inactive, either delete embedding or keep and filter by `scene.isActive`.
  - recommended: keep embedding but search always joins `scene.isActive = true`.

Do not fail admin CRUD if embedding sync fails. Return scene success and log embedding sync warning.

### Phase 6 - Semantic Search

Goal: refactor `/api/scenes/search` to semantic search with fallback.

Current endpoint stays:

```http
GET /api/scenes/search?q=airport problem&limit=5
```

Backend behavior:

```text
1. Validate query.
2. Embed query.
3. Query pgvector similarity.
4. Join scene table and filter:
   - scene.isActive = true
   - difficulty in allowed levels for user
5. Return same response shape plus optional metadata.
6. If provider/pgvector fails, fallback to current text search.
```

Repository raw SQL example shape:

```sql
SELECT
  s.*,
  1 - (se.embedding <=> $1::vector) AS similarity
FROM "scene_embeddings" se
JOIN "scenes" s ON s.id = se."sceneId"
WHERE s."isActive" = true
  AND s."difficulty" = ANY($2)
ORDER BY se.embedding <=> $1::vector
LIMIT $3;
```

Response addition:

```json
{
  "id": "uuid",
  "title": "Airport Check-in",
  "matchReason": "Semantic match for travel check-in conversation.",
  "similarity": 0.84,
  "retrievalMode": "VECTOR"
}
```

If fallback:

```json
{
  "retrievalMode": "TEXT_FALLBACK"
}
```

### Phase 7 - Hybrid Recommend

Goal: make `/api/scenes/recommend` use learning data + vector similarity.

Current endpoint stays:

```http
GET /api/scenes/recommend?limit=5
```

Inputs:

- User:
  - `level`
  - `learningGoal`
  - `studyFrequency`
  - `selfAssessment`
- Recent completed sessions:
  - grammar/vocabulary/naturalness scores
  - feedback details issues
- Active learning plan current focus if available.

Build semantic query:

```text
Learner level: A2
Goal: TRAVEL
Weak skill: GRAMMAR
Needs practice: asking clear questions and using complete sentence structure
Prefer scenes: airport, hotel, travel check-in
```

Ranking formula:

```text
finalScore =
  vectorSimilarity * 0.45
  + weakSkillMatch * 0.25
  + levelMatch * 0.15
  + goalCategoryMatch * 0.10
  + diversityBoost * 0.05
```

Return:

```json
{
  "id": "uuid",
  "title": "Airport Check-in",
  "focusSkill": "GRAMMAR",
  "matchReason": "Bạn đang yếu grammar sau session gần nhất.",
  "score": 0.87,
  "retrievalMode": "HYBRID_VECTOR"
}
```

Fallback:

- If vector search fails, use current heuristic recommend.
- Include `retrievalMode = "HEURISTIC_FALLBACK"`.

### Phase 8 - Learning Plan DB

Goal: persist personalized learning roadmap.

Recommended enums:

```prisma
enum LearningPlanStatus {
  ACTIVE
  ARCHIVED
}

enum LearningPlanStepStatus {
  LOCKED
  NEXT
  IN_PROGRESS
  COMPLETED
  SKIPPED
}

enum LearningPlanStepType {
  SCENE
  VOCABULARY_REVIEW
  GRAMMAR_PRACTICE
  RETRY_SCENE
  CUSTOM_PRACTICE
}

enum LearningFocusSkill {
  GRAMMAR
  VOCABULARY
  NATURALNESS
  CONFIDENCE
}
```

Recommended models:

```prisma
model LearningPlan {
  id             String             @id @default(uuid())
  userId         String
  status         LearningPlanStatus @default(ACTIVE)
  title          String
  summary        String             @db.Text
  level          Level
  learningGoal   String?
  studyFrequency String?
  focusSkill     LearningFocusSkill
  weeklyTarget   Int
  generatedBy    String             @default("RULE")
  sourceSnapshot Json?
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt

  user  User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  steps LearningPlanStep[]

  @@index([userId, status])
  @@map("learning_plans")
}

model LearningPlanStep {
  id             String                 @id @default(uuid())
  planId         String
  sceneId        String?
  type           LearningPlanStepType
  status         LearningPlanStepStatus @default(LOCKED)
  focusSkill     LearningFocusSkill
  title          String
  description    String?
  reason         String?
  sortOrder      Int
  targetCount    Int                    @default(1)
  completedCount Int                    @default(0)
  metadata       Json?
  createdAt      DateTime               @default(now())
  updatedAt      DateTime               @updatedAt

  plan  LearningPlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  scene Scene?       @relation(fields: [sceneId], references: [id], onDelete: SetNull)

  @@index([planId, status])
  @@index([sceneId])
  @@map("learning_plan_steps")
}
```

### Phase 9 - Learning Plan API

Create module:

```text
src/modules/learning-plan/
├── learning-plan.routes.ts
├── learning-plan.controller.ts
├── learning-plan.service.ts
└── learning-plan.repository.ts
```

Schemas:

```text
src/schemas/learning-plan/
├── get-current-learning-plan.schema.ts
├── generate-learning-plan.schema.ts
├── refresh-learning-plan.schema.ts
└── complete-learning-plan-step.schema.ts
```

Endpoints:

```http
GET /api/learning-plan/current
POST /api/learning-plan/generate
POST /api/learning-plan/refresh
PATCH /api/learning-plan/steps/:id/complete
```

`GET /current` response:

```json
{
  "plan": {
    "id": "uuid",
    "title": "Travel English Foundation",
    "summary": "Bạn sẽ luyện tình huống du lịch A2 với trọng tâm grammar.",
    "level": "A2",
    "learningGoal": "TRAVEL",
    "studyFrequency": "REGULAR",
    "focusSkill": "GRAMMAR",
    "weeklyTarget": 3
  },
  "steps": [
    {
      "id": "uuid",
      "type": "SCENE",
      "status": "NEXT",
      "focusSkill": "GRAMMAR",
      "sceneId": "uuid",
      "title": "Airport check-in basics",
      "reason": "Practice complete travel questions."
    }
  ],
  "nextStep": {
    "id": "uuid",
    "type": "SCENE",
    "sceneId": "uuid"
  }
}
```

### Phase 10 - Generate Plan After Onboarding/Level Test

Goal: user gets plan automatically.

Trigger points:

- After `PATCH /users/me/onboarding`.
- After level test completes in `POST /sessions/level-test`.
- If user skips level test, generate using current default level and selfAssessment.

Generation algorithm:

```text
1. Read user profile.
2. Determine focusSkill:
   - selfAssessment if no completed sessions
   - otherwise weakest average score from recent sessions
3. Determine weeklyTarget from studyFrequency:
   - LIGHT -> 2
   - REGULAR -> 3
   - INTENSIVE -> 5
4. Build semantic query.
5. Use hybrid recommend to select 3-7 scenes.
6. Create active LearningPlan and steps.
7. Archive previous active plan if refresh/generate called again.
```

LLM usage:

- Optional but useful for friendly `title`, `summary`, and step `reason`.
- Backend must validate JSON.
- If LLM fails, deterministic rule must generate plan.

LLM feature type:

- Use `EVALUATOR_LLM` or add new `PLANNER_LLM`.
- Recommended later: add `PLANNER_LLM` to `AiFeatureType` for admin control.
- For MVP: reuse `EVALUATOR_LLM` or `ROLEPLAY_LLM` with clear service helper.

### Phase 11 - Update Plan After Session Complete

Goal: plan evolves after learning data.

Hook:

- In `completeSessionWithEvaluation` after session scores/corrections are saved and rewards granted.

Behavior:

```text
1. Find active LearningPlan.
2. Mark matching SCENE step as COMPLETED if session sceneId matches.
3. Analyze newest scores + feedbackDetails.issues.
4. Update plan focus if needed.
5. Ensure at least one NEXT step exists.
6. Add adaptive step if user is weak:
   - grammar low -> GRAMMAR_PRACTICE or SCENE
   - vocabulary low -> VOCABULARY_REVIEW
   - naturalness low -> RETRY_SCENE or similar scene
```

Do not block session completion if plan update fails. Log warning and continue.

### Phase 12 - Mobile Contract

Mobile should not change for vector storage.

Mobile should add:

- Learning plan screen.
- Home section: `Today focus`.
- Scene cards show:
  - `matchReason`
  - `focusSkill`
- Result screen uses:
  - `nextLearningAction`
  - `feedbackDetails.issues`
- After onboarding/level test:
  - call `GET /learning-plan/current`
  - if no plan, call `POST /learning-plan/generate`

Mobile flow:

```text
Register/Login
-> Onboarding
-> Level test
-> GET /learning-plan/current
-> Show Learning Plan
-> Start recommended scene
-> Complete session
-> Show corrections + next action
-> Continue next plan step
```

## 5. Fallback Strategy

Everything AI/vector must have fallback.

Embedding provider fails:

- Search fallback to text search.
- Recommend fallback to heuristic recommend.
- Scene CRUD still succeeds.

pgvector unavailable:

- Search fallback to text search.
- Recommend fallback to heuristic recommend.
- Backfill script exits with clear error.

LLM planner fails:

- Rule-based plan generation.

No learning plan exists:

- Generate plan from user profile.
- If generation fails, return home/recommend data as before.

## 6. Testing Plan

Unit-ish service tests if test framework exists; otherwise smoke scripts.

Required manual checks:

1. Fresh user onboarding saves profile.
2. Level test completes and updates level.
3. Learning plan generated.
4. Backfill embeddings creates scene embeddings.
5. `/scenes/search?q=airport problem` returns semantically relevant scene.
6. `/scenes/recommend` returns `retrievalMode = HYBRID_VECTOR`.
7. Provider/key failure returns fallback results.
8. Session complete updates plan step and returns `nextLearningAction`.
9. Mobile can render result using stable fields.

Commands:

```bash
npx prisma format
npx prisma validate
npx prisma migrate dev
npx prisma generate
npm run build
npm run db:seed
npm run embeddings:backfill
```

## 7. Definition of Done

Backend is ready for thesis demo when:

- PostgreSQL has pgvector enabled.
- Active scenes have embeddings.
- Search can use vector with fallback.
- Recommend can use hybrid vector + learning profile with fallback.
- User has a persisted learning plan after onboarding/level test.
- Session complete can update plan and return next action.
- Client can ignore vector details and still render learning plan/result.
- Docs are updated:
  - `docs/API_ENDPOINT.md`
  - `docs/MOBILE_LEARNING_LOOP_HANDOFF.md`
  - this file.

## 8. Suggested Implementation Order For Agent

Do not implement all at once. Use this order:

1. Add pgvector extension + `SceneEmbedding` schema/migration.
2. Implement scene embedding module + raw SQL vector repository.
3. Add backfill script.
4. Integrate scene embedding sync with admin scene create/update/toggle.
5. Refactor `/scenes/search` to vector with fallback.
6. Refactor `/scenes/recommend` to hybrid with fallback.
7. Add learning plan schema/migration.
8. Add learning plan API.
9. Generate plan after onboarding/level test.
10. Update plan after session complete.
11. Update docs and smoke test full flow.

