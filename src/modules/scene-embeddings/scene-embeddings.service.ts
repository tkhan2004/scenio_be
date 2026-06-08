import crypto from 'crypto';
import { embedText } from '../ai-models/ai-models.service';
import * as sceneEmbeddingsRepo from './scene-embeddings.repository';
import { SceneEmbeddingMetadata, SceneEmbeddingScene } from './scene-embeddings.types';

function hashText(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeLine(value: string | null | undefined) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function truncatePrompt(value: string) {
  const normalized = normalizeLine(value);
  return normalized.length > 900 ? `${normalized.slice(0, 900)}...` : normalized;
}

function hasStoredEmbeddingValues(metadata: unknown, expectedDimension?: number | null) {
  const values = (metadata as SceneEmbeddingMetadata | null | undefined)?.embeddingValues;
  if (!Array.isArray(values) || values.length === 0) return false;
  if (expectedDimension && values.length !== expectedDimension) return false;
  return values.every((value) => typeof value === 'number' && Number.isFinite(value));
}

function cosineSimilarity(left: number[], right: number[]) {
  if (left.length === 0 || left.length !== right.length) return 0;

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  }

  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

/**
 * Function Objective - buildSceneEmbeddingText
 * Summary: Gom toàn bộ nội dung học tập của scene thành document text để sinh embedding.
 */
export function buildSceneEmbeddingText(scene: SceneEmbeddingScene) {
  const vocabularyText = scene.vocabulary
    .map((item) => `- ${item.word}: ${item.definition}. Example: ${item.example}`)
    .join('\n');

  return [
    `Title: ${scene.title}`,
    `Category: ${scene.category}`,
    `Difficulty: ${scene.difficulty}`,
    `Description: ${scene.description}`,
    `Mission: ${scene.missionText}`,
    `Character: ${scene.characterName} (${scene.characterRole})`,
    `Prompt: ${truncatePrompt(scene.systemPrompt)}`,
    `Vocabulary:\n${vocabularyText || 'none'}`,
  ].join('\n');
}

/**
 * Function Objective - upsertSceneEmbedding
 * Summary: Sinh embedding cho một scene và lưu metadata/vector nếu pgvector sẵn sàng.
 */
export async function upsertSceneEmbedding(sceneId: string, options: { force?: boolean } = {}) {
  const scene = await sceneEmbeddingsRepo.findSceneForEmbedding(sceneId);
  if (!scene) {
    throw Object.assign(new Error('Không tìm thấy scene để sinh embedding'), {
      code: 'SCENE_NOT_FOUND',
      status: 404,
    });
  }

  const embeddingText = buildSceneEmbeddingText(scene);
  const embeddingHash = hashText(embeddingText);
  const existing = await sceneEmbeddingsRepo.findSceneEmbeddingMetadata(scene.id);
  if (
    !options.force
    && existing?.embeddingHash === embeddingHash
    && hasStoredEmbeddingValues(existing.metadata, existing.outputDimension)
  ) {
    return {
      sceneId: scene.id,
      skipped: true,
      reason: 'UNCHANGED',
      vectorStored: false,
    };
  }

  const embedding = await embedText({
    text: embeddingText,
    title: scene.title,
    mode: 'DOCUMENT',
  });
  const metadata = {
    provider: embedding.provider,
    modelId: embedding.modelId,
    outputDimension: embedding.outputDimension,
    embeddingDimension: embedding.embeddingDimension,
    fallbackUsed: embedding.fallbackUsed,
    embeddingValues: embedding.values,
  };

  const saved = await sceneEmbeddingsRepo.upsertSceneEmbeddingMetadata({
    sceneId: scene.id,
    provider: embedding.provider,
    modelId: embedding.modelId,
    outputDimension: embedding.outputDimension ?? embedding.embeddingDimension,
    embeddingText,
    embeddingHash,
    metadata,
  });

  let vectorStored = false;
  try {
    vectorStored = await sceneEmbeddingsRepo.updateSceneEmbeddingVector(saved.id, embedding.values);
  } catch (error: any) {
    console.warn(`[scene-embeddings] Failed to store pgvector for scene ${scene.id}: ${error?.message ?? error}`);
  }

  return {
    sceneId: scene.id,
    skipped: false,
    vectorStored,
    metadata,
  };
}

/**
 * Function Objective - upsertSceneEmbeddingBestEffort
 * Summary: Đồng bộ embedding sau admin CRUD nhưng không làm hỏng request chính nếu provider/vector lỗi.
 */
export async function upsertSceneEmbeddingBestEffort(sceneId: string) {
  try {
    return await upsertSceneEmbedding(sceneId);
  } catch (error: any) {
    console.warn(`[scene-embeddings] Best-effort sync failed for scene ${sceneId}: ${error?.message ?? error}`);
    return null;
  }
}

export async function deleteSceneEmbedding(sceneId: string) {
  return sceneEmbeddingsRepo.deleteSceneEmbedding(sceneId);
}

/**
 * Function Objective - backfillSceneEmbeddings
 * Summary: Sinh lại embeddings cho active scenes, dùng cho setup demo hoặc sau khi đổi model.
 */
export async function backfillSceneEmbeddings(options: { force?: boolean } = {}) {
  const scenes = await sceneEmbeddingsRepo.findActiveScenesForEmbedding();
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const scene of scenes) {
    try {
      const result = await upsertSceneEmbedding(scene.id, options);
      if (result.skipped) {
        skipped += 1;
      } else {
        updated += 1;
      }
    } catch (error: any) {
      failed += 1;
      console.warn(`[scene-embeddings] Backfill failed for ${scene.title}: ${error?.message ?? error}`);
    }
  }

  return {
    total: scenes.length,
    updated,
    skipped,
    failed,
  };
}

/**
 * Function Objective - searchSimilarScenes
 * Summary: Embed query và tìm scenes tương tự bằng pgvector, trả [] nếu vector chưa sẵn sàng.
 */
export async function searchSimilarScenes(input: {
  query: string;
  allowedLevels: Parameters<typeof sceneEmbeddingsRepo.searchSimilarSceneEmbeddings>[0]['allowedLevels'];
  limit: number;
  excludeSceneIds?: string[];
}) {
  const embedding = await embedText({
    text: input.query,
    mode: 'QUERY',
  });

  const vectorMatches = await sceneEmbeddingsRepo.searchSimilarSceneEmbeddings({
    values: embedding.values,
    allowedLevels: input.allowedLevels,
    limit: input.limit,
    excludeSceneIds: input.excludeSceneIds,
  });
  if (vectorMatches.length > 0) {
    return vectorMatches;
  }

  if (await sceneEmbeddingsRepo.countSceneEmbeddings() === 0) {
    await backfillSceneEmbeddings().catch((error: any) => {
      console.warn(`[scene-embeddings] Lazy backfill failed: ${error?.message ?? error}`);
    });
  }

  const metadataCandidates = await sceneEmbeddingsRepo.findSemanticSearchCandidates({
    allowedLevels: input.allowedLevels,
    limit: Math.max(input.limit * 6, 18),
    excludeSceneIds: input.excludeSceneIds,
  });

  return metadataCandidates
    .map((candidate) => {
      const metadata = candidate.metadata as SceneEmbeddingMetadata | null;
      const values = metadata?.embeddingValues;
      if (!Array.isArray(values) || values.length !== embedding.values.length) {
        return null;
      }

      const similarity = cosineSimilarity(embedding.values, values);
      return {
        id: candidate.scene.id,
        title: candidate.scene.title,
        category: candidate.scene.category,
        description: candidate.scene.description,
        missionText: candidate.scene.missionText,
        difficulty: candidate.scene.difficulty,
        estimatedMinutes: candidate.scene.estimatedMinutes,
        characterName: candidate.scene.characterName,
        characterRole: candidate.scene.characterRole,
        similarity,
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
    .sort((left, right) => right.similarity - left.similarity || left.title.localeCompare(right.title))
    .slice(0, input.limit);
}
