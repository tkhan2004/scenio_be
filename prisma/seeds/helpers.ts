import {
  Prisma,
  RefreshToken,
  Session,
  SessionStatus,
  User,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../../src/config/database';
import { signRefreshToken } from '../../src/utils/jwt';

export const TEST_PASSWORD = '123456';

export type SeedEntityMap<T> = Record<string, T>;

export function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function dateTime(value: string) {
  return new Date(value);
}

export function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export async function hashTestPassword() {
  return bcrypt.hash(TEST_PASSWORD, 10);
}

export async function replaceRefreshTokenForUser(user: Pick<User, 'id' | 'email' | 'isAdmin'>) {
  await prisma.refreshToken.deleteMany({
    where: { userId: user.id },
  });

  const token = signRefreshToken({
    id: user.id,
    email: user.email,
    isAdmin: user.isAdmin,
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  return prisma.refreshToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt,
    },
  });
}

export async function upsertSeedSession(args: {
  userId: string;
  sceneId: string;
  startedAt: Date;
  status: SessionStatus;
  grammarScore?: number | null;
  vocabularyScore?: number | null;
  naturalnessScore?: number | null;
  xpEarned?: number;
  xpGrantedAt?: Date | null;
  hintCount?: number;
  endedAt?: Date | null;
}) {
  const existing = await prisma.session.findFirst({
    where: {
      userId: args.userId,
      sceneId: args.sceneId,
      startedAt: args.startedAt,
    },
    select: { id: true },
  });

  const data = {
    userId: args.userId,
    sceneId: args.sceneId,
    startedAt: args.startedAt,
    status: args.status,
    grammarScore: args.grammarScore ?? null,
    vocabularyScore: args.vocabularyScore ?? null,
    naturalnessScore: args.naturalnessScore ?? null,
    xpEarned: args.xpEarned ?? 0,
    xpGrantedAt: args.xpGrantedAt ?? null,
    hintCount: args.hintCount ?? 0,
    endedAt: args.endedAt ?? null,
  };

  if (existing) {
    return prisma.session.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.session.create({ data });
}

export async function resetSessionMessages(
  session: Pick<Session, 'id'>,
  messages: Omit<Prisma.MessageCreateManyInput, 'sessionId'>[],
) {
  await prisma.message.deleteMany({
    where: { sessionId: session.id },
  });

  if (messages.length === 0) {
    return;
  }

  await prisma.message.createMany({
    data: messages.map((message) => ({
      ...message,
      sessionId: session.id,
    })),
  });
}

export { prisma };
