# CUSTOM PRACTICE BACKEND SPEC

**Mục tiêu:** triển khai `Custom Practice Session` như một loại session thật trong Scenio backend  
**Cập nhật:** 2026-04-20

---

## 1. Tư duy chốt

Custom Practice **không phải** là một `Scene` thường.

Nó là:

- một `structured brief` do user nhập
- được backend chuẩn hóa thành một `custom_practice_config`
- rồi dùng config đó để tạo một `Session` thật

Điều này giúp Scenio giữ đúng bản chất:

- có `curated scenes` để recommend
- có `custom practice` để cá nhân hóa sâu
- nhưng cả hai đều đi vào chung một lớp `Session`

---

## 2. Mô hình dữ liệu

## 2.1. `Session`

`Session` giờ có 2 nguồn:

- `CURATED_SCENE`
- `CUSTOM_PRACTICE`

Field mới:

- `sourceType`
- `customPracticeConfigId`

Field cũ:

- `sceneId`

được đổi thành optional để hỗ trợ custom practice.

## 2.2. `CustomPracticeConfig`

Đây là bảng lưu structured brief và config đã chuẩn hóa.

Nhóm dữ liệu chính:

- Goal
  - `practiceGoal`
  - `successOutcome`
  - `topicSummary`
- Context
  - `contextType`
  - `location`
  - `conversationChannel`
  - `timePressure`
  - `specialConditions`
- User role
  - `userRole`
  - `userIntent`
  - `userEnglishLevel`
  - `userPersonaNotes`
- AI persona
  - `aiRole`
  - `aiDisplayName`
  - `aiRelationshipToUser`
  - `aiPrimaryGoal`
  - `aiBehaviorStyle`
  - `aiGenderPresentation`
  - `aiVoicePresetId`
  - `aiVoiceTone`
  - `aiSpeechSpeed`
  - `aiAccentPreference`
- Learning config
  - `difficulty`
  - `conversationLength`
  - `correctionStyle`
  - `hintFrequency`
  - `responseComplexity`
  - `focusSkills`
  - `mustUseVocabulary`
  - `avoidTopics`
  - `customInstructions`
- Generated values
  - `displayTitle`
  - `displaySubtitle`
  - `missionText`
  - `estimatedMinutes`
  - `openingMessage`
  - `systemPrompt`

---

## 3. Endpoint mới

### `POST /api/sessions/start-custom`

Endpoint này:

- nhận structured brief từ client
- resolve voice cho AI
- chặn nếu user đang có session `ACTIVE`
- lưu `custom_practice_config`
- tạo `Session` với `sourceType = CUSTOM_PRACTICE`
- lưu opening message vào `messages`

Response trả về:

- `sessionId`
- `sourceType`
- `openingMessage`
- `modality`
- `customPractice` summary
- `selectedVoice`

---

## 4. Voice selection

Cho custom practice, backend resolve voice theo thứ tự:

1. `aiVoicePresetId` nếu user chọn explicit
2. fallback theo `aiGenderPresentation`
3. fallback voice active bất kỳ

Điều này giúp form mobile không bị kẹt nếu user chưa chọn preset cụ thể.

---

## 5. Realtime / Hint / Result

Custom practice không chỉ là endpoint tạo session.

Nó đã được nối vào các flow hiện có:

- `POST /sessions/:id/realtime-token`
- `POST /sessions/:id/hint`
- `GET /sessions/:id/result`

Các flow này giờ đọc `conversation source` theo 2 nhánh:

- nếu `sourceType = CURATED_SCENE` -> đọc từ `scene`
- nếu `sourceType = CUSTOM_PRACTICE` -> đọc từ `customPracticeConfig`

---

## 6. Home / Progress compatibility

Để tránh UX bị gãy:

- `home/dashboard` giờ có thể hiển thị session active đến từ custom practice
- `users/progress` giờ có thể hiển thị history của custom practice

Field `sceneTitle` ở response được giữ lại để mobile cũ ít bị gãy, nhưng giá trị có thể đến từ:

- `scene.title`
- hoặc `customPracticeConfig.displayTitle`

Kèm theo đó, response có thêm `sourceType`.

---

## 7. Điều chưa làm trong phase này

Feature hiện tại vẫn là MVP backend có cấu trúc.

Chưa làm:

- AI tự mở rộng brief ngắn thành config chi tiết
- edit / reuse custom practice templates
- list lịch sử custom practice configs riêng
- convert custom practice thành curated scene

---

## 8. Hướng phát triển tiếp theo

### Ưu tiên gần

- mobile form gọi `POST /sessions/start-custom`
- màn review summary trước khi start
- resume custom practice từ `Home` và `Practice`

### Ưu tiên tiếp

- endpoint `GET /sessions/:id` để load lại source summary chi tiết
- endpoint list recent custom practices
- endpoint duplicate / reuse custom config

### Ưu tiên sau

- AI-assisted brief expansion
- preset packs theo nghề nghiệp
- scoring riêng cho từng loại custom goal

---

## 9. Kết luận ngắn

Backend hiện tại đã hỗ trợ:

- `scene có sẵn -> session`
- `custom structured brief -> session`

và cả hai đều đi chung vào:

- transcript
- realtime token
- hint
- result
- progress

Đây là nền phù hợp để Scenio phát triển đúng hướng:

- học giao tiếp theo ngữ cảnh
- nhưng không bị giới hạn bởi thư viện scene cố định.
