# SCENIO VOCABULARY SYSTEM SPEC

**Tài liệu đặc tả hệ thống Từ vựng + Deck theo ngữ cảnh + SRS Hybrid**  
*Dự án: Scenio - AI Language Learning Platform*  
*Cập nhật: 2026-04-17*

---

## 1. Mục tiêu của hệ thống

Scenio không muốn người học cảm thấy mình đang đứng trước một "bể từ vựng" khổng lồ và vô hồn.

Thay vào đó, hệ thống từ vựng của Scenio phải giải được đồng thời 3 mục tiêu:

1. **Có một từ điển tổng hợp rõ ràng**
   - user luôn có nơi để xem toàn bộ từ mình đã lưu

2. **Không làm mất ngữ cảnh**
   - cùng một từ nếu xuất hiện lại trong một cuộc hội thoại khác, user vẫn cần thấy nó gắn với ngữ cảnh mới đó

3. **Có khả năng review theo SRS**
   - từ đã học xong không biến mất hoàn toàn
   - hệ thống vẫn biết khi nào nên nhắc lại

Nói ngắn gọn:

> Scenio cần vừa có `My Dictionary`, vừa có `Context Decks`, vừa có `SRS review`.

---

## 2. Tư duy phương pháp luận

### 2.1. Dictionary tổng hợp

Mỗi từ mà user đã lưu chỉ nên có **một bản ghi tổng hợp duy nhất** trong hệ thống.

Ví dụ:

- `boarding pass`
- `appetizer`
- `reservation`

Mục đích:

- dễ tra cứu
- không trùng lặp lộn xộn
- làm nguồn sự thật cho tiến độ học của từ
- gắn `isMastered`, `srsLevel`, `nextReviewAt` ở một nơi duy nhất

### 2.2. Context-based Decks

Dù dictionary chỉ có một bản ghi duy nhất cho mỗi từ, user vẫn có thể gặp lại từ đó ở nhiều session khác nhau.

Ví dụ:

- `boarding pass` xuất hiện ở session `Airport Check-in`
- về sau lại xuất hiện ở session `Missed Flight Support`

Scenio phải lưu lại **mỗi lần gặp từ theo session** để:

- dựng deck theo ngữ cảnh
- giúp user nhớ từ gắn với cuộc trò chuyện cụ thể
- tạo cảm giác "mình đã gặp từ này ở đâu rồi"

### 2.3. SRS Hybrid

SRS không nên gắn vào từng lần xuất hiện.

Nếu gắn SRS vào từng occurrence, cùng một từ sẽ có nhiều trạng thái học khác nhau và rất rối.

Vì vậy:

- **SRS gắn vào Dictionary Entry**
- **Occurrence chỉ là lịch sử gặp lại theo session**

Đây là điểm thiết kế quan trọng nhất của hệ thống.

---

## 3. Mô hình dữ liệu được chốt

## 3.1. `SceneVocabulary`

Đây là bảng từ tĩnh của từng scene, đã có sẵn trong hệ thống.

Ví dụ:

- `menu`
- `boarding pass`
- `reservation`

Vai trò:

- nguồn từ gốc theo scene
- dùng để auto-save từ scene sang dictionary của user

## 3.2. `UserVocabulary`

Đây là **dictionary tổng hợp của user**.

Một từ chỉ có **một record duy nhất** cho mỗi user.

Field cốt lõi:

- `id`
- `userId`
- `normalizedWord`
- `word`
- `definition`
- `sceneVocabularyId` (optional)
- `sourceSessionId` (session gần nhất mà user gặp từ)
- `encounterCount`
- `srsLevel`
- `nextReviewAt`
- `isMastered`
- `savedAt`
- `lastSeenAt`
- `reviewedAt`

### Ý nghĩa

- `normalizedWord`: khóa duy nhất để tránh trùng dictionary theo user
- `encounterCount`: user đã gặp từ này bao nhiêu lần trong hệ thống
- `isMastered`: trạng thái "đã thuộc" ở level UI
- `nextReviewAt`: lịch review tiếp theo

## 3.3. `UserVocabularyOccurrence`

Đây là bảng ghi lại **mỗi lần từ xuất hiện trong một session cụ thể**.

Field cốt lõi:

- `id`
- `userVocabularyId`
- `userId`
- `sessionId`
- `sampleSentence`
- `sourceMessageId`
- `createdAt`

### Ý nghĩa

- đây là lớp dùng để dựng `Decks`
- một từ có thể có nhiều occurrence
- mỗi session chỉ nên có tối đa một occurrence cho cùng một từ

---

## 4. Quy tắc nghiệp vụ quan trọng

### 4.1. Không chặn "gặp lại từ"

Trước đây, tư duy "không cho trùng từ" là hợp lý nếu chỉ làm một list từ vựng phẳng.

Nhưng với Scenio, điều đó không còn đúng nữa.

Nếu user gặp lại một từ trong session mới:

- **không được báo duplicate error**
- vẫn phải ghi nhận đây là một lần gặp lại hợp lệ

### 4.2. Chỉ chống trùng ở tầng dictionary

Dictionary tổng hợp chỉ có một record cho:

- `userId + normalizedWord`

Nhưng occurrence vẫn có thể tạo mới ở:

- session A
- session B
- session C

### 4.3. Một session chỉ nên có một occurrence cho cùng một từ

Nếu user bấm save cùng một từ nhiều lần trong **cùng session**, backend nên:

- không tạo thêm occurrence trùng
- chỉ update occurrence hiện có nếu cần bổ sung `sampleSentence`

### 4.4. XP / mission / badge chỉ cộng khi có từ mới thật

Nếu user lưu lại một từ đã có trong dictionary:

- **không cộng lại mission `SAVE_VOCABULARY`**
- **không cộng lại badge / XP như một từ mới**

Chỉ lần đầu dictionary tạo mới mới tính là "save new vocabulary".

---

## 5. Hai lớp UX mà mobile có thể xây

## 5.1. My Dictionary

Đây là màn tổng hợp.

Hiển thị:

- tất cả từ user đã lưu
- `isMastered`
- `needsReview`
- `encounterCount`
- `lastSeenAt`
- scene hoặc latest context

## 5.2. Context Decks

Đây là màn deck theo session.

Hiển thị:

- deck theo `sessionId`
- tên scene
- số từ trong deck
- bao nhiêu từ đã mastered
- bao nhiêu từ đang due

Khi user mở một deck:

- xem danh sách từ trong session đó
- thấy `sampleSentence`
- thấy từ này xuất hiện trong ngữ cảnh nào

---

## 6. API đã chốt theo mô hình mới

### 6.1. `GET /api/vocabulary`

Lấy dictionary tổng hợp của user.

### 6.2. `GET /api/vocabulary/decks`

Lấy danh sách deck theo session context.

### 6.3. `GET /api/vocabulary/decks/:sessionId`

Lấy words nằm trong một deck session cụ thể.

### 6.4. `POST /api/vocabulary`

Save từ vào dictionary.

Logic:

- nếu dictionary chưa có từ đó:
  - tạo `UserVocabulary`
  - nếu có session thì tạo thêm occurrence

- nếu dictionary đã có từ đó:
  - không lỗi duplicate
  - nếu là session mới thì tạo occurrence mới
  - tăng `encounterCount`

### 6.5. `POST /api/vocabulary/:id/review`

Submit review SRS cho một dictionary word.

### 6.6. `DELETE /api/vocabulary/:id`

Xóa dictionary word của user.

Occurrence thuộc từ đó sẽ bị xóa cascade.

---

## 7. Vì sao thiết kế này phù hợp với Scenio

### 7.1. Giữ được ngữ cảnh

User không chỉ nhớ từ "boarding pass".

User nhớ:

- đã nghe từ này ở sân bay
- AI đã dùng nó trong câu nào
- mình đã trả lời ra sao

Occurrence theo session giúp điều này.

### 7.2. Không làm dictionary rối

Nếu mỗi lần gặp lại đều tạo một record từ mới trong dictionary:

- user sẽ thấy rất nhiều bản ghi trùng
- khó review
- khó thống kê tiến độ thật

Dictionary aggregate giải quyết chuyện đó.

### 7.3. SRS bám đúng vào đơn vị học

Thứ user cần thuộc là **từ**, không phải "lần thứ 2 gặp từ trong session X".

Vì vậy SRS gắn vào dictionary aggregate là đúng hơn.

---

## 8. Dữ liệu nào sẽ dùng cho tương lai

Mô hình mới mở đường cho các tính năng sau:

### 8.1. Auto vocabulary extraction từ transcript

Từ `Message` hoặc transcript realtime, backend có thể:

- trích ra candidate words
- tạo `sampleSentence`
- save occurrence vào session tương ứng

### 8.2. Gợi ý review thông minh

Backend có thể gợi ý:

- từ nào tới hạn review
- từ nào user vừa gặp lại nhiều lần nhưng chưa mastered
- từ nào nên tái sử dụng trong scene tiếp theo

### 8.3. Adaptive roleplay

Về sau Scenio có thể:

- nhắc AI cố tình reuse từ user đang yếu
- đưa từ đã tới hạn review trở lại trong hội thoại

Đây là điểm rất mạnh cho đồ án vì nó nối:

- vocabulary system
- session system
- AI conversation system

---

## 9. Những gì đã thay đổi so với tư duy cũ

### Tư duy cũ

- save từ vào một list
- nếu trùng thì báo lỗi

### Tư duy mới

- dictionary chỉ giữ một bản ghi tổng hợp
- gặp lại ở session khác vẫn được lưu
- deck context là lớp lịch sử gặp từ
- SRS nằm ở dictionary

Đây là thay đổi rất quan trọng về mặt sư phạm và kiến trúc.

---

## 10. Kết luận cuối cùng

Hệ thống từ vựng mới của Scenio được chốt theo mô hình:

> **Dictionary Aggregate + Session Occurrences + SRS Hybrid**

Mô hình này cân bằng được cả 3 mục tiêu:

- học theo ngữ cảnh
- có từ điển tổng hợp sạch
- có khả năng review lặp lại ngắt quãng

Nó phù hợp hơn nhiều với bản chất sản phẩm Scenio so với một vocabulary list phẳng truyền thống.

---

## 11. Tài liệu liên quan

- [API_ENDPOINT.md](./API_ENDPOINT.md)
- [REALTIME_VOICE_PLAN.md](./REALTIME_VOICE_PLAN.md)
- [VOICE_PRODUCT_PLAN.md](./VOICE_PRODUCT_PLAN.md)
