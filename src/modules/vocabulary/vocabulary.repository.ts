import { Prisma } from '@prisma/client';
import prisma from '../../config/database';

type DbClient = Prisma.TransactionClient | typeof prisma;

const userVocabularySelect = {
  id: true,
  word: true,
  definition: true,
  sourceSessionId: true,
  isMastered: true,
  savedAt: true,
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
} satisfies Prisma.UserVocabularySelect;

export type UserVocabularyRecord = Prisma.UserVocabularyGetPayload<{ select: typeof userVocabularySelect }>;

/**
 * Repository - Vocabulary
 * Summary: Quản lý truy vấn dữ liệu cho user vocabulary list và thao tác save/delete từ vựng.
 */

/**
 * Query Objective - countUserVocabulary
 * Summary: Đếm số từ đã lưu của user, hỗ trợ phân trang và gamification.
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
 * Summary: Lấy danh sách từ vựng đã lưu của user với phân trang.
 * Query Shape: findMany theo userId + optional isMastered + include sceneVocabulary/scene.
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
 * Summary: Lấy scene vocabulary để auto-save từ scene sang user vocabulary.
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
 * Query Objective - findDuplicateUserVocabularyBySceneVocabularyId
 * Summary: Kiểm tra user đã lưu cùng một scene vocabulary hay chưa.
 * Query Shape: findFirst theo userId + sceneVocabularyId.
 */
export async function findDuplicateUserVocabularyBySceneVocabularyId(
  userId: string,
  sceneVocabularyId: string,
  db: DbClient = prisma,
) {
  return db.userVocabulary.findFirst({
    where: {
      userId,
      sceneVocabularyId,
    },
    select: {
      id: true,
    },
  });
}

/**
 * Query Objective - findDuplicateUserVocabularyByWord
 * Summary: Kiểm tra trùng word giữa manual save và scene-based save, không phân biệt hoa thường.
 * Query Shape: findFirst theo userId + OR word/manual hoặc sceneVocabulary.word.
 */
export async function findDuplicateUserVocabularyByWord(
  userId: string,
  word: string,
  db: DbClient = prisma,
) {
  return db.userVocabulary.findFirst({
    where: {
      userId,
      OR: [
        {
          word: {
            equals: word,
            mode: 'insensitive',
          },
        },
        {
          sceneVocabulary: {
            is: {
              word: {
                equals: word,
                mode: 'insensitive',
              },
            },
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });
}

/**
 * Query Objective - findOwnedSourceSession
 * Summary: Kiểm tra sourceSessionId có thuộc về user hay không trước khi gắn context.
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
    },
  });
}

/**
 * Query Objective - createUserVocabulary
 * Summary: Tạo bản ghi từ vựng mới cho user.
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
 * Query Objective - findUserVocabularyById
 * Summary: Lấy một từ vựng cụ thể thuộc quyền sở hữu của user.
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
 * Summary: Xóa một từ vựng đã lưu khỏi danh sách học của user.
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
