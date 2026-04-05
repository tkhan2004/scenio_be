import { Level, Prisma, Scene } from '@prisma/client';
import prisma from '../../config/database';

const sceneCardSelect = {
  id: true,
  title: true,
  category: true,
  description: true,
  difficulty: true,
  estimatedMinutes: true,
  characterName: true,
  characterRole: true,
} satisfies Prisma.SceneSelect;

const searchSceneSelect = {
  ...sceneCardSelect,
  missionText: true,
  vocabulary: {
    select: {
      word: true,
      definition: true,
      example: true,
    },
  },
} satisfies Prisma.SceneSelect;

const sceneDetailSelect = {
  ...sceneCardSelect,
  missionText: true,
  vocabulary: {
    select: {
      id: true,
      word: true,
      definition: true,
      example: true,
      sortOrder: true,
    },
    orderBy: {
      sortOrder: 'asc',
    },
  },
} satisfies Prisma.SceneSelect;

export type SceneCardRecord = Prisma.SceneGetPayload<{ select: typeof sceneCardSelect }>;
export type SearchSceneRecord = Prisma.SceneGetPayload<{ select: typeof searchSceneSelect }>;
export type SceneDetailRecord = Prisma.SceneGetPayload<{ select: typeof sceneDetailSelect }>;

/**
 * Repository - Scenes
 * Summary: Quản lý truy vấn dữ liệu cho scene listing và scene search.
 */

/**
 * Query Objective - countScenes
 * Summary: Đếm tổng số scene khớp filter để phục vụ phân trang.
 * Query Shape: count theo SceneWhereInput.
 */
export async function countScenes(where: Prisma.SceneWhereInput) {
  return await prisma.scene.count({ where });
}

/**
 * Query Objective - findScenes
 * Summary: Lấy danh sách scene card theo filter và phân trang.
 * Query Shape: findMany + orderBy difficulty/title + select scene card.
 */
export async function findScenes(args: {
  where: Prisma.SceneWhereInput;
  skip: number;
  take: number;
}) {
  return await prisma.scene.findMany({
    where: args.where,
    skip: args.skip,
    take: args.take,
    orderBy: [
      { difficulty: 'asc' },
      { title: 'asc' },
    ],
    select: sceneCardSelect,
  });
}

/**
 * Query Objective - findUserLevel
 * Summary: Lấy level hiện tại của user để giới hạn search result.
 * Query Shape: findUnique + select level.
 */
export async function findUserLevel(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: { level: true },
  });
}

/**
 * Query Objective - findSearchSceneCandidates
 * Summary: Lấy candidate scenes khớp text search trước khi service ranking.
 * Query Shape: findMany theo OR text match ở scene fields và vocabulary.
 */
export async function findSearchSceneCandidates(query: string, allowedLevels: Level[], take: number) {
  return await prisma.scene.findMany({
    where: {
      isActive: true,
      difficulty: { in: allowedLevels },
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { missionText: { contains: query, mode: 'insensitive' } },
        { characterName: { contains: query, mode: 'insensitive' } },
        { characterRole: { contains: query, mode: 'insensitive' } },
        {
          vocabulary: {
            some: {
              OR: [
                { word: { contains: query, mode: 'insensitive' } },
                { definition: { contains: query, mode: 'insensitive' } },
                { example: { contains: query, mode: 'insensitive' } },
              ],
            },
          },
        },
      ],
    },
    take,
    select: searchSceneSelect,
  });
}

/**
 * Query Objective - findActiveSceneById
 * Summary: Lấy chi tiết đầy đủ của một scene active kèm vocabulary.
 * Query Shape: findFirst theo id + isActive với nested vocabulary orderBy sortOrder.
 */
export async function findActiveSceneById(sceneId: string) {
  return await prisma.scene.findFirst({
    where: {
      id: sceneId,
      isActive: true,
    },
    select: sceneDetailSelect,
  });
}
