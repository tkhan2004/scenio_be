---
name: scenio-backend
description: >
  Canonical backend coding skill for the Scenio TypeScript/Express backend.
  Read this file before implementing, editing, or reviewing any backend module.
  The auth module is the primary reference implementation for naming, comments,
  layering, response shape, and endpoint style. Any backend change must stay
  consistent with this document, the current repo structure, and the existing auth module.
---

# Scenio Backend Skill

> **Rule số 1:** Trước khi code backend, phải đọc file này và nhìn lại module `auth`.
> `auth` hiện là module mẫu để suy ra style comment, cấu trúc file, naming, response format, và cách đi route -> controller -> service -> repository.

---

## 1. Mandatory Reading Order

Khi nhận bất kỳ yêu cầu backend nào, phải đọc theo thứ tự này:

1. `scenio_be/docs/BACKEND_SKILL.md`
2. Module `auth` hiện có:
   - `src/modules/auth/auth.routes.ts`
   - `src/modules/auth/auth.controller.ts`
   - `src/modules/auth/auth.service.ts`
   - `src/modules/auth/auth.repository.ts`
3. Tài liệu endpoint liên quan:
   - `scenio_be/docs/API_ENDPOINT.md`
4. Nếu tính năng chạm DB:
   - `prisma/schema.prisma`
   - `prisma/seeds/`
5. Nếu đang thêm feature mới:
   - `scenio_be/docs/HOW_TO_CODE_FEATURE.md`

Nếu code mới lệch `auth` mà không có lý do thật sự chính đáng, coi như sai convention.

---

## 2. Current Backend Reality

Đây là hiện trạng thật của repo, không phải target cũ.

| Key | Value |
|---|---|
| Runtime | Node.js 20 |
| Language | TypeScript |
| Framework | Express 4 |
| ORM | Prisma 7 |
| Database | PostgreSQL |
| Validation | Zod |
| Auth | JWT + bcryptjs + Google OAuth |
| LLM | Claude hoặc OpenAI qua `src/config/llm.ts` |
| Base URL | `http://localhost:3000/api` |
| Response helper | `src/utils/response.ts` |
| Dev command | `npm run dev` |

### Source of truth

- API contract: `scenio_be/docs/API_ENDPOINT.md`
- DB schema: `scenio_be/prisma/schema.prisma`
- Test data: `scenio_be/prisma/seeds/`
- Comment style: `auth` module + `scenio_be/docs/CODE_COMMENT_STYLE.md`

---

## 3. Folder Structure You Must Follow

```text
scenio_be/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   ├── seed.ts
│   └── seeds/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   ├── middleware/
│   ├── modules/
│   │   ├── auth/
│   │   ├── home/
│   │   ├── scenes/
│   │   ├── sessions/
│   │   ├── users/
│   │   ├── missions/
│   │   └── admin/
│   ├── schemas/
│   │   ├── auth/
│   │   ├── home/
│   │   ├── scenes/
│   │   ├── sessions/
│   │   └── users/
│   ├── types/
│   └── utils/
└── docs/
```

### Required file split per module

Nếu module có endpoint thật, ưu tiên đủ các file sau:

- `<module>.routes.ts`
- `<module>.controller.ts`
- `<module>.service.ts`
- `<module>.repository.ts` nếu có DB access đáng kể

### Important boundaries

- `routes` chỉ đăng ký endpoint + middleware
- `controller` chỉ lấy input, gọi service, trả `ok()` / `fail()`
- `service` chứa business logic
- `repository` chứa Prisma query
- `schema` chứa Zod validation

Không viết Prisma query trong controller.

---

## 4. Canonical Module Reference: Auth

Khi cần quyết định “viết như thế nào”, hãy nhìn `auth`.

### `auth.routes.ts`

Là mẫu cho:
- route comment `@route`, `@desc`
- thứ tự middleware
- naming endpoint

### `auth.controller.ts`

Là mẫu cho:
- comment kiểu `HTTP Handler - ...`
- `try/catch -> next(error)`
- dùng `ok()` / `fail()`
- lấy validated input từ middleware

### `auth.service.ts`

Là mẫu cho:
- comment kiểu `Function Objective - ...`
- service thuần business logic
- throw error object có `code` và `status`
- helper private nằm cuối file

### `auth.repository.ts`

Là mẫu cho:
- repository tách riêng DB access
- function name rõ theo hành động query

---

## 5. Comment Style: Auth Is The Template

Module `auth` là mẫu comment chính thức.

### 5.1 Service function

```ts
/**
 * Function Objective - register
 * Summary: Đăng ký người dùng và cấp bộ đôi token.
 * Inputs: Dữ liệu đã qua validation từ schema auth.
 * Behavior: Kiểm tra duplicate -> hash password -> tạo user -> tạo auth response.
 * Returns: Access token, refresh token, user safe payload.
 */
```

### 5.2 Controller / handler

```ts
/**
 * HTTP Handler - register
 * Summary: Đăng ký người dùng và trả về bộ đôi token.
 * Inputs: req, res, next.
 * Behavior: Lấy validatedBody -> gọi service -> trả 201 response.
 */
```

### 5.3 Repository file

```ts
/**
 * Repository - Auth
 * Summary: Quản lý truy cập dữ liệu cho User và RefreshToken.
 */
```

### 5.4 Route block

```ts
/**
 * @route   POST /api/auth/register
 * @desc    Đăng ký và lấy AccessToken + RefreshToken
 */
```

### 5.5 Rules for comment quality

Comment nên:
- mô tả intent
- mô tả business rule
- mô tả flow nếu flow không quá hiển nhiên

Comment không nên:
- giải thích từng dòng code đơn giản
- lặp lại y nguyên tên hàm mà không thêm ý nghĩa
- dài quá 4-5 dòng nếu không thực sự cần

### 5.6 Mandatory rule

Nếu tạo module backend mới, comment phải bám cùng format với `auth`.

Nếu cần chi tiết hơn, xem:
- `scenio_be/docs/CODE_COMMENT_STYLE.md`

---

## 6. TypeScript Rules

### 6.1 Use `.ts`, not `.js`

Tất cả backend code mới phải là TypeScript.

Sai:

```js
auth.service.js
```

Đúng:

```ts
auth.service.ts
```

### 6.2 Validation flow

Mọi input từ client đi qua Zod schema trước.

Pattern chuẩn:

1. Tạo schema ở `src/schemas/<module>/`
2. Gắn `validate(schema)` ở route
3. Controller lấy `(req as any).validatedBody`, `(req as any).validatedQuery`, `(req as any).validatedParams`

> Ghi chú quan trọng: repo hiện đang dùng pattern `(req as any)` ở controller để tránh vướng `ts-node` và Express augmentation trong dev runtime. Nếu chưa refactor toàn bộ repo, hãy tiếp tục theo pattern hiện tại cho nhất quán.

### 6.3 Service must not know Express

Service không nhận `req`, `res`, `next`.

Sai:

```ts
export async function login(req: Request, res: Response) {}
```

Đúng:

```ts
export async function login(input: LoginInput) {}
```

### 6.4 Repository should stay Prisma-focused

Repository chỉ nên làm:
- `find...`
- `create...`
- `update...`
- `delete...`
- `count...`

Repository không nên chứa business workflow dài.

---

## 7. Response Format: Must Match Current Helper

Tất cả endpoint phải dùng `src/utils/response.ts`.

### Success

```json
{
  "success": true,
  "status": 200,
  "timestamp": "2026-04-05T09:00:00.000Z",
  "data": {}
}
```

### Error

```json
{
  "success": false,
  "status": 400,
  "timestamp": "2026-04-05T09:00:00.000Z",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "..."
  }
}
```

### Non-negotiable rules

- Không trả `res.json(...)` trực tiếp cho endpoint business
- Không tự nghĩ ra response shape khác
- Luôn dùng `ok()` hoặc `fail()`

---

## 8. Error Handling Rules

### In service

Throw error có `code` và `status`.

Ví dụ:

```ts
throw Object.assign(new Error('User không tồn tại'), {
  code: 'NOT_FOUND',
  status: 404,
});
```

### In controller

Pattern chuẩn:

```ts
try {
  ...
} catch (error) {
  next(error);
}
```

### In middleware

Auth/validate middleware có thể trả `fail()` sớm nếu request sai/hết token.

---

## 9. Database and Prisma Rules

### 9.1 Schema

`prisma/schema.prisma` là nguồn sự thật duy nhất cho DB.

Khi đụng vào data model:

1. sửa `schema.prisma`
2. tạo migration
3. chạy `prisma generate`
4. cập nhật seed nếu cần

### 9.2 Current schema naming

Repo hiện dùng:
- `User`
- `RefreshToken`
- `Scene`
- `SceneVocabulary`
- `Session`
- `Message`
- `DailyMission`
- `UserMission`
- `Badge`
- `UserBadge`
- `UserVocabulary`

Không tự đổi sang naming khác nếu không có refactor toàn repo.

### 9.3 Seed rules

Nếu thêm field quan trọng hoặc feature cần test, phải kiểm tra:
- `prisma/seeds/users.seed.ts`
- `prisma/seeds/scenes.seed.ts`
- `prisma/seeds/activity.seed.ts`
- `prisma/seeds/index.ts`

Mục tiêu là `npm run db:seed` luôn tạo được data test dùng được ngay.

---

## 10. Feature Workflow You Must Follow

Khi user yêu cầu code backend, đi theo flow này:

1. Đọc `BACKEND_SKILL.md`
2. Đọc module tương tự, ưu tiên `auth`
3. Kiểm tra `API_ENDPOINT.md`
4. Nếu cần DB, cập nhật `schema.prisma` + migration + seed
5. Tạo hoặc cập nhật Zod schema
6. Viết repository
7. Viết service
8. Viết controller
9. Viết route
10. Register route vào `app.ts` nếu là module mới
11. Sync docs + Postman
12. Build / migrate / seed / smoke test

### Simple rule

Không code “nhảy cóc” controller hoặc route trước khi hiểu schema, service, và convention hiện tại.

---

## 11. When You Add or Change an Endpoint

Đây là rule mới bắt buộc.

Nếu thêm hoặc sửa endpoint backend, phải sync các chỗ sau:

1. Code backend
2. `scenio_be/docs/API_ENDPOINT.md`
3. Postman collection hiện có
4. Seed nếu endpoint cần data test mới

Nếu chỉ sửa code mà không sync docs/Postman, coi như task chưa hoàn tất.

---

## 12. Verification Checklist Before You Say "Done"

Tối thiểu phải kiểm tra các mục phù hợp:

- `npm run build`
- `npx prisma validate`
- `npx prisma migrate dev` nếu có schema change
- `npm run db:seed` nếu có seed change
- route đã được register vào `app.ts`
- docs đã sync
- Postman đã sync nếu endpoint thay đổi

Nếu không chạy được test nào đó, phải nói rõ lý do.

---

## 13. Good vs Bad Examples

### Good

- Comment giống `auth`
- Service thuần business
- Repository thuần query
- Response qua `ok()` / `fail()`
- Schema + seed + docs + Postman cùng cập nhật

### Bad

- Viết Prisma trong controller
- Bỏ qua Zod validation
- Trả response raw bằng `res.json`
- Thêm endpoint nhưng quên Postman
- Viết comment theo style khác hẳn `auth`
- Đổi naming lung tung giữa các module

---

## 14. What To Do When Unsure

Nếu phân vân về style hoặc cấu trúc:

1. Ưu tiên nhìn `auth`
2. Sau đó nhìn module cùng layer đã có gần nhất
3. Nếu vẫn chưa rõ, giữ cách đơn giản và nhất quán với repo hiện tại

> Trong Scenio backend, “consistent with auth” quan trọng hơn “clever”.

