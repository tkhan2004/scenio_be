import { Level, Prisma } from '@prisma/client';
import * as scenesRepo from './scenes.repository';
import { ListScenesQuery, SearchScenesQuery } from '../../schemas/scenes';

type SceneCard = scenesRepo.SceneCardRecord;
type SearchScene = scenesRepo.SearchSceneRecord;

function mapSceneCard(scene: SceneCard | SearchScene) {
  return {
    id: scene.id,
    title: scene.title,
    category: scene.category,
    description: scene.description,
    difficulty: scene.difficulty,
    estimatedMinutes: scene.estimatedMinutes,
    characterName: scene.characterName,
    characterRole: scene.characterRole,
  };
}

function getAllowedLevels(userLevel: Level) {
  const order: Level[] = [Level.A1, Level.A2, Level.B1, Level.B2];
  const index = order.indexOf(userLevel);
  return index >= 0 ? order.slice(0, index + 1) : order;
}

function normalize(text: string) {
  return text.toLowerCase().trim();
}

function includesText(text: string | null | undefined, query: string) {
  if (!text) return false;
  return normalize(text).includes(query);
}

function scoreScene(scene: SearchScene, rawQuery: string) {
  const query = normalize(rawQuery);
  const terms = query.split(/\s+/).filter(Boolean);
  const title = normalize(scene.title);
  const description = normalize(scene.description);
  const missionText = normalize(scene.missionText);
  const characterName = normalize(scene.characterName);
  const characterRole = normalize(scene.characterRole);
  const vocabularyText = scene.vocabulary
    .flatMap((item) => [item.word, item.definition, item.example])
    .map((item) => normalize(item))
    .join(' ');

  let score = 0;

  if (title === query) score += 200;
  if (title.startsWith(query)) score += 90;
  if (title.includes(query)) score += 80;
  if (missionText.includes(query)) score += 55;
  if (description.includes(query)) score += 40;
  if (characterName.includes(query)) score += 35;
  if (characterRole.includes(query)) score += 30;
  if (vocabularyText.includes(query)) score += 25;

  for (const term of terms) {
    if (title.includes(term)) score += 18;
    if (missionText.includes(term)) score += 10;
    if (description.includes(term)) score += 8;
    if (characterName.includes(term) || characterRole.includes(term)) score += 6;
    if (vocabularyText.includes(term)) score += 5;
  }

  return score;
}

export async function listScenes(query: ListScenesQuery) {
  const where: Prisma.SceneWhereInput = {
    isActive: true,
  };

  if (query.category) where.category = query.category;
  if (query.difficulty) where.difficulty = query.difficulty;

  const skip = (query.page - 1) * query.limit;

  const [total, scenes] = await Promise.all([
    scenesRepo.countScenes(where),
    scenesRepo.findScenes({
      where,
      skip,
      take: query.limit,
    }),
  ]);

  return {
    scenes: scenes.map(mapSceneCard),
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function searchScenes(userId: string, query: SearchScenesQuery) {
  const user = await scenesRepo.findUserLevel(userId);
  if (!user) {
    throw Object.assign(new Error('User không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  const allowedLevels = getAllowedLevels(user.level);
  const candidates = await scenesRepo.findSearchSceneCandidates(
    query.q,
    allowedLevels,
    Math.max(query.limit * 5, 10),
  );

  const scenes = candidates
    .map((scene) => ({
      score: scoreScene(scene, query.q),
      scene,
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.scene.title.localeCompare(b.scene.title))
    .slice(0, query.limit)
    .map((item) => mapSceneCard(item.scene));

  return { scenes };
}
