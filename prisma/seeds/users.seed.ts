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
      learningGoal: 'WORK',
      studyFrequency: 'INTENSIVE',
      selfAssessment: 'NATURALNESS',
      needsLevelTest: false,
      levelTestedAt: dateOnly('2026-03-15'),
      onboardingCompletedAt: dateOnly('2026-03-15'),
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
      learningGoal: 'TRAVEL',
      studyFrequency: 'REGULAR',
      selfAssessment: 'GRAMMAR',
      needsLevelTest: false,
      levelTestedAt: dateOnly('2026-03-28'),
      onboardingCompletedAt: dateOnly('2026-03-28'),
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
      learningGoal: 'DAILY',
      studyFrequency: 'LIGHT',
      selfAssessment: 'CONFIDENCE',
      needsLevelTest: false,
      levelTestedAt: dateOnly('2026-03-30'),
      onboardingCompletedAt: dateOnly('2026-03-30'),
      totalXp: 90,
      streakDays: 2,
      lastActiveDate: dateOnly('2026-04-03'),
      isAdmin: false,
    },
    {
      key: 'newcomer',
      email: 'newcomer@scenio.dev',
      displayName: 'Scenio Newcomer',
      level: Level.A2,
      learningGoal: null,
      studyFrequency: null,
      selfAssessment: null,
      needsLevelTest: true,
      levelTestedAt: null,
      onboardingCompletedAt: null,
      totalXp: 0,
      streakDays: 0,
      lastActiveDate: null,
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
      learningGoal: definition.learningGoal,
      studyFrequency: definition.studyFrequency,
      selfAssessment: definition.selfAssessment,
      needsLevelTest: definition.needsLevelTest,
      levelTestedAt: definition.levelTestedAt,
      onboardingCompletedAt: definition.onboardingCompletedAt,
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
