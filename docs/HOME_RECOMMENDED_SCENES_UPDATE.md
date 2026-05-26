# Home Recommended Scenes - Cần Update Payload

## 1. Vấn đề hiện tại

Ở mobile, card `Gợi ý cho bạn` trong Home đang hiển thị thiếu phần content chính giữa.

Hiện trạng quan sát được:

- title vẫn có
- meta dòng dưới vẫn có: `category • difficulty • estimatedMinutes`
- nhưng phần nội dung giữa card đang rỗng hoặc không đúng kỳ vọng

Nguyên nhân là payload `recommendedScenes` từ backend hiện đang quá mỏng, trong khi mobile lại map nó theo `SceneApiModel` gần giống scene card chuẩn.

---

## 2. Root cause

### Backend đang trả về

Trong [home.repository.ts](/Users/khangnguyen/DoAnTotNghiep/scenio_be/src/modules/home/home.repository.ts), `homeSceneSelect` hiện chỉ lấy:

- `id`
- `title`
- `category`
- `difficulty`
- `estimatedMinutes`
- `characterName`

### Mobile đang kỳ vọng

Phía mobile map `recommendedScenes` bằng `SceneApiModel.fromMap(item).toEntity()`.

Model này ở mobile đang kỳ vọng thêm các field:

- `description`
- `characterRole`
- `missionText`

Nếu backend không trả các field này thì mobile sẽ rơi vào fallback:

- `description = ''`
- `characterRole = 'Conversation partner'`
- `mission = description`

Vì vậy card Home bị mất phần nội dung chính giữa.

---

## 3. File backend cần update

### Cần sửa trực tiếp

- [home.repository.ts](/Users/khangnguyen/DoAnTotNghiep/scenio_be/src/modules/home/home.repository.ts)
- [home.service.ts](/Users/khangnguyen/DoAnTotNghiep/scenio_be/src/modules/home/home.service.ts)
- [API_ENDPOINT.md](/Users/khangnguyen/DoAnTotNghiep/scenio_be/docs/API_ENDPOINT.md)

### File liên quan phía mobile để đối chiếu

- [home_dashboard_model.dart](/Users/khangnguyen/DoAnTotNghiep/scenio_client_mobile/lib/app/data/models/home_dashboard_model.dart)
- [scene_api_model.dart](/Users/khangnguyen/DoAnTotNghiep/scenio_client_mobile/lib/app/data/models/scene_api_model.dart)
- [home_view.dart](/Users/khangnguyen/DoAnTotNghiep/scenio_client_mobile/lib/app/modules/home/home_view.dart)

---

## 4. Payload đề xuất

### Tối thiểu nên trả thêm

Cho mỗi item trong `recommendedScenes`, nên bổ sung:

- `description`
- `characterRole`
- `missionText`

### Response shape đề xuất

```json
{
  "recommendedScenes": [
    {
      "id": "uuid",
      "title": "At the Coffee Shop",
      "category": "DAILY",
      "description": "Order a drink and ask follow-up questions politely.",
      "difficulty": "A2",
      "estimatedMinutes": 6,
      "characterName": "Mia",
      "characterRole": "Barista",
      "missionText": "Complete a smooth cafe order from greeting to payment."
    }
  ]
}
```

---

## 5. Chỗ nên sửa trong repository

`homeSceneSelect` nên được mở rộng từ:

```ts
const homeSceneSelect = {
  id: true,
  title: true,
  category: true,
  difficulty: true,
  estimatedMinutes: true,
  characterName: true,
}
```

thành:

```ts
const homeSceneSelect = {
  id: true,
  title: true,
  category: true,
  description: true,
  difficulty: true,
  estimatedMinutes: true,
  characterName: true,
  characterRole: true,
  missionText: true,
}
```

---

## 6. Tại sao nên fix ở backend

Không nên vá bằng fallback ở mobile vì:

- `recommendedScenes` về bản chất vẫn là dữ liệu scene thật
- mobile Home, Scenes, Scene Detail nên dùng cùng một source shape càng nhiều càng tốt
- fix ở backend sẽ giữ contract sạch hơn và tránh logic fallback rải rác

Nói ngắn gọn:

- đây là lỗi thiếu dữ liệu từ BE
- không phải lỗi layout thuần ở mobile

---

## 7. Checklist update

- [ ] Mở rộng `homeSceneSelect` trong `home.repository.ts`
- [ ] Kiểm tra `recommendedScenes` từ `home.service.ts` vẫn pass type
- [ ] Cập nhật ví dụ response trong `API_ENDPOINT.md`
- [ ] Test `GET /api/home/dashboard`
- [ ] Kiểm tra lại Home card ở mobile có hiện đúng content giữa chưa

---

## 8. Ghi chú thêm

Nếu sau này muốn card Home giàu nội dung hơn nữa, có thể cân nhắc trả thêm:

- `voicePreviewLabel`
- `sourceType`
- `bestScore`
- `isRecommendedBecauseOfGoal`

Nhưng cho issue hiện tại thì **chỉ cần thêm `description`, `characterRole`, `missionText` là đủ**.
