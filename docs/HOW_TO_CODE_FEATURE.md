# Hướng dẫn code 1 chức năng mới (New Feature Workflow)

> **Bước 0 bắt buộc:** Trước khi code backend, đọc `scenio_be/docs/BACKEND_SKILL.md`
> và nhìn lại module `auth` để bám đúng mẫu comment, response format, naming, và layering.

Vì dự án được cấu trúc theo mô hình **Layered Architecture** (Routes -> Controller -> Service), nên khi code một API mới, bạn nên đi từ **trong ra ngoài** (từ Database lên tới Route).

Việc tuân thủ thứ tự này giúp bạn tư duy mạch lạc: 
- Bạn lưu gì trong Database?
- Data input từ người dùng cần kiểm tra những gì?
- Data xử lý sao?
- Cuối cùng là ghép vào URL nào?

Dưới đây là workflow chuẩn để phát triển một chức năng/API mới.
Trong mọi bước bên dưới, ưu tiên bám theo module `auth` nếu cần một ví dụ sống trong repo.

---

## Bước 1: Thiết kế Database (`prisma/schema.prisma`)
*Nếu chức năng không cần sửa database, hãy bỏ qua bước này.*

1. Mở `prisma/schema.prisma` và thêm Model hoặc cập nhật trường mới.
2. Mở Terminal và gõ:
   ```bash
   npx prisma format         # Format lại code cho đẹp
   npx prisma migrate dev    # Cập nhật DB (Sẽ hỏi tên migration, VD: add_user_model)
   npx prisma generate       # Cập nhật lại tool nhắc code (IntelliSense)
   ```

## Bước 2: Khai báo Cấu trúc dữ liệu đầu vào (Schema / Validation)
Bạn cần quy định rõ người dùng gửi lên cái gì. 

1. Tạo file `.schema.ts` trong `src/schemas/<module>/`.
2. Dùng `zod` để định nghĩa và export type.
3. Controller sẽ lấy dữ liệu từ `(req as any).validatedBody` hoặc `validatedQuery`.

## Bước 3: Viết Logic cốt lõi (Service Layer)
Nơi chứa toàn bộ não của ứng dụng. Service chỉ giao tiếp với Database, **TUYỆT ĐỐI** không đụng tới Req/Res của Express.

1. Tạo/Mở file `<module>.service.ts`.
2. Nếu có DB access đáng kể, tách query xuống `<module>.repository.ts`.
3. Viết comment theo mẫu `auth.service.ts`.
4. Ném lỗi bằng `throw Object.assign(new Error(...), { code, status })`.

## Bước 4: Viết Trạm tiếp nhận (Controller Layer)
Controller đứng giữa Route (URL) và Service. Nhiệm vụ của nó là: Nhận Request -> Gửi cho Service -> Báo Response cho người dùng.

1. Tạo/Mở file `<module>.controller.ts`.
2. Luôn bọc code bằng `try/catch` và `next(error)`.
3. Luôn dùng `ok()` hoặc `fail()`, không `res.json(...)` trực tiếp.
4. Viết comment theo mẫu `auth.controller.ts`.

## Bước 5: Đăng ký Đường dẫn API (Route Layer)
Tạo cánh cửa để cho App Mobile/Web gọi vào. Nơi này chúng ta gắn các chốt bảo vệ (Middleware).

1. Tạo/Mở file `<module>.routes.ts`.
2. Dùng comment `@route` / `@desc` như `auth.routes.ts`.
3. Gắn middleware theo thứ tự rõ ràng: `auth` -> `validate(schema)` -> controller nếu endpoint cần cả hai.

## Bước 6: Khai báo Module lớn vào Main App (`app.ts`)
*Nếu chức năng bạn làm nằm trong một file route đã có, bạn bỏ qua bước này.*

1. Mở file `src/app.ts`.
2. Import route và gán vào 1 URL cha.
3. Nếu thêm endpoint hoặc sửa contract, phải sync thêm:
   - `scenio_be/docs/API_ENDPOINT.md`
   - Postman collection hiện tại
   - seed nếu cần data test mới

---

## Tóm gọn mẹo ghi nhớ
1. Đọc `BACKEND_SKILL.md`
2. Nhìn `auth` để bám mẫu
3. DB nếu cần
4. Zod schema
5. Repository
6. Service
7. Controller
8. Route
9. Register vào `app.ts`
10. Sync docs + Postman + seed
