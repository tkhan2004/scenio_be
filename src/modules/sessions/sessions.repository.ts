import { Level, MessageRole, Prisma, SessionStatus } from '@prisma/client';
import prisma from '../../config/database';

type DbClient = Prisma.TransactionClient | typeof prisma;

const sessionResultSelect = {
  id: true,
  status: true,
  grammarScore: true,
  vocabularyScore: true,
  naturalnessScore: true,
  xpEarned: true,
  hintCount: true,
  startedAt: true,
  endedAt: true,
  scene: {
    select: {
      id: true,
      title: true,
      category: true,
      difficulty: true,
      description: true,
      characterName: true,
      characterRole: true,
    },
  },
  messages: {
    orderBy: [
      { turnIndex: 'asc' },
      { createdAt: 'asc' },
    ],
    select: {
      id: true,
      role: true,
      content: true,
      turnIndex: true,
      hasError: true,
      errorType: true,
      originalPhrase: true,
      suggestion: true,
      explanation: true,
      isGood: true,
      isHint: true,
      createdAt: true,
    },
  },
} satisfies Prisma.SessionSelect;

export type SessionResultRecord = Prisma.SessionGetPayload<{ select: typeof sessionResultSelect }>;

/**
 * Repository - Sessions
 * Summary: Quản lý truy vấn dữ liệu cho level test, start session, result, và abandon flow.
 */

/**
 * Query Objective - findUserById
 * Summary: Lấy thông tin user cần thiết để kiểm tra level test hoặc quyền sở hữu session.
 * Query Shape: findUnique + select các field tối thiểu.
 */
export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      displayName: true,
      level: true,
      needsLevelTest: true,
    },
  });
}

/**
 * Query Objective - findSceneForSessionStart
 * Summary: Lấy scene active cần thiết để tạo session mới và dựng opening message template.
 * Query Shape: findFirst theo id + isActive.
 */
export async function findSceneForSessionStart(sceneId: string) {
  return prisma.scene.findFirst({
    where: {
      id: sceneId,
      isActive: true,
    },
    select: {
      id: true,
      title: true,
      category: true,
      description: true,
      missionText: true,
      difficulty: true,
      characterName: true,
      characterRole: true,
    },
  });
}

/**
 * Query Objective - findActiveUserSession
 * Summary: Lấy session ACTIVE gần nhất của user để tránh mở nhiều phiên song song.
 * Query Shape: findFirst theo userId + status ACTIVE.
 */
export async function findActiveUserSession(userId: string) {
  return prisma.session.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
    },
    orderBy: {
      startedAt: 'desc',
    },
    select: {
      id: true,
      sceneId: true,
      startedAt: true,
      scene: {
        select: {
          title: true,
          characterName: true,
        },
      },
    },
  });
}

/**
 * Query Objective - createSession
 * Summary: Tạo bản ghi session mới cho user.
 * Query Shape: create với userId + sceneId + status ACTIVE mặc định.
 */
export async function createSession(
  data: {
    userId: string;
    sceneId: string;
    status?: SessionStatus;
  },
  db: DbClient = prisma,
) {
  return db.session.create({
    data: {
      userId: data.userId,
      sceneId: data.sceneId,
      status: data.status ?? 'ACTIVE',
    },
    select: {
      id: true,
    },
  });
}

/**
 * Query Objective - createMessage
 * Summary: Lưu message thuộc về session, dùng cho opening message hoặc transcript.
 * Query Shape: create một bản ghi message.
 */
export async function createMessage(
  data: {
    sessionId: string;
    role: MessageRole;
    content: string;
    turnIndex: number;
    isHint?: boolean;
  },
  db: DbClient = prisma,
) {
  return db.message.create({
    data: {
      sessionId: data.sessionId,
      role: data.role,
      content: data.content,
      turnIndex: data.turnIndex,
      isHint: data.isHint ?? false,
    },
    select: {
      id: true,
    },
  });
}

/**
 * Query Objective - findOwnedSessionById
 * Summary: Lấy session của chính user kèm transcript chi tiết cho màn hình result.
 * Query Shape: findFirst theo userId + sessionId + include scene/messages select.
 */
export async function findOwnedSessionById(userId: string, sessionId: string) {
  return prisma.session.findFirst({
    where: {
      id: sessionId,
      userId,
    },
    select: sessionResultSelect,
  });
}

/**
 * Query Objective - findOwnedSessionStatus
 * Summary: Lấy trạng thái hiện tại của một session thuộc user.
 * Query Shape: findFirst theo userId + sessionId + select status tối thiểu.
 */
export async function findOwnedSessionStatus(userId: string, sessionId: string) {
  return prisma.session.findFirst({
    where: {
      id: sessionId,
      userId,
    },
    select: {
      id: true,
      status: true,
      endedAt: true,
    },
  });
}

/**
 * Query Objective - updateSessionById
 * Summary: Cập nhật trạng thái hoặc metadata cho session theo id.
 * Query Shape: update theo sessionId với Prisma.SessionUpdateInput.
 */
export async function updateSessionById(
  sessionId: string,
  data: Prisma.SessionUpdateInput,
  db: DbClient = prisma,
) {
  return db.session.update({
    where: { id: sessionId },
    data,
    select: {
      id: true,
      status: true,
      endedAt: true,
    },
  });
}

/**
 * Query Objective - completeLevelTest
 * Summary: Cập nhật level và đánh dấu user đã hoàn thành level test.
 * Query Shape: update theo userId, set level + needsLevelTest + levelTestedAt.
 */
export async function completeLevelTest(userId: string, level: Level) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      level,
      needsLevelTest: false,
      levelTestedAt: new Date(),
    },
    select: {
      level: true,
      needsLevelTest: true,
      levelTestedAt: true,
    },
  });
}
