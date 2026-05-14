# Scenio Provider Keys Setup Guide

Tài liệu này hướng dẫn lấy key cho backend Scenio theo thứ tự ưu tiên: miễn phí hoặc dễ test trước, dịch vụ trả phí để sau. Mục tiêu là sau khi điền key vào `scenio_be/.env`, bạn có thể chạy seed, benchmark/connect model ở admin, backfill embeddings, rồi demo dự án.

> Không commit `.env` lên Git. API key chỉ nằm ở backend/server, không đưa vào mobile client hoặc admin frontend.

---

## 1. Còn việc gì ngoài truyền key không?

Nếu code backend đã build/migrate/seed pass, phần còn lại chủ yếu là cấu hình và test:

1. Điền key vào `scenio_be/.env`.
2. Chạy lại backend.
3. Vào admin AI Models, benchmark/connect model muốn dùng.
4. Chạy backfill scene embeddings để pgvector có dữ liệu semantic.
5. Smoke test các route học tập và voice.

Các lệnh nên chạy sau khi điền key:

```bash
cd /Users/khangnguyen/DoAnTotNghiep/scenio_be

npm run build
npx prisma validate
npx prisma migrate status
npm run db:seed

# Sau khi GEMINI_API_KEY hoạt động
npm run embeddings:backfill -- --force

# Sau khi ELEVENLABS_API_KEY hoạt động
npm run test:elevenlabs
```

---

## 2. Thứ tự ưu tiên lấy key

| Ưu tiên | Provider | Dùng cho | Env cần điền | Ghi chú |
|---|---|---|---|---|
| 1 | Google Gemini API | Embedding, vector search/recommend, fallback LLM | `GEMINI_API_KEY` | Ưu tiên trước vì project đang dùng `gemini-embedding-2` cho pgvector. |
| 2 | Google OAuth Client ID | Login Google | `GOOGLE_CLIENT_ID` | Không phải API key. Dùng để verify Google ID token. |
| 3 | ElevenLabs | TTS/voice preview | `ELEVENLABS_API_KEY` | Có thể dùng trước để demo voice preview. |
| 4 | OpenAI | Realtime voice, STT, TTS fallback, embedding fallback | `OPENAI_API_KEY` | Thường cần billing. Để option khi muốn demo realtime voice mượt hơn. |
| 5 | Anthropic Claude | Roleplay/evaluator LLM nếu chọn Claude | `CLAUDE_API_KEY` | Thường cần billing. Có thể để sau nếu dùng Gemini/OpenAI trước. |

---

## 3. Google Gemini API Key

Official docs:

- Gemini API key docs: https://ai.google.dev/gemini-api/docs/api-key
- AI Studio: https://aistudio.google.com/app/apikey

Các bước:

1. Vào https://aistudio.google.com/app/apikey.
2. Đăng nhập Google account.
3. Chấp nhận Terms nếu là lần đầu dùng.
4. Chọn hoặc tạo Google Cloud project.
5. Bấm tạo API key.
6. Copy key và dán vào `.env`.
7. Trong AI Studio hoặc Google Cloud Console, hạn chế key cho Gemini API/Generative Language API nếu có thể.

Env nên điền:

```env
EMBEDDING_PROVIDER=google
EMBEDDING_MODEL=gemini-embedding-2
EMBEDDING_DIMENSIONS=1536
GEMINI_API_KEY=your_real_gemini_api_key
GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
```

Sau khi điền:

```bash
npm run embeddings:backfill -- --force
```

Kỳ vọng:

- `/api/scenes/search` có thể chuyển từ `TEXT_FALLBACK` sang `VECTOR`.
- `/api/scenes/recommend` có thể chuyển từ `HEURISTIC_FALLBACK` sang `HYBRID_VECTOR`.
- Nếu vẫn fallback, kiểm tra admin AI Models đã connect model embedding chưa, key có đúng chưa, và migration pgvector đã apply chưa.

---

## 4. Google OAuth Client ID

Official docs:

- Manage OAuth clients: https://support.google.com/cloud/answer/6158849
- Google Cloud Console clients: https://console.cloud.google.com/auth/clients

Các bước:

1. Vào https://console.cloud.google.com/auth/clients.
2. Chọn project.
3. Nếu chưa có Google Auth Platform/OAuth consent screen thì tạo trước.
4. Bấm `Create client`.
5. Chọn application type phù hợp.
6. Với mobile app, tạo OAuth client theo platform mobile tương ứng nếu cần.
7. Với backend hiện tại, lấy `Client ID` và dán vào `.env`.

Env:

```env
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
```

Lưu ý:

- `GOOGLE_CLIENT_ID` không giống `GEMINI_API_KEY`.
- Backend dùng biến này để verify Google ID token trong `/api/auth/google`.
- Nếu mobile dùng Google Sign-In, client mobile phải dùng đúng OAuth client/project tương thích với backend.

---

## 5. ElevenLabs API Key

Official docs:

- API authentication: https://elevenlabs.io/docs/api-reference/authentication
- Quickstart: https://elevenlabs.io/docs/quickstart
- API pricing: https://elevenlabs.io/pricing

Các bước:

1. Vào https://elevenlabs.io/sign-up hoặc login tài khoản.
2. Mở workspace/account settings.
3. Vào phần API keys.
4. Tạo key mới.
5. Nếu UI cho phép scope/quota, giới hạn key cho TTS và đặt quota nhỏ để tránh lố credit.
6. Copy key và dán vào `.env`.

Env:

```env
ELEVENLABS_API_KEY=your_real_elevenlabs_api_key
ELEVENLABS_BASE_URL=https://api.elevenlabs.io/v1
ELEVENLABS_VOICE_ID=JBFqnCBsd6RMkjVDRZzb
ELEVENLABS_MALE_VOICE_ID=pNInz6obpgDQGcFmaJgB
ELEVENLABS_FEMALE_VOICE_ID=JBFqnCBsd6RMkjVDRZzb
ELEVENLABS_MODEL_ID=eleven_flash_v2_5
ELEVENLABS_OUTPUT_FORMAT=mp3_44100_128
ELEVENLABS_TEXT=Hello, this is a quick ElevenLabs voice test from Scenio.
ELEVENLABS_OUTPUT_PATH=tmp/elevenlabs-test.mp3
```

Test:

```bash
npm run test:elevenlabs
```

Kỳ vọng:

- Tạo file audio test ở `tmp/elevenlabs-test.mp3`.
- Voice preview trong app/admin chạy bằng ElevenLabs.
- Nếu fail quota, backend có fallback OpenAI TTS khi bạn có `OPENAI_API_KEY`.

---

## 6. OpenAI API Key

Official docs:

- API keys: https://platform.openai.com/api-keys
- Authentication docs: https://platform.openai.com/docs/api-reference/authentication
- OpenAI help: https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key

Dùng cho:

- Realtime voice session.
- STT/transcription fallback.
- TTS fallback.
- Embedding fallback.
- LLM fallback nếu admin chọn OpenAI model.

Các bước:

1. Vào https://platform.openai.com/api-keys.
2. Login hoặc tạo account.
3. Tạo project nếu cần.
4. Bấm `Create new secret key`.
5. Nên tạo key theo project Scenio, đặt tên rõ như `scenio-dev`.
6. Nếu có phần permission, ưu tiên restricted key cho các endpoint cần dùng.
7. Copy key ngay lúc tạo, vì secret thường không hiện lại đầy đủ.
8. Dán vào `.env`.

Env:

```env
OPENAI_API_KEY=your_real_openai_api_key
OPENAI_MODEL=gpt-4o-mini
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_FORMAT=mp3
OPENAI_REALTIME_MODEL=gpt-realtime
OPENAI_REALTIME_VOICE=marin
OPENAI_REALTIME_TEMPERATURE=0.6
OPENAI_REALTIME_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe
OPENAI_REALTIME_API_URL=https://api.openai.com/v1/realtime/client_secrets
```

Sau khi có key:

1. Vào admin AI Models.
2. Benchmark/connect các feature `REALTIME_VOICE`, `STT`, `TTS`, hoặc fallback cho `EMBEDDING`.
3. Test route mint realtime token từ mobile/session flow.

Ghi chú:

- OpenAI API thường cần billing riêng với ChatGPT subscription.
- ChatGPT Plus/Pro không đồng nghĩa với có API credit.

---

## 7. Anthropic Claude API Key

Official docs:

- Claude API overview: https://platform.claude.com/docs/en/api/overview
- Claude Console: https://console.anthropic.com

Dùng cho:

- Roleplay LLM.
- Evaluator LLM.
- Fallback chain nếu admin chọn Claude model.

Các bước:

1. Vào https://console.anthropic.com.
2. Login hoặc tạo account.
3. Vào Account Settings/API Keys.
4. Tạo key mới.
5. Nếu có workspace/spend control, tạo workspace riêng cho Scenio.
6. Copy key và dán vào `.env`.

Env:

```env
LLM_PROVIDER=claude
CLAUDE_API_KEY=your_real_anthropic_api_key
CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

Ghi chú:

- Nếu chưa nạp Anthropic, có thể đổi tạm sang OpenAI hoặc để admin chọn Gemini/OpenAI cho roleplay/evaluator nếu model catalog đã connect.
- Nếu dùng Claude làm evaluator, nên giới hạn prompt và log usage vì evaluator gọi sau mỗi session complete.

---

## 8. `.env` tối thiểu để demo free/ít phí trước

Đây là block ưu tiên hiện tại cho luận văn/demo:

```env
# Server/database/JWT giữ như .env.example
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/scenio_db
JWT_SECRET=change_this_to_a_long_random_string
REFRESH_SECRET=change_this_to_a_long_random_refresh_secret
JWT_EXPIRES_IN=15m
REFRESH_EXPIRES_IN=30d

# Google login
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com

# Gemini embedding/vector
EMBEDDING_PROVIDER=google
EMBEDDING_MODEL=gemini-embedding-2
EMBEDDING_DIMENSIONS=1536
GEMINI_API_KEY=your_real_gemini_api_key
GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_EMBEDDING_MODEL=gemini-embedding-2

# ElevenLabs voice preview
ELEVENLABS_API_KEY=your_real_elevenlabs_api_key
ELEVENLABS_BASE_URL=https://api.elevenlabs.io/v1
ELEVENLABS_VOICE_ID=JBFqnCBsd6RMkjVDRZzb
ELEVENLABS_MALE_VOICE_ID=pNInz6obpgDQGcFmaJgB
ELEVENLABS_FEMALE_VOICE_ID=JBFqnCBsd6RMkjVDRZzb
ELEVENLABS_MODEL_ID=eleven_flash_v2_5
ELEVENLABS_OUTPUT_FORMAT=mp3_44100_128
```

Các key trả phí có thể để placeholder trong lúc demo nếu feature tương ứng không test:

```env
OPENAI_API_KEY=
CLAUDE_API_KEY=
```

---

## 9. Checklist sau khi điền key

### Backend health

```bash
npm run build
npx prisma validate
npx prisma migrate status
npm run db:seed
```

### AI model admin

1. Login admin.
2. Vào AI Models.
3. Feature `EMBEDDING`: benchmark/connect `Google / gemini-embedding-2`, dimension `1536`.
4. Feature `TTS`: benchmark/connect `ElevenLabs / eleven_flash_v2_5`.
5. Nếu có OpenAI key: connect `REALTIME_VOICE`, `STT`, `TTS fallback`.
6. Nếu có Claude key: connect `ROLEPLAY_LLM`, `EVALUATOR_LLM`.

### Pgvector

```bash
npm run embeddings:backfill -- --force
```

Test:

```bash
curl "http://localhost:3000/api/scenes/search?q=airport&limit=3" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Kỳ vọng tốt nhất:

```json
{
  "retrievalMode": "VECTOR"
}
```

Nếu vẫn là `TEXT_FALLBACK`, app vẫn chạy được; nghĩa là backend chưa sinh/lưu vector thành công hoặc provider key/model chưa connect.

### Learning plan

```bash
curl "http://localhost:3000/api/learning-plan/current" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Kỳ vọng:

- Có `plan.status = ACTIVE`.
- Có `steps`.
- Có `nextStep`.

---

## 10. Lỗi hay gặp

### `Không thể sinh embedding từ primary hoặc fallback models`

Nguyên nhân thường gặp:

- `GEMINI_API_KEY` sai hoặc thiếu.
- Admin chưa connect model `EMBEDDING`.
- Model active không đúng provider/key đang có.
- Output dimension không khớp `1536`.

Cách xử lý:

1. Kiểm tra `.env`.
2. Restart backend.
3. Vào admin benchmark/connect lại embedding.
4. Chạy lại:

```bash
npm run embeddings:backfill -- --force
```

### ElevenLabs test fail

Nguyên nhân thường gặp:

- `ELEVENLABS_API_KEY` sai.
- Account hết quota/credit.
- Voice ID không hợp lệ với workspace.

Cách xử lý:

1. Test lại key ở ElevenLabs dashboard.
2. Dùng voice ID mặc định trong `.env.example`.
3. Nếu vẫn fail, vào ElevenLabs lấy voice ID khác từ voice catalog.

### Google login fail

Nguyên nhân thường gặp:

- Mobile đang dùng client ID khác project.
- Backend `GOOGLE_CLIENT_ID` không khớp ID token audience.
- OAuth consent screen chưa publish/test user chưa được thêm.

Cách xử lý:

1. Kiểm tra Google Cloud project.
2. Đảm bảo mobile Google Sign-In và backend dùng cùng OAuth setup.
3. Với testing mode, thêm email test user vào OAuth consent screen.

---

## 11. Nguyên tắc bảo mật trước khi báo cáo/demo

1. Không đưa `.env` vào Git.
2. Không paste key vào chat, screenshot, slide, hoặc issue public.
3. Tạo key riêng cho demo, đặt quota thấp nếu provider hỗ trợ.
4. Sau khi demo xong, rotate hoặc revoke key nếu đã từng mở màn hình có key.
5. Mobile/admin không được giữ provider key thật; tất cả request provider đi qua backend.

