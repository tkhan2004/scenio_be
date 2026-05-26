# Prisma Seeds

Seed data for local development and API testing.

## Run

```bash
npm run db:seed
```

## Structure

- `users.seed.ts`: test users and refresh tokens
- `scenes.seed.ts`: scenes and scene vocabulary
- `missions.seed.ts`: daily missions
- `badges.seed.ts`: achievement badges
- `activity.seed.ts`: user missions, sessions, messages, user badges, user vocabulary
- `index.ts`: orchestrates all seed files

## Sample accounts

- `admin@scenio.dev / 123456`
- `learner@scenio.dev / 123456`
- `beginner@scenio.dev / 123456`
- `xp-tester@scenio.dev / 123456`

## Coverage notes

Current seed now includes:

- `ACTIVE`, `COMPLETED`, and `ABANDONED` sessions
- completed sessions that already have `xpGrantedAt`
- one dedicated completed session without `xpGrantedAt` for testing `POST /users/xp`
- scene-based vocabulary and manual vocabulary entries

The seed is designed to be idempotent for repeated local testing.
