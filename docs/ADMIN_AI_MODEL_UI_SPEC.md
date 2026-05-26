# Admin AI Model Settings UI Spec

Mục tiêu của màn này là cho admin xem catalog model theo từng feature, benchmark model, chọn primary model, và cấu hình fallback chain để backend tự chuyển model khi provider lỗi.

## 1. Route và quyền truy cập

- Gợi ý route web admin: `/admin/ai-models`
- API base: `http://localhost:3000/api`
- Bắt buộc header: `Authorization: Bearer <admin_access_token>`
- User phải có `isAdmin = true`, nếu không backend trả `403 FORBIDDEN`.

## 2. Feature Tabs

Render dạng tabs hoặc segmented control theo enum backend:

| Feature | Label UI | Ý nghĩa |
|---|---|---|
| `EMBEDDING` | Embedding | Vector search, recommend, semantic retrieval |
| `ROLEPLAY_LLM` | Roleplay LLM | Sinh câu trả lời AI trong session text/voice |
| `EVALUATOR_LLM` | Evaluator LLM | Chấm điểm session và feedback JSON |
| `REALTIME_VOICE` | Realtime Voice | Mint realtime voice session |
| `TTS` | Text to Speech | Sinh audio preview/voice output |
| `STT` | Speech to Text | Transcribe audio |

Khi vào màn, gọi `GET /admin/ai-models`. Khi đổi tab, có thể gọi lại `GET /admin/ai-models?featureType=EMBEDDING` để giảm payload.

## 3. Data Contract

### List models

`GET /admin/ai-models?featureType=EMBEDDING`

Response data:

```json
{
  "settings": [
    {
      "id": "uuid",
      "featureType": "EMBEDDING",
      "outputDimension": 1536,
      "updatedAt": "2026-04-29T00:00:00.000Z",
      "activeModel": {
        "id": "uuid",
        "featureType": "EMBEDDING",
        "provider": "GOOGLE",
        "modelId": "gemini-embedding-2",
        "displayName": "Gemini Embedding 2",
        "description": "Google multimodal embedding model...",
        "inputModalities": ["TEXT", "IMAGE", "AUDIO", "VIDEO", "PDF"],
        "outputType": "EMBEDDING",
        "dimensionOptions": [128, 768, 1536, 3072],
        "defaultDimension": 1536,
        "isActive": true,
        "isSystem": true,
        "isSelected": true,
        "isFallback": false
      },
      "fallbackModels": []
    }
  ],
  "models": []
}
```

Frontend nên group `models` theo `provider`, rồi sort:

1. `isSelected = true`
2. `isFallback = true`
3. provider order: `GOOGLE`, `OPENAI`, `ANTHROPIC`, `ELEVENLABS`
4. `displayName`

### Benchmark model

`POST /admin/ai-models/:id/benchmark`

Body:

```json
{
  "sampleText": "recommend a travel scene for airport check-in",
  "outputDimension": 1536
}
```

Response data:

```json
{
  "model": {
    "id": "uuid",
    "featureType": "EMBEDDING",
    "provider": "GOOGLE",
    "modelId": "gemini-embedding-2",
    "displayName": "Gemini Embedding 2"
  },
  "benchmark": {
    "id": "uuid",
    "featureType": "EMBEDDING",
    "provider": "GOOGLE",
    "modelId": "gemini-embedding-2",
    "outputDimension": 1536,
    "embeddingDimension": 1536,
    "latencyMs": 420,
    "success": true,
    "errorMessage": null,
    "createdAt": "2026-04-29T00:00:00.000Z"
  }
}
```

Nếu `success = false`, vẫn hiển thị benchmark record để admin đọc lỗi provider.

### Connect model

`PATCH /admin/ai-models/:id/connect`

Body:

```json
{
  "outputDimension": 1536,
  "fallbackModelIds": ["uuid-openai-fallback", "uuid-gemini-fallback"],
  "benchmarkText": "find a daily English speaking scene",
  "config": {}
}
```

Behavior:

- Backend benchmark primary model trước.
- Nếu benchmark fail, backend trả `502 AI_MODEL_CONNECT_FAILED` và không đổi setting.
- Nếu benchmark pass, backend lưu `activeModelId`, `fallbackModelIds`, `outputDimension`, `config`.
- `fallbackModelIds` tối đa 5 model, phải cùng `featureType`, đang active, và không trùng primary.

## 4. UI Layout

### Header

- Title: `AI Model Settings`
- Subtitle ngắn: `Configure primary and fallback models for Scenio runtime features.`
- Action phụ: refresh catalog.

### Feature setting summary

Mỗi feature nên có một summary row:

- Active provider/model
- Fallback count
- Output dimension nếu feature là `EMBEDDING`
- Last updated
- Status badge: `Configured` nếu có `activeModel`, `Missing` nếu chưa có.

### Model list

Mỗi model card/row nên có:

- Provider badge: Google, OpenAI, Anthropic, ElevenLabs.
- Display name + provider model id.
- Feature type.
- Input modalities.
- Output type.
- Dimension options nếu là embedding.
- Badges: `Primary`, `Fallback`, `System`, `Inactive`.
- Buttons:
  - `Benchmark`
  - `Connect`
  - `Add fallback` hoặc checkbox trong fallback picker.

Không cần tạo model catalog từ UI ở bản này, seed backend là nguồn catalog chính.

## 5. Connect Drawer

Khi admin bấm `Connect`, mở drawer/form:

| Field | Type | Rule |
|---|---|---|
| Primary model | readonly | Model đang chọn |
| Output dimension | select/input | Chỉ hiện với `EMBEDDING`; options lấy từ `dimensionOptions` |
| Benchmark text | textarea | Optional, 3-500 ký tự |
| Fallback chain | sortable multi-select | Chỉ hiện model cùng `featureType`, khác primary |
| Config JSON | code textarea | Optional, advanced mode |

Nút submit: `Benchmark & Connect`.

Sau khi submit thành công:

1. Toast success.
2. Refetch `GET /admin/ai-models?featureType=<current>`.
3. Đóng drawer hoặc giữ mở và hiển thị benchmark cuối.

## 6. Benchmark UX

Benchmark nên có trạng thái riêng theo model id:

- Idle: chưa benchmark.
- Running: disable button model đó.
- Success: hiển thị latency, dimension nếu có, timestamp.
- Failed: hiển thị `errorMessage`; không tự connect.

Với roleplay/evaluator, backend gọi provider text thật bằng prompt ngắn. Với realtime/TTS/STT, backend hiện kiểm tra provider/runtime khả dụng ở mức server-side.

## 7. Error Handling

Các lỗi frontend cần hiển thị dễ hiểu:

| Code | Nghĩa | Gợi ý UI |
|---|---|---|
| `FORBIDDEN` | Không phải admin | Redirect hoặc hiện no-permission |
| `VALIDATION_ERROR` | Body/query sai | Highlight field từ `error.details` |
| `AI_CONFIG_ERROR` | Thiếu API key provider | Hiện provider/env bị thiếu |
| `AI_MODEL_NOT_FOUND` | Model id không tồn tại hoặc inactive | Refetch catalog |
| `AI_MODEL_FALLBACK_INVALID` | Fallback chain sai | Reset fallback picker |
| `AI_MODEL_CONNECT_FAILED` | Benchmark fail khi connect | Hiển thị benchmark/error provider |
| `AI_ENGINE_ERROR` | Provider lỗi runtime | Hiển thị retry + fallback note |

Response lỗi chuẩn:

```json
{
  "success": false,
  "status": 502,
  "error": {
    "code": "AI_MODEL_CONNECT_FAILED",
    "message": "Không thể connect model vì benchmark thất bại",
    "details": [
      { "field": "provider", "message": "GOOGLE" },
      { "field": "modelId", "message": "gemini-embedding-2" }
    ]
  }
}
```

## 8. Suggested Client State

```ts
type AiFeatureType = 'EMBEDDING' | 'ROLEPLAY_LLM' | 'EVALUATOR_LLM' | 'REALTIME_VOICE' | 'TTS' | 'STT';
type AiProvider = 'GOOGLE' | 'OPENAI' | 'ANTHROPIC' | 'ELEVENLABS';

type AiModelRow = {
  id: string;
  featureType: AiFeatureType;
  provider: AiProvider;
  modelId: string;
  displayName: string;
  description?: string | null;
  inputModalities: string[];
  outputType: string;
  dimensionOptions: number[];
  defaultDimension?: number | null;
  isActive: boolean;
  isSystem: boolean;
  isSelected: boolean;
  isFallback: boolean;
};
```

## 9. Manual Test Checklist

1. Login bằng admin account.
2. Gọi `GET /admin/ai-models`, thấy đủ 6 settings.
3. Filter từng feature bằng query `featureType`.
4. Benchmark một embedding model với `outputDimension = 1536`.
5. Connect model embedding và chọn 1-2 fallback.
6. Refetch, kiểm tra `activeModel.isSelected = true` và fallback có `isFallback = true`.
7. Thử connect fallback trùng primary, phải nhận `AI_MODEL_FALLBACK_INVALID`.
8. Thử dùng token user thường, phải nhận `403 FORBIDDEN`.

