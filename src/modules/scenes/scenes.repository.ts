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

export type SceneCardRecord = Prisma.SceneGetPayload<{ select: typeof sceneCardSelect }>;
export type SearchSceneRecord = Prisma.SceneGetPayload<{ select: typeof searchSceneSelect }>;

export async function countScenes(where: Prisma.SceneWhereInput) {
  return await prisma.scene.count({ where });
}

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

export async function findUserLevel(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: { level: true },
  });
}

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
