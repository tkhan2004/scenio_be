# VOCABULARY IMPLEMENTATION GUIDE

**Guide ngắn để follow phần Vocabulary hiện tại của Scenio backend**  
*Cập nhật: 2026-04-17*

---

## 1. Tư duy đã chốt

Hệ thống từ vựng hiện tại của Scenio đi theo mô hình:

- `Dictionary tổng hợp`
- `Occurrences theo session`
- `SRS review ở tầng dictionary`

Điều này có nghĩa là:

- một từ chỉ có **một record tổng hợp** trong từ điển của user
- nhưng cùng từ đó có thể được **gặp lại ở nhiều session khác nhau**
- mỗi lần gặp lại sẽ được lưu như một occurrence để dựng deck theo ngữ cảnh

---

## 2. Ba bảng quan trọng

### 2.1. `scene_vocabulary`

Nguồn từ gốc của từng scene.

### 2.2. `user_vocabulary`

Đây là bảng dictionary tổng hợp của user.

Field quan trọng:

- `normalizedWord`
- `word`
- `definition`
- `encounterCount`
- `srsLevel`
- `nextReviewAt`
- `isMastered`
- `lastSeenAt`
- `sourceSessionId`

### 2.3. `user_vocabulary_occurrences`

Đây là bảng lưu từng lần user gặp lại từ trong một session cụ thể.

Field quan trọng:

- `userVocabularyId`
- `sessionId`
- `sampleSentence`
- `sourceMessageId`
- `createdAt`

---

## 3. Quy tắc nghiệp vụ đang áp dụng

### 3.1. Save từ không còn báo duplicate theo kiểu cũ

Nếu user lưu lại một từ đã có trong dictionary:

- backend **không trả lỗi duplicate**
- backend sẽ kiểm tra xem session hiện tại đã có occurrence cho từ đó chưa

### 3.2. Một session chỉ có một occurrence cho một từ

Nếu user bấm save cùng một từ nhiều lần trong cùng session:

- không tạo occurrence trùng
- chỉ bổ sung thêm `sampleSentence` hoặc `sourceMessageId` nếu còn thiếu

### 3.3. `encounterCount` chỉ tăng khi có session context mới

Dictionary word không tự tăng vô hạn chỉ vì user spam save cùng một chỗ.

### 3.4. XP / mission / badge chỉ tính khi dictionary word được tạo mới

Lần gặp lại từ cũ không được tính như một từ mới.

---

## 4. API hiện có

### 4.1. Dictionary tổng hợp

- `GET /api/vocabulary`
- `POST /api/vocabulary`
- `DELETE /api/vocabulary/:id`
- `POST /api/vocabulary/:id/review`

### 4.2. Deck theo ngữ cảnh

- `GET /api/vocabulary/decks`
- `GET /api/vocabulary/decks/:sessionId`

---

## 5. Cách hiểu response để code client

### 5.1. `GET /api/vocabulary`

Dùng cho màn:

- `My Dictionary`
- `Saved Words`
- `Review Queue`

Response tập trung vào:

- trạng thái tổng hợp của từ
- số lần gặp lại
- có cần review không
- lần gặp gần nhất là ở đâu

### 5.2. `GET /api/vocabulary/decks`

Dùng cho màn:

- `Decks`
- `Session Vocabulary History`

Response tập trung vào:

- mỗi session là một deck
- số từ trong deck
- scene tương ứng
- progress sơ bộ của deck

### 5.3. `GET /api/vocabulary/decks/:sessionId`

Dùng cho màn:

- `Deck Detail`

Response tập trung vào:

- các từ nằm trong một session cụ thể
- `sampleSentence`
- trạng thái mastered / due / SRS

---

## 6. Cách save từ đúng trong flow session

Khi user đang học trong một session và bấm lưu từ:

1. client gọi `POST /api/vocabulary`
2. gửi:
   - `sceneVocabularyId` hoặc `word + definition`
   - `sourceSessionId`
   - `sampleSentence`
   - `sourceMessageId` nếu có
3. backend sẽ:
   - upsert dictionary word
   - tạo hoặc cập nhật occurrence
   - cộng mission/xp nếu đó là từ mới thật

---

## 7. Cách review từ

Khi user review một từ trong dictionary:

1. client gọi `POST /api/vocabulary/:id/review`
2. gửi:
   - `isDone`
   - `recallQuality`
3. backend sẽ cập nhật:
   - `srsLevel`
   - `nextReviewAt`
   - `reviewedAt`
   - `isMastered`

---

## 8. File backend chính cần đọc khi làm tiếp

- `prisma/schema.prisma`
- `src/modules/vocabulary/vocabulary.routes.ts`
- `src/modules/vocabulary/vocabulary.controller.ts`
- `src/modules/vocabulary/vocabulary.service.ts`
- `src/modules/vocabulary/vocabulary.repository.ts`
- `src/schemas/vocabulary/*`
- `docs/VOCABULARY_SYSTEM_SPEC.md`
- `docs/API_ENDPOINT.md`

---

## 9. Việc nên làm tiếp sau phần hiện tại

### Ưu tiên cao

- nối auto-save từ từ transcript/session message
- gắn vocabulary save vào flow chat/realtime voice
- thêm badge/mission riêng cho review vocabulary

### Ưu tiên vừa

- filter dictionary theo `needsReview`
- sort deck theo `due first`
- thêm analytics số lần gặp từ theo scene

### Ưu tiên sau

- example sentence nâng cao
- synonym / collocation
- spaced review nâng cấp hơn

---

## 10. Kết luận ngắn

Backend hiện tại đã chuyển từ mô hình:

- `flat saved vocabulary list`

sang mô hình:

- `dictionary tổng hợp + occurrences theo session + SRS`

Đây là nền phù hợp hơn nhiều cho Scenio vì vẫn giữ được:

- tra cứu tổng hợp
- ngữ cảnh hội thoại
- khả năng review lâu dài
