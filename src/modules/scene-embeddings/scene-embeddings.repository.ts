import { AiProvider, Level, Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { SemanticSceneMatch } from './scene-embeddings.types';

const sceneEmbeddingSceneSelect = {
  id: true,
  title: true,
  category: true,
  description: true,
  missionText: true,
  difficulty: true,
  estimatedMinutes: true,
  characterName: true,
  characterRole: true,
  systemPrompt: true,
  isActive: true,
  vocabulary: {
    select: {
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

function vectorLiteral(values: number[]) {
  return `[${values.map((value) => Number.isFinite(value) ? value : 0).join(',')}]`;
}

/**
 * Repository - Scene Embeddings
 * Summary: Lưu embedding metadata bằng Prisma và thao tác cột pgvector bằng raw SQL.
 */

export async function findSceneForEmbedding(sceneId: string) {
  return prisma.scene.findUnique({
    where: { id: sceneId },
    select: sceneEmbeddingSceneSelect,
  });
}

export async function findActiveScenesForEmbedding() {
  return prisma.scene.findMany({
    where: { isActive: true },
    orderBy: [{ difficulty: 'asc' }, { title: 'asc' }],
    select: sceneEmbeddingSceneSelect,
  });
}

export async function findSceneEmbeddingMetadata(sceneId: string) {
  return prisma.sceneEmbedding.findUnique({
    where: { sceneId },
    select: {
      id: true,
      sceneId: true,
      embeddingHash: true,
      outputDimension: true,
      provider: true,
      modelId: true,
      metadata: true,
    },
  });
}

export async function upsertSceneEmbeddingMetadata(input: {
  sceneId: string;
  provider: AiProvider;
  modelId: string;
  outputDimension: number;
  embeddingText: string;
  embeddingHash: string;
  metadata: Prisma.InputJsonValue;
}) {
  return prisma.sceneEmbedding.upsert({
    where: { sceneId: input.sceneId },
    update: {
      provider: input.provider,
      modelId: input.modelId,
      outputDimension: input.outputDimension,
      embeddingText: input.embeddingText,
      embeddingHash: input.embeddingHash,
      metadata: input.metadata,
    },
    create: {
      sceneId: input.sceneId,
      provider: input.provider,
      modelId: input.modelId,
      outputDimension: input.outputDimension,
      embeddingText: input.embeddingText,
      embeddingHash: input.embeddingHash,
      metadata: input.metadata,
    },
    select: { id: true, sceneId: true },
  });
}

export async function deleteSceneEmbedding(sceneId: string) {
  return prisma.sceneEmbedding.deleteMany({
    where: { sceneId },
  });
}

export async function countSceneEmbeddings() {
  return prisma.sceneEmbedding.count();
}

export async function hasPgvectorColumn() {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'scene_embeddings'
        AND column_name = 'embedding'
    ) AS "exists"
  `;

  return rows[0]?.exists === true;
}

export async function updateSceneEmbeddingVector(id: string, values: number[]) {
  if (values.length !== 1536) return false;
  if (!await hasPgvectorColumn()) return false;

  await prisma.$executeRaw`
    UPDATE "scene_embeddings"
    SET "embedding" = ${vectorLiteral(values)}::vector
    WHERE "id" = ${id}
  `;

  return true;
}

export async function searchSimilarSceneEmbeddings(input: {
  values: number[];
  allowedLevels: Level[];
  limit: number;
  excludeSceneIds?: string[];
}): Promise<SemanticSceneMatch[]> {
  if (input.values.length !== 1536) return [];
  if (!await hasPgvectorColumn()) return [];

  const allowedLevels = Prisma.join(input.allowedLevels.map((level) => Prisma.sql`${level}::"Level"`));
  const excluded = input.excludeSceneIds && input.excludeSceneIds.length > 0
    ? Prisma.sql`AND s."id" NOT IN (${Prisma.join(input.excludeSceneIds)})`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<SemanticSceneMatch[]>`
    SELECT
      s."id",
      s."title",
      s."category",
      s."description",
      s."difficulty",
      s."estimatedMinutes",
      s."characterName",
      s."characterRole",
      1 - (se."embedding" <=> ${vectorLiteral(input.values)}::vector) AS "similarity"
    FROM "scene_embeddings" se
    JOIN "scenes" s ON s."id" = se."sceneId"
    WHERE s."isActive" = true
      AND s."difficulty" IN (${allowedLevels})
      AND se."embedding" IS NOT NULL
      ${excluded}
    ORDER BY se."embedding" <=> ${vectorLiteral(input.values)}::vector
    LIMIT ${input.limit}
  `;

  return rows.map((row) => ({
    ...row,
    similarity: Number(row.similarity),
  }));
}

export async function findSemanticSearchCandidates(input: {
  allowedLevels: Level[];
  limit: number;
  excludeSceneIds?: string[];
}) {
  return prisma.sceneEmbedding.findMany({
    where: {
      scene: {
        isActive: true,
        difficulty: {
          in: input.allowedLevels,
        },
        ...(input.excludeSceneIds && input.excludeSceneIds.length > 0
          ? {
              id: {
                notIn: input.excludeSceneIds,
              },
            }
          : {}),
      },
    },
    take: input.limit,
    include: {
      scene: {
        select: {
          id: true,
          title: true,
          category: true,
          description: true,
          missionText: true,
          difficulty: true,
          estimatedMinutes: true,
          characterName: true,
          characterRole: true,
        },
      },
    },
  });
}
