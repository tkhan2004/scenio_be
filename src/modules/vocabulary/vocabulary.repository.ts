import { Prisma } from '@prisma/client';
import prisma from '../../config/database';

type DbClient = Prisma.TransactionClient | typeof prisma;

const occurrencePreviewSelect = {
  id: true,
  sessionId: true,
  sampleSentence: true,
  sourceMessageId: true,
  createdAt: true,
  session: {
    select: {
      id: true,
      status: true,
      sourceType: true,
      customPracticeConfig: {
        select: {
          id: true,
          displayTitle: true,
          contextType: true,
          difficulty: true,
          aiDisplayName: true,
          aiRole: true,
        },
      },
      scene: {
        select: {
          id: true,
          title: true,
          category: true,
          difficulty: true,
        },
      },
    },
  },
} satisfies Prisma.UserVocabularyOccurrenceSelect;

const userVocabularySelect = {
  id: true,
  normalizedWord: true,
  word: true,
  definition: true,
  sourceSessionId: true,
  encounterCount: true,
  srsLevel: true,
  nextReviewAt: true,
  isMastered: true,
  savedAt: true,
  lastSeenAt: true,
  reviewedAt: true,
  sceneVocabulary: {
    select: {
      id: true,
      word: true,
      definition: true,
      example: true,
      scene: {
        select: {
          id: true,
          title: true,
          category: true,
          difficulty: true,
        },
      },
    },
  },
  occurrences: {
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
    take: 1,
    select: occurrencePreviewSelect,
  },
} satisfies Prisma.UserVocabularySelect;

const deckOccurrenceSelect = {
  id: true,
  sessionId: true,
  sampleSentence: true,
  sourceMessageId: true,
  createdAt: true,
  session: {
    select: {
      id: true,
      status: true,
      startedAt: true,
      endedAt: true,
      sourceType: true,
      customPracticeConfig: {
        select: {
          id: true,
          displayTitle: true,
          contextType: true,
          difficulty: true,
          aiDisplayName: true,
          aiRole: true,
        },
      },
      scene: {
        select: {
          id: true,
          title: true,
          category: true,
          difficulty: true,
          characterName: true,
          characterRole: true,
        },
      },
    },
  },
  userVocabulary: {
    select: {
      id: true,
      normalizedWord: true,
      word: true,
      definition: true,
      sourceSessionId: true,
      encounterCount: true,
      srsLevel: true,
      nextReviewAt: true,
      isMastered: true,
      savedAt: true,
      lastSeenAt: true,
      reviewedAt: true,
      sceneVocabulary: {
        select: {
          id: true,
          example: true,
          scene: {
            select: {
              id: true,
              title: true,
              category: true,
              difficulty: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.UserVocabularyOccurrenceSelect;

export type UserVocabularyRecord = Prisma.UserVocabularyGetPayload<{ select: typeof userVocabularySelect }>;
export type VocabularyDeckOccurrenceRecord = Prisma.UserVocabularyOccurrenceGetPayload<{ select: typeof deckOccurrenceSelect }>;
export type VocabularyOccurrencePreviewRecord = Prisma.UserVocabularyOccurrenceGetPayload<{ select: typeof occurrencePreviewSelect }>;

/**
 * Repository - Vocabulary
 * Summary: Quản lý dictionary tổng hợp của user, các occurrence theo session, deck queries, và review state.
 */

/**
 * Query Objective - countUserVocabulary
 * Summary: Đếm số từ trong dictionary tổng hợp của user.
 * Query Shape: count theo userId + optional isMastered.
 */
export async function countUserVocabulary(
  userId: string,
  isMastered?: boolean,
  db: DbClient = prisma,
) {
  return db.userVocabulary.count({
    where: {
      userId,
      isMastered,
    },
  });
}

/**
 * Query Objective - findUserVocabulary
 * Summary: Lấy dictionary tổng hợp của user với phân trang.
 * Query Shape: findMany theo userId + optional isMastered + latest occurrence preview.
 */
export async function findUserVocabulary(args: {
  userId: string;
  skip: number;
  take: number;
  isMastered?: boolean;
}, db: DbClient = prisma) {
  return db.userVocabulary.findMany({
    where: {
      userId: args.userId,
      isMastered: args.isMastered,
    },
    orderBy: [
      { lastSeenAt: 'desc' },
      { savedAt: 'desc' },
      { id: 'asc' },
    ],
    skip: args.skip,
    take: args.take,
    select: userVocabularySelect,
  });
}

/**
 * Query Objective - findSceneVocabularyById
 * Summary: Lấy scene vocabulary để auto-save vào dictionary user.
 * Query Shape: findUnique theo sceneVocabularyId + include scene summary.
 */
export async function findSceneVocabularyById(id: string, db: DbClient = prisma) {
  return db.sceneVocabulary.findUnique({
    where: { id },
    select: {
      id: true,
      word: true,
      definition: true,
      example: true,
      scene: {
        select: {
          id: true,
          title: true,
          category: true,
          difficulty: true,
        },
      },
    },
  });
}

/**
 * Query Objective - findUserVocabularyByNormalizedWord
 * Summary: Tìm dictionary entry của user theo normalizedWord.
 * Query Shape: findFirst theo userId + normalizedWord.
 */
export async function findUserVocabularyByNormalizedWord(
  userId: string,
  normalizedWord: string,
  db: DbClient = prisma,
) {
  return db.userVocabulary.findFirst({
    where: {
      userId,
      normalizedWord,
    },
    select: userVocabularySelect,
  });
}

/**
 * Query Objective - findOwnedSourceSession
 * Summary: Kiểm tra sourceSessionId có thuộc về user trước khi gắn occurrence.
 * Query Shape: findFirst theo userId + sessionId.
 */
export async function findOwnedSourceSession(
  userId: string,
  sessionId: string,
  db: DbClient = prisma,
) {
  return db.session.findFirst({
    where: {
      id: sessionId,
      userId,
    },
    select: {
      id: true,
      status: true,
      startedAt: true,
      endedAt: true,
      sourceType: true,
      customPracticeConfig: {
        select: {
          id: true,
          displayTitle: true,
          contextType: true,
          difficulty: true,
          aiDisplayName: true,
          aiRole: true,
        },
      },
      scene: {
        select: {
          id: true,
          title: true,
          category: true,
          difficulty: true,
          characterName: true,
          characterRole: true,
        },
      },
    },
  });
}

/**
 * Query Objective - createUserVocabulary
 * Summary: Tạo dictionary entry mới cho user.
 * Query Shape: create vào user_vocabulary.
 */
export async function createUserVocabulary(
  data: Prisma.UserVocabularyCreateInput,
  db: DbClient = prisma,
) {
  return db.userVocabulary.create({
    data,
    select: userVocabularySelect,
  });
}

/**
 * Query Objective - updateUserVocabularyById
 * Summary: Cập nhật dictionary entry của user.
 * Query Shape: update theo userVocabularyId.
 */
export async function updateUserVocabularyById(
  id: string,
  data: Prisma.UserVocabularyUpdateInput,
  db: DbClient = prisma,
) {
  return db.userVocabulary.update({
    where: { id },
    data,
    select: userVocabularySelect,
  });
}

/**
 * Query Objective - findVocabularyOccurrenceBySession
 * Summary: Kiểm tra dictionary word đã có occurrence trong session hiện tại hay chưa.
 * Query Shape: findFirst theo userVocabularyId + sessionId.
 */
export async function findVocabularyOccurrenceBySession(
  userVocabularyId: string,
  sessionId: string,
  db: DbClient = prisma,
) {
  return db.userVocabularyOccurrence.findFirst({
    where: {
      userVocabularyId,
      sessionId,
    },
    select: occurrencePreviewSelect,
  });
}

/**
 * Query Objective - createVocabularyOccurrence
 * Summary: Tạo một lần gặp lại từ vựng theo session.
 * Query Shape: create vào user_vocabulary_occurrences.
 */
export async function createVocabularyOccurrence(
  data: Prisma.UserVocabularyOccurrenceCreateInput,
  db: DbClient = prisma,
) {
  return db.userVocabularyOccurrence.create({
    data,
    select: occurrencePreviewSelect,
  });
}

/**
 * Query Objective - updateVocabularyOccurrenceById
 * Summary: Cập nhật occurrence hiện có khi cần bổ sung sampleSentence/sourceMessageId.
 * Query Shape: update theo occurrence id.
 */
export async function updateVocabularyOccurrenceById(
  id: string,
  data: Prisma.UserVocabularyOccurrenceUpdateInput,
  db: DbClient = prisma,
) {
  return db.userVocabularyOccurrence.update({
    where: { id },
    data,
    select: occurrencePreviewSelect,
  });
}

/**
 * Query Objective - findVocabularyDeckOccurrences
 * Summary: Lấy toàn bộ occurrence có session để group thành deck theo context.
 * Query Shape: findMany theo userId + sessionId not null.
 */
export async function findVocabularyDeckOccurrences(userId: string, db: DbClient = prisma) {
  return db.userVocabularyOccurrence.findMany({
    where: {
      userId,
      sessionId: {
        not: null,
      },
    },
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
    select: deckOccurrenceSelect,
  });
}

/**
 * Query Objective - findDeckOccurrencesBySession
 * Summary: Lấy toàn bộ words nằm trong một deck session cụ thể của user.
 * Query Shape: findMany theo userId + sessionId.
 */
export async function findDeckOccurrencesBySession(
  userId: string,
  sessionId: string,
  db: DbClient = prisma,
) {
  return db.userVocabularyOccurrence.findMany({
    where: {
      userId,
      sessionId,
    },
    orderBy: [
      { createdAt: 'asc' },
      { id: 'asc' },
    ],
    select: deckOccurrenceSelect,
  });
}

/**
 * Query Objective - findUserVocabularyById
 * Summary: Lấy một dictionary word cụ thể thuộc quyền sở hữu của user.
 * Query Shape: findFirst theo userId + vocabularyId.
 */
export async function findUserVocabularyById(
  userId: string,
  id: string,
  db: DbClient = prisma,
) {
  return db.userVocabulary.findFirst({
    where: {
      id,
      userId,
    },
    select: userVocabularySelect,
  });
}

/**
 * Query Objective - deleteUserVocabularyById
 * Summary: Xóa dictionary word của user. Các occurrence sẽ bị xóa cascade.
 * Query Shape: delete theo userVocabularyId.
 */
export async function deleteUserVocabularyById(id: string, db: DbClient = prisma) {
  return db.userVocabulary.delete({
    where: { id },
    select: {
      id: true,
    },
  });
}
