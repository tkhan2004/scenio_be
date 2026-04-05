import { Level, RefreshToken, User } from '@prisma/client';
import {
  SeedEntityMap,
  dateOnly,
  hashTestPassword,
  replaceRefreshTokenForUser,
  prisma,
} from './helpers';

type SeedUsersResult = {
  users: SeedEntityMap<User>;
  refreshTokens: SeedEntityMap<RefreshToken>;
};

export async function seedUsers(): Promise<SeedUsersResult> {
  const passwordHash = await hashTestPassword();

  const definitions = [
    {
      key: 'admin',
      email: 'admin@scenio.dev',
      displayName: 'Scenio Admin',
      level: Level.B2,
      totalXp: 1240,
      streakDays: 14,
      lastActiveDate: dateOnly('2026-04-04'),
      isAdmin: true,
    },
    {
      key: 'learner',
      email: 'learner@scenio.dev',
      displayName: 'Scenio Learner',
      level: Level.A2,
      totalXp: 320,
      streakDays: 7,
      lastActiveDate: dateOnly('2026-04-04'),
      isAdmin: false,
    },
    {
      key: 'beginner',
      email: 'beginner@scenio.dev',
      displayName: 'Scenio Beginner',
      level: Level.A1,
      totalXp: 90,
      streakDays: 2,
      lastActiveDate: dateOnly('2026-04-03'),
      isAdmin: false,
    },
  ] as const;

  const users: SeedEntityMap<User> = {};

  for (const definition of definitions) {
    const existing = await prisma.user.findUnique({
      where: { email: definition.email },
      select: { id: true },
    });

    const data = {
      email: definition.email,
      password: passwordHash,
      googleId: null,
      displayName: definition.displayName,
      avatarUrl: null,
      level: definition.level,
      totalXp: definition.totalXp,
      streakDays: definition.streakDays,
      lastActiveDate: definition.lastActiveDate,
      isAdmin: definition.isAdmin,
    };

    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.user.create({ data });

    users[definition.key] = user;
  }

  const refreshTokens: SeedEntityMap<RefreshToken> = {};

  for (const [key, user] of Object.entries(users)) {
    refreshTokens[key] = await replaceRefreshTokenForUser(user);
  }

  return { users, refreshTokens };
}
