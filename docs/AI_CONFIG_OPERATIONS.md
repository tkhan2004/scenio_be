# AI Config Operations

Tài liệu này mô tả cách backend Scenio quản lý AI model catalog, active setting, benchmark, và fallback chain cho các feature client.

## 1. Source of Truth

AI config có 3 lớp:

1. Seed catalog trong `prisma/seeds/ai-models.seed.ts`.
2. Runtime setting trong bảng `ai_feature_settings`.
3. Provider API key trong `.env`.

Admin UI chỉ chọn model đã có trong catalog. Nếu muốn thêm model mới, cập nhật seed hoặc tạo admin API riêng sau.

## 2. Database Tables

### `ai_model_catalog`

Lưu danh sách model có thể chọn.

Field chính:

- `featureType`: `EMBEDDING`, `ROLEPLAY_LLM`, `EVALUATOR_LLM`, `REALTIME_VOICE`, `TTS`, `STT`
- `provider`: `GOOGLE`, `OPENAI`, `ANTHROPIC`, `ELEVENLABS`
- `modelId`: id provider dùng khi gọi API thật.
- `displayName`: tên hiển thị admin.
- `inputModalities`: ví dụ `TEXT`, `IMAGE`, `AUDIO`, `VIDEO`, `PDF`.
- `outputType`: ví dụ `EMBEDDING`, `TEXT`, `JSON`, `AUDIO`.
- `dimensionOptions`: chỉ quan trọng với embedding.
- `defaultDimension`: dimension mặc định nếu admin không chọn.
- `isActive`: model có được chọn trong admin hay không.
- `isSystem`: model được seed bởi hệ thống.

Unique key: `featureType + provider + modelId`.

### `ai_feature_settings`

Lưu model đang active cho từng feature.

- `featureType`: unique, mỗi feature có một setting.
- `activeModelId`: primary model.
- `fallbackModelIds`: danh sách fallback theo thứ tự admin chọn.
- `outputDimension`: embedding output dimension hoặc `null`.
- `config`: JSON advanced config cho runtime sau này.

### `ai_model_benchmarks`

Lưu lịch sử benchmark/connect.

- `modelCatalogId`
- `featureType`
- `provider`
- `providerModelId`
- `sampleText`
- `outputDimension`
- `embeddingDimension`
- `latencyMs`
- `success`
- `errorMessage`

## 3. Default Seed

Sau `npm run db:seed`, backend tạo 39 model và 6 feature settings.

Default chain hiện tại:

| Feature | Primary | Fallback |
|---|---|---|
| `EMBEDDING` | Google `gemini-embedding-2` | OpenAI `text-embedding-3-small`, Google `gemini-embedding-001` |
| `ROLEPLAY_LLM` | Anthropic `claude-sonnet-4-6` | OpenAI `gpt-5.4-mini`, Google `gemini-2.5-flash`, Anthropic `claude-3-5-sonnet-20241022` |
| `EVALUATOR_LLM` | Anthropic `claude-sonnet-4-6` | OpenAI `gpt-5.4-mini`, Google `gemini-2.5-flash`, OpenAI `gpt-4o-mini` |
| `REALTIME_VOICE` | OpenAI `gpt-realtime-1.5` | OpenAI `gpt-realtime` |
| `TTS` | ElevenLabs `eleven_flash_v2_5` | OpenAI `gpt-4o-mini-tts`, OpenAI `tts-1` |
| `STT` | OpenAI `gpt-4o-transcribe` | OpenAI `gpt-4o-mini-transcribe`, OpenAI `whisper-1` |

## 4. Required Env

```bash
GEMINI_API_KEY=replace-with-your-gemini-api-key
GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_EMBEDDING_MODEL=gemini-embedding-2

OPENAI_API_KEY=replace-with-your-openai-api-key
CLAUDE_API_KEY=replace-with-your-claude-api-key
ELEVENLABS_API_KEY=replace-with-your-elevenlabs-api-key

EMBEDDING_PROVIDER=google
EMBEDDING_MODEL=gemini-embedding-2
EMBEDDING_DIMENSIONS=1536
```

Runtime sẽ báo `AI_CONFIG_ERROR` nếu API key bị thiếu hoặc vẫn là placeholder.

## 5. Runtime Mapping

Backend đọc setting qua `src/modules/ai-models/ai-models.service.ts`.

| Feature | Runtime file | Behavior |
|---|---|---|
| `EMBEDDING` | `src/config/embedding.ts` | Gọi active embedding, thử fallback nếu provider lỗi |
| `ROLEPLAY_LLM` | `src/modules/sessions/sessions.service.ts` | Sinh AI turn bằng provider chain |
| `EVALUATOR_LLM` | `src/modules/sessions/sessions.evaluator.service.ts` | Chấm điểm JSON bằng provider chain |
| `REALTIME_VOICE` | `src/modules/sessions/sessions.realtime.service.ts` | Mint realtime token, thử model OpenAI theo chain |
| `TTS` | `src/config/tts.ts` | Chọn TTS model từ active setting |
| `STT` | `src/modules/sessions/sessions.realtime.service.ts` | Chọn first OpenAI STT model trong chain |

## 6. Fallback Rule

Fallback chain luôn chạy theo thứ tự:

```text
primary activeModel -> fallbackModelIds[0] -> fallbackModelIds[1] -> ...
```

Quy tắc connect:

- Primary model phải tồn tại và `isActive = true`.
- Fallback model phải cùng `featureType`.
- Fallback model phải `isActive = true`.
- Fallback không được trùng primary.
- Tối đa 5 fallback model.
- Backend benchmark primary trước khi lưu setting mới.

Quy tắc runtime:

- Nếu primary gọi thành công, backend dùng kết quả primary.
- Nếu primary lỗi provider/API key/network/response format, backend thử fallback kế tiếp.
- Nếu toàn bộ chain lỗi, backend ném `AI_ENGINE_ERROR` hoặc dùng fallback deterministic ở flow đã có fallback riêng.

## 7. Benchmark Rule

Endpoint:

```http
POST /api/admin/ai-models/:id/benchmark
```

Embedding:

- Gọi provider thật.
- Đo `latencyMs`.
- Ghi `embeddingDimension`.
- Với Gemini Embedding 2, backend dùng endpoint `:embedContent`.

Roleplay/evaluator:

- Gọi provider text thật với prompt ngắn.
- OpenAI dùng Responses API.
- Anthropic dùng Messages API.
- Gemini dùng `generateContent`.

Realtime/TTS/STT:

- Benchmark hiện tập trung kiểm tra provider config/server readiness; connect vẫn được lưu qua cùng benchmark pipeline.

## 8. Admin API Quick Reference

```http
GET /api/admin/ai-models
GET /api/admin/ai-models?featureType=EMBEDDING
POST /api/admin/ai-models/:id/benchmark
PATCH /api/admin/ai-models/:id/connect
```

Tất cả endpoint cần admin auth.

## 9. Local Commands

Sau khi pull hoặc đổi schema:

```bash
npm install
npx prisma migrate dev
npx prisma generate
npm run db:seed
npm run build
```

Kiểm tra migration/schema:

```bash
npx prisma validate
npx prisma migrate status
```

## 10. Operational Checklist

Khi thêm provider/model mới:

1. Thêm enum provider nếu provider chưa có trong `prisma/schema.prisma`.
2. Thêm catalog entry vào `prisma/seeds/ai-models.seed.ts`.
3. Thêm provider caller trong `ai-models.service.ts` nếu runtime chưa hỗ trợ provider đó.
4. Thêm model vào default setting nếu muốn seed làm primary/fallback.
5. Chạy `npx prisma format`, migration nếu đổi schema, `npx prisma generate`.
6. Chạy `npm run db:seed`.
7. Benchmark qua admin API trước khi connect.
8. Cập nhật `docs/API_ENDPOINT.md` và `docs/ADMIN_AI_MODEL_UI_SPEC.md` nếu contract đổi.

## 11. Known Constraints

- `fallbackModelIds` là mảng id trong setting, không phải relation table. Service đã validate khi connect.
- Connect hiện benchmark primary model trước khi lưu; fallback health nên benchmark riêng từng model trong UI nếu cần độ chắc cao.
- Model catalog phụ thuộc seed. Nếu provider đổi tên model hoặc retire model, cần cập nhật seed và benchmark lại.
- Gemini Embedding 2 đang dùng prompt prefix trong backend để phân biệt query/document mode.

