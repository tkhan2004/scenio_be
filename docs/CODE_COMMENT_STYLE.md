# Scenio Backend Comment Style

Tài liệu này chuẩn hóa style comment đang dùng tốt nhất trong module `auth`, để áp dụng nhất quán cho các module backend còn lại như `home`, `scenes`, `sessions`, `users`, `missions`, `vocabulary`.

## 1. Mục tiêu của comment

Comment trong backend nên trả lời nhanh 4 câu hỏi:

1. Hàm này để làm gì?
2. Nó nhận gì vào?
3. Nó xử lý theo luồng nào?
4. Nó trả gì ra hoặc ảnh hưởng gì?

Comment nên mô tả:
- intent
- business rule
- boundary của hàm

Comment không nên mô tả:
- syntax quá hiển nhiên
- từng dòng code đơn giản
- điều mà tên biến/hàm đã nói rất rõ

## 2. Tông comment khuyến nghị

Giữ giống `auth`:
- Tiêu đề ngắn bằng English để dễ scan
- Nội dung giải thích bằng tiếng Việt để team đọc nhanh
- Mỗi block comment 2-4 dòng là đủ
- Dùng cùng format giữa các layer

Ví dụ tốt:

```ts
/**
 * Function Objective - login
 * Summary: Đăng nhập lấy bộ đôi token mới.
 */
```

## 3. Template theo layer

### 3.1 Service function

Dùng khi hàm chứa business logic.

```ts
/**
 * Function Objective - <functionName>
 * Summary: <Mô tả ngắn mục tiêu của hàm>.
 * Inputs: <Input chính nếu cần nêu rõ>.
 * Behavior: <Luồng xử lý chính theo từng bước ngắn>.
 * Returns: <Kết quả trả về nếu cần làm rõ>.
 */
```

Ví dụ:

```ts
/**
 * Function Objective - getHome
 * Summary: Lấy toàn bộ dữ liệu dashboard cho user hiện tại.
 * Inputs: userId từ access token đã verify.
 * Behavior: Tải user -> mission hôm nay -> session đang active -> scene gợi ý.
 * Returns: Object dashboard đã chuẩn hóa cho mobile client.
 */
```

### 3.2 Controller / HTTP handler

Dùng cho các hàm nhận `req`, `res`, `next`.

```ts
/**
 * HTTP Handler - <handlerName>
 * Summary: <Mục tiêu của endpoint>.
 * Inputs: req, res, next.
 * Behavior: <Lấy input đã validate> -> <gọi service> -> <trả response>.
 */
```

Ví dụ:

```ts
/**
 * HTTP Handler - levelTest
 * Summary: Xử lý một lượt hội thoại trong bài test trình độ.
 * Inputs: req, res, next.
 * Behavior: Lấy userId + body đã validate -> gọi service -> trả kết quả cho client.
 */
```

### 3.3 Repository function

Dùng cho các hàm truy cập Prisma / DB.

```ts
/**
 * Repository - <moduleName>
 * Summary: <Phạm vi truy cập dữ liệu của file>.
 */
```

Với từng hàm quan trọng:

```ts
/**
 * Query Objective - <functionName>
 * Summary: <Hàm lấy/cập nhật dữ liệu gì>.
 * Query Shape: <findUnique/findMany/update/create... nếu cần>.
 */
```

Ví dụ:

```ts
/**
 * Query Objective - findInProgressSession
 * Summary: Lấy session ACTIVE mới nhất của user để hiển thị ở home.
 * Query Shape: findFirst + orderBy startedAt desc + include scene title/characterName.
 */
```

### 3.4 Route block

Route comment nên cực ngắn, chỉ giữ `@route` và `@desc`.

```ts
/**
 * @route   POST /api/sessions/level-test
 * @desc    Gửi một lượt level test và nhận phản hồi AI
 */
```

Không cần thêm comment dài ở route nếu controller đã có comment rõ.

### 3.5 Helper / Utility function

Dùng cho hàm phụ trợ có logic đáng chú ý.

```ts
/**
 * Helper - <functionName>
 * Summary: <Vai trò của helper>.
 * Notes: <Rule hoặc assumption quan trọng nếu có>.
 */
```

Ví dụ:

```ts
/**
 * Helper - buildSafeUser
 * Summary: Loại bỏ password và bổ sung các field routing cho client.
 * Notes: needsOnboarding được suy ra từ onboardingCompletedAt.
 */
```

### 3.6 Schema file

Schema thường không cần comment cho từng field nếu tên field đã rõ. Chỉ thêm comment ở đầu file khi schema có rule đặc biệt.

```ts
/**
 * Schema Objective - levelTestSchema
 * Summary: Validate payload cho bài test trình độ 5 lượt.
 * Notes: turnIndex chỉ nhận 0-5, history tối đa 10 item để tránh request quá lớn.
 */
```

## 4. Mức độ chi tiết nên dùng

### Khi nên comment

- Hàm có business rule
- Hàm là điểm vào của module
- Hàm repository có query shape không hiển nhiên
- Helper có assumption hoặc side effect

### Khi không cần comment

- Getter hoặc mapper quá đơn giản
- Hàm CRUD tự mô tả rõ bằng tên
- Các dòng code hiển nhiên như gán biến hoặc return trực tiếp

Ví dụ không cần:

```ts
const today = new Date().toISOString().slice(0, 10);
```

## 5. Mẫu chuẩn nên dùng trong Scenio

### File service

```ts
/**
 * Function Objective - <name>
 * Summary: <Mục tiêu chính>.
 * Inputs: <input chính>.
 * Behavior: <bước 1> -> <bước 2> -> <bước 3>.
 * Returns: <kết quả>.
 */
```

### File controller

```ts
/**
 * HTTP Handler - <name>
 * Summary: <mục tiêu endpoint>.
 * Inputs: req, res, next.
 * Behavior: <read validated input> -> <call service> -> <send response>.
 */
```

### File repository

```ts
/**
 * Repository - <module>
 * Summary: <phạm vi truy cập dữ liệu>.
 */
```

## 6. Gợi ý áp dụng cho các module còn lại

### `home`

- Comment rõ logic ghép dashboard
- Comment rõ rule gợi ý scene theo `learningGoal`

### `scenes`

- Comment rõ khác nhau giữa `list`, `search`, `recommend`, `detail`
- Với search, comment rõ hiện tại là text search chứ chưa phải vector search

### `sessions`

- Comment rõ luồng `level-test`, `start session`, `message`, `hint`, `result`
- Comment rõ chỗ nào gọi LLM, chỗ nào parse marker, chỗ nào chấm điểm

### `users`

- Comment rõ endpoint nào chỉ update profile, endpoint nào update onboarding

## 7. Quy tắc cuối cùng

- Ưu tiên comment ở cấp function hơn là comment từng dòng
- Giữ câu ngắn, rõ, nhất quán
- Một file chỉ cần vài comment tốt, không cần phủ kín toàn bộ
- Nếu comment không thêm ý nghĩa mới, bỏ comment đó đi

