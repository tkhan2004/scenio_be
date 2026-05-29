# End-to-End Product Completeness Audit

Tài liệu này dùng để đánh giá backend Scenio theo góc nhìn sản phẩm và demo luận văn:

- Luồng nào đã khép kín end-to-end.
- Luồng nào mới hoàn thành về API nhưng chưa hoàn chỉnh về đầu ra học tập.
- Ngoài roadmap lifecycle, những phần nào đã đủ để demo và những phần nào còn hở.

---

## 1. Kết luận ngắn

Backend hiện tại đã đủ tốt cho một vòng học chính:

```text
Đăng nhập
-> level test / onboarding
-> vào home
-> chọn scene hoặc custom practice
-> start session
-> hội thoại text/voice
-> complete session
-> nhận score + feedback + coaching + next action
-> xem progress/history/vocabulary/notifications
```

Luồng trên đã có dữ liệu và endpoint thật.

Phần chưa khép hoàn toàn nằm ở:

1. `Roadmap lifecycle outcome`
2. `Reminder chủ động`
3. `Voice realtime client-side hoàn chỉnh`
4. `Adaptive evaluation sâu theo từng context`

Nếu mục tiêu là demo học tập có ý nghĩa, backend hiện tại đã có nền đủ chắc. Nếu mục tiêu là gọi hệ thống là "đã hoàn chỉnh tuyệt đối", thì vẫn còn vài điểm cần chốt.

---

## 2. Đánh giá theo từng cụm chức năng

## 2.1. Auth và identity

**Trạng thái:** `Gần hoàn chỉnh`

Đã có:

- Email/password register/login
- Refresh token
- Logout
- Verify token
- Google login bằng Google ID token

Ý nghĩa end-to-end:

- User có thể tạo tài khoản, đăng nhập, giữ phiên, quay lại app.

Điểm còn thiếu:

- Chưa có tài liệu flow mobile Google Sign-In hoàn chỉnh theo native provider.
- Nếu mobile chọn dùng Firebase Auth thì cần quyết định rõ:
  - mobile lấy `idToken` từ Google/Firebase
  - backend chỉ verify token và cấp JWT nội bộ

Kết luận:

- Với backend scope, phần auth đã đủ cho demo.

---

## 2.2. Home dashboard

**Trạng thái:** `Đủ dùng cho demo`

Đã có:

- user summary
- missions hôm nay
- in-progress session
- recommended scenes

Ý nghĩa end-to-end:

- User vào app là thấy nên học gì tiếp và có thể resume phiên đang học.

Điểm còn thiếu:

- Home chưa phải trung tâm điều phối roadmap lifecycle hoàn chỉnh.
- Chưa đẩy mạnh signal như:
  - roadmap đang ở tuần mấy
  - đã hoàn thành bao nhiêu phần trăm
  - next study day

Kết luận:

- Home đủ cho demo, nhưng chưa phải "learning command center" hoàn chỉnh.

---

## 2.3. Scenes, search, recommend

**Trạng thái:** `Khá hoàn chỉnh`

Đã có:

- list scenes
- scene detail
- semantic search bằng pgvector, có fallback text search
- recommend scenes theo learning data
- scene voices

Ý nghĩa end-to-end:

- User có thể tìm scene, chọn scene phù hợp, hoặc được hệ thống gợi ý.

Điểm còn thiếu:

- Chưa có explicit ranking explanation cho user.
- Recommend hiện chủ yếu là backend intelligence, UI cần render khéo để thấy đây là gợi ý học tập.

Kết luận:

- Đây là một trong những cụm đã hoàn chỉnh nhất của backend.

---

## 2.4. Level test + onboarding

**Trạng thái:** `Đã khép logic chính`

Đã có:

- level test qua AI
- lưu level sau khi hoàn thành
- onboarding survey
- generate learning plan sau onboarding

Luồng hiện tại:

```text
level test complete
-> chỉ cập nhật level
-> user làm onboarding
-> generate roadmap lần đầu
```

- `GET /learning-plan/current` trước onboarding sẽ không tự sinh roadmap.
- Điều này làm cho roadmap đầu tiên có một thời điểm chính thức rõ ràng hơn.

Điểm còn thiếu:

- Nếu mobile gọi `GET /learning-plan/current` quá sớm, cần xử lý response `409` đúng nghĩa là "chưa sẵn sàng tạo roadmap".

Kết luận:

- Phần lifecycle chính của `level test -> onboarding -> roadmap` hiện đã gọn hơn và phù hợp với flow học tập.

---

## 2.5. Session learning loop

**Trạng thái:** `Hoàn chỉnh cho demo`

Đã có:

- start session
- start custom practice
- sync message/transcript
- complete session
- evaluator AI + fallback
- score:
  - grammar
  - vocabulary
  - naturalness
- XP + streak + mission rewards
- hint
- abandon session
- result screen data
- next learning action
- spoken coaching

Ý nghĩa end-to-end:

```text
User luyện tập
-> backend chấm
-> backend lưu feedback vào message
-> backend trả result có ý nghĩa học tập
```

Đây là vòng học cốt lõi đã khép tương đối tốt.

Điểm còn thiếu:

- Chưa có pronunciation scoring thật từ audio.
- Adaptive evaluator mới ở mức khá, chưa đủ mềm theo từng scene context.
- Chưa có mission success rubric thật mạnh cho từng loại hội thoại.

Kết luận:

- Đây là phần mạnh nhất để mang đi demo.

---

## 2.6. Session result, correction, coaching

**Trạng thái:** `Đủ tốt cho learning demo`

Đã có:

- transcript đầy đủ
- lỗi theo từng user message
- suggestion
- explanation
- spoken coaching summary
- next learning action

Ý nghĩa end-to-end:

- User không chỉ bị chấm điểm, mà còn biết:
  - sai gì
  - sửa thế nào
  - nên làm gì tiếp

Điểm còn thiếu:

- Chưa có đánh giá pronunciation thật
- Chưa có correction rất chi tiết theo token/span cho mọi câu
- Chưa có phân tầng evaluator mạnh theo mục tiêu scene

Kết luận:

- Hoàn toàn đủ cho demo luận văn nếu UI render tốt.

---

## 2.7. Progress, history, badges, missions

**Trạng thái:** `Khá hoàn chỉnh`

Đã có:

- progress summary
- weekly XP
- skill scores
- sessions history gần đây
- badges
- daily missions

Ý nghĩa end-to-end:

- User có thể nhìn thấy quá trình tích lũy học tập, không chỉ từng phiên rời rạc.

Điểm còn thiếu:

- Chưa có endpoint history phân trang đầy đủ kiểu inbox toàn bộ session history.
- Phần "roadmap completion impact" chưa đổ ngược mạnh vào progress.

Kết luận:

- Dùng tốt cho demo hiện tại.

---

## 2.8. Vocabulary learning loop

**Trạng thái:** `Đủ tốt`

Đã có:

- dictionary user
- deck theo session
- save word
- review SRS
- delete word

Ý nghĩa end-to-end:

- User có thể biến từ mới trong lúc học thành dữ liệu ôn tập lâu dài.

Điểm còn thiếu:

- Chưa auto-extract vocabulary mạnh từ evaluator để tạo deck tự động sâu hơn.
- Chưa có quiz mode riêng cho vocabulary.

Kết luận:

- Đây là một loop học bổ trợ đã khá ổn.

---

## 2.9. In-app notifications

**Trạng thái:** `Backend đã khá hoàn chỉnh`

Đã có:

- list notifications
- mark one read
- mark all read
- tạo notification cho:
  - session completed
  - mission completed
  - badge earned
  - learning plan ready
  - learning plan refreshed
  - roadmap completed
  - study reminder

Điểm còn thiếu:

- Study reminder hiện là pull-based, chưa phải scheduler chủ động.
- Mobile UI inbox/bell cần map hoàn chỉnh để user thấy giá trị.

Kết luận:

- Backend ổn.
- Trải nghiệm hoàn chỉnh còn phụ thuộc mobile.

---

## 2.10. Voice realtime

**Trạng thái:** `Backend sẵn sàng một phần, end-to-end chưa hoàn chỉnh`

Đã có:

- realtime token endpoint
- sync final transcript
- session result cho voice
- spoken coaching

Điểm còn thiếu:

- Mobile WebRTC/OpenAI Realtime client chưa hoàn chỉnh end-to-end.
- Chưa có pronunciation assessment chuẩn.
- Backend hiện hỗ trợ phần server lifecycle, nhưng trải nghiệm voice hoàn chỉnh còn phụ thuộc mobile nhiều.

Kết luận:

- Voice có thể trình bày là kiến trúc đã sẵn sàng.
- Nếu demo cần sự ổn định, nên ưu tiên text flow hoặc voice flow ở mức controlled demo.

---

## 2.11. AI model config và admin benchmark

**Trạng thái:** `Khá hoàn chỉnh`

Đã có:

- list model theo feature
- connect model
- benchmark model
- fallback model strategy

Ý nghĩa end-to-end:

- Admin có thể chọn model cho embedding, evaluator, roleplay, realtime, TTS, STT.
- Dễ benchmark và đổi provider mà không sửa code business.

Điểm còn thiếu:

- UI admin còn cần polish để thấy rõ active/fallback chain.
- Chưa có full secret management flow nếu muốn production-grade.

Kết luận:

- Rất tốt cho phần báo cáo kỹ thuật và demo admin.

---

## 3. Điểm hở lớn nhất hiện tại

## 3.1. Roadmap lifecycle đã gần khép kín

Đây từng là lỗ hổng lớn nhất theo góc độ learning product, nhưng hiện đã được khép phần chính.

Đã có:

- current roadmap
- roadmap steps
- complete step
- auto update sau session complete
- completion summary
- reward roadmap được grant thật vào user XP
- roadmap completed notification
- next roadmap suggestion
- explicit endpoint để start roadmap kế tiếp

Chưa có:

- badge roadmap thật trong bảng badges/achievements chung
- scheduler hoặc automation để chủ động đẩy user sang roadmap mới nếu muốn
- analytics riêng cho roadmap completion rate / roadmap retention

Hệ quả:

- User hoàn thành roadmap giờ đã nhận outcome thật hơn:
  - `xpBonus` được cộng thật
  - completion summary giữ được kết quả
  - có thể bấm sang roadmap tiếp theo bằng endpoint riêng

Phần còn thiếu chủ yếu là polish sản phẩm, không còn là lỗ hổng lifecycle cốt lõi.

---

## 3.2. Reminder chưa phải proactive scheduler

Hiện reminder được sinh khi client chạm vào learning plan API đúng thời điểm.

Điều này ổn cho giai đoạn đầu, nhưng chưa phải cơ chế nhắc học chủ động thật.

Nếu sau này muốn hoàn chỉnh:

- dùng cron/queue để tạo reminder định kỳ
- hoặc dùng push notification qua FCM

---

## 3.3. Evaluator chưa scene-aware sâu

Hiện đủ để học và demo, nhưng nếu nói tới "AI chấm mềm dẻo theo từng cuộc hội thoại" thì vẫn còn khoảng cách.

Cần nâng sau:

- mission success
- context appropriateness
- initiative / confidence
- rubric riêng theo loại scene

---

## 4. Demo readiness theo mức độ

## 4.1. Đã sẵn sàng để demo

- Auth
- Home
- Scene list/detail/search/recommend
- Text session
- Complete session + result
- Progress/history
- Vocabulary
- Badges/missions
- Admin AI config

## 4.2. Demo được nhưng cần nói rõ giới hạn

- Voice realtime
- In-app reminder
- Adaptive AI evaluation

## 4.3. Chưa nên hứa là hoàn chỉnh tuyệt đối

- Push notification
- Pronunciation scoring thật
- Full roadmap badge system trong achievements chung

---

## 5. Nếu cần chốt để báo cáo luận văn

Nếu mục tiêu là:

> "Ứng dụng học giao tiếp tiếng Anh có AI, có lộ trình, có chấm điểm, có phản hồi, có gợi ý bước học tiếp theo"

thì backend hiện tại đã đủ mạnh để bảo vệ luận văn và demo.

Nếu mục tiêu là:

> "Tất cả vòng đời học tập đã hoàn chỉnh tuyệt đối"

thì còn 3 việc nên làm tiếp:

1. Làm reminder/scheduler chủ động hơn
2. Thêm roadmap badge vào achievements chung
3. Nâng evaluator scene-aware hơn

---

## 6. Thứ tự ưu tiên nếu muốn polish tiếp

### Priority 1

- Mobile render completion summary tốt hơn
- In-app notification inbox hoàn chỉnh

### Priority 2

- Scene-aware evaluator sâu hơn
- Roadmap badge trong achievements chung

### Priority 3

- Push reminder / scheduler / automation
- Push notification / scheduler
- Pronunciation assessment

---

## 7. Kết luận cuối

Ngoài `roadmap lifecycle`, đa số các cụm chức năng chính của backend đã ở mức:

- có API thật
- có dữ liệu thật
- có business flow thật
- đủ để mobile map thành trải nghiệm học tập

Điểm chưa khép nhất hiện tại không phải session loop, mà là:

```text
hoàn thành roadmap
-> user thực sự nhận được gì
-> hệ thống chuyển user sang giai đoạn học tiếp theo như thế nào
```

Đó là phần nên xem là phase polish tiếp theo.
