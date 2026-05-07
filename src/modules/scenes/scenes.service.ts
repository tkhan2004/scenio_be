import { Level, Prisma, SceneCategory } from '@prisma/client';
import * as scenesRepo from './scenes.repository';
import * as voicesService from '../voices/voices.service';
import * as sceneEmbeddingsService from '../scene-embeddings/scene-embeddings.service';
import {
  ListScenesQuery,
  RecommendScenesQuery,
  SearchScenesQuery,
} from '../../schemas/scenes';

type SceneCard = scenesRepo.SceneCardRecord;
type SearchScene = scenesRepo.SearchSceneRecord;
type SceneDetail = scenesRepo.SceneDetailRecord;
type RecommendationCandidate = scenesRepo.RecommendationCandidateRecord;
type WeakSkill = 'grammar' | 'vocabulary' | 'naturalness';
type SceneCardLike = SceneCard | SearchScene | RecommendationCandidate | {
  id: string;
  title: string;
  category: SceneCategory;
  description: string;
  difficulty: Level;
  estimatedMinutes: number;
  characterName: string;
  characterRole: string;
};

const LEVEL_ORDER: Level[] = [Level.A1, Level.A2, Level.B1, Level.B2];
const SKILL_KEYWORDS: Record<WeakSkill, string[]> = {
  grammar: ['explain', 'compare', 'reason', 'question', 'confirm', 'describe'],
  vocabulary: ['medicine', 'boarding', 'menu', 'networking', 'industry', 'reservation'],
  naturalness: ['friend', 'weekend', 'chat', 'small talk', 'naturally', 'politely'],
};
const SKILL_CATEGORY_PRIORITY: Record<WeakSkill, SceneCategory[]> = {
  grammar: [SceneCategory.WORK, SceneCategory.TRAVEL],
  vocabulary: [SceneCategory.DAILY, SceneCategory.TRAVEL],
  naturalness: [SceneCategory.SOCIAL, SceneCategory.DAILY],
};

/**
 * Helper - mapSceneCard
 * Summary: Chuẩn hóa record từ repository thành scene card trả cho client.
 */
function mapSceneCard(scene: SceneCardLike) {
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

function getSkillLabel(skill: WeakSkill) {
  return skill.toUpperCase();
}

function mapSearchSceneCard(scene: SceneCardLike, metadata?: {
  retrievalMode?: string;
  similarity?: number | null;
  matchReason?: string | null;
}) {
  return {
    ...mapSceneCard(scene),
    retrievalMode: metadata?.retrievalMode ?? 'TEXT_FALLBACK',
    similarity: metadata?.similarity ?? null,
    matchReason: metadata?.matchReason ?? null,
  };
}

function mapRecommendedSceneCard(scene: SceneCardLike, metadata: {
  retrievalMode: string;
  score: number;
  focusSkill: WeakSkill;
  matchReason: string;
  similarity?: number | null;
}) {
  return {
    ...mapSceneCard(scene),
    retrievalMode: metadata.retrievalMode,
    score: Math.round(metadata.score * 100) / 100,
    focusSkill: getSkillLabel(metadata.focusSkill),
    matchReason: metadata.matchReason,
    similarity: metadata.similarity ?? null,
  };
}

/**
 * Helper - mapSceneDetail
 * Summary: Chuẩn hóa record scene detail thành payload đầy đủ cho scene detail screen.
 */
function mapSceneDetail(scene: SceneDetail) {
  return {
    id: scene.id,
    title: scene.title,
    category: scene.category,
    description: scene.description,
    missionText: scene.missionText,
    difficulty: scene.difficulty,
    estimatedMinutes: scene.estimatedMinutes,
    characterName: scene.characterName,
    characterRole: scene.characterRole,
    vocabulary: scene.vocabulary.map((item) => ({
      id: item.id,
      word: item.word,
      definition: item.definition,
      example: item.example,
      sortOrder: item.sortOrder,
    })),
  };
}

/**
 * Helper - getAllowedLevels
 * Summary: Giới hạn phạm vi level mà user được phép thấy khi search/recommend.
 * Notes: User level cao hơn có thể thấy các scene level thấp hơn.
 */
function getAllowedLevels(userLevel: Level) {
  const index = LEVEL_ORDER.indexOf(userLevel);
  return index >= 0 ? LEVEL_ORDER.slice(0, index + 1) : LEVEL_ORDER;
}

/**
 * Helper - normalize
 * Summary: Chuẩn hóa text để tính điểm search/recommend nội bộ.
 */
function normalize(text: string) {
  return text.toLowerCase().trim();
}

/**
 * Helper - scoreScene
 * Summary: Chấm điểm mức độ liên quan của scene với từ khóa tìm kiếm.
 * Notes: Đây là text ranking nội bộ, chưa phải vector search.
 */
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

/**
 * Helper - mapGoalToCategories
 * Summary: Map learningGoal sang nhóm category nên ưu tiên khi recommend.
 */
function mapGoalToCategories(goal: string | null) {
  switch (goal) {
    case 'WORK':
      return [SceneCategory.WORK, SceneCategory.SOCIAL];
    case 'TRAVEL':
      return [SceneCategory.TRAVEL, SceneCategory.DAILY];
    case 'DAILY':
      return [SceneCategory.DAILY, SceneCategory.SOCIAL];
    default:
      return null;
  }
}

/**
 * Helper - mapSelfAssessmentToWeakSkill
 * Summary: Fallback suy ra skill yếu từ selfAssessment khi user chưa có completed sessions.
 */
function mapSelfAssessmentToWeakSkill(selfAssessment: string | null): WeakSkill {
  switch (selfAssessment) {
    case 'GRAMMAR':
      return 'grammar';
    case 'VOCABULARY':
      return 'vocabulary';
    case 'CONFIDENCE':
    case 'NATURALNESS':
    default:
      return 'naturalness';
  }
}

/**
 * Helper - getWeakestSkill
 * Summary: Tính skill yếu nhất từ 5 completed sessions gần nhất hoặc selfAssessment fallback.
 */
function getWeakestSkill(
  sessions: Awaited<ReturnType<typeof scenesRepo.findRecentCompletedSessionsForRecommendation>>,
  selfAssessment: string | null,
): WeakSkill {
  if (sessions.length === 0) {
    return mapSelfAssessmentToWeakSkill(selfAssessment);
  }

  const averages = {
    grammar: 0,
    vocabulary: 0,
    naturalness: 0,
  };

  let grammarCount = 0;
  let vocabularyCount = 0;
  let naturalnessCount = 0;

  for (const session of sessions) {
    if (typeof session.grammarScore === 'number') {
      averages.grammar += session.grammarScore;
      grammarCount += 1;
    }
    if (typeof session.vocabularyScore === 'number') {
      averages.vocabulary += session.vocabularyScore;
      vocabularyCount += 1;
    }
    if (typeof session.naturalnessScore === 'number') {
      averages.naturalness += session.naturalnessScore;
      naturalnessCount += 1;
    }
  }

  const normalized = {
    grammar: grammarCount > 0 ? averages.grammar / grammarCount : Number.MAX_SAFE_INTEGER,
    vocabulary: vocabularyCount > 0 ? averages.vocabulary / vocabularyCount : Number.MAX_SAFE_INTEGER,
    naturalness: naturalnessCount > 0 ? averages.naturalness / naturalnessCount : Number.MAX_SAFE_INTEGER,
  };

  return (Object.entries(normalized) as Array<[WeakSkill, number]>)
    .sort((a, b) => a[1] - b[1])[0][0];
}

/**
 * Helper - scoreRecommendationScene
 * Summary: Chấm điểm heuristic cho scene candidate theo skill yếu, level, và learningGoal.
 * Notes: Đây là bản DB-only để mở endpoint trước khi vector recommend hoàn thiện.
 */
function scoreRecommendationScene(
  scene: RecommendationCandidate,
  userLevel: Level,
  weakestSkill: WeakSkill,
  goalCategories: SceneCategory[] | null,
) {
  const text = normalize(
    [scene.title, scene.description, scene.missionText, scene.characterName, scene.characterRole].join(' '),
  );
  const levelDistance = Math.abs(LEVEL_ORDER.indexOf(userLevel) - LEVEL_ORDER.indexOf(scene.difficulty));

  let score = 0;

  if (goalCategories) {
    const goalIndex = goalCategories.indexOf(scene.category);
    if (goalIndex >= 0) {
      score += goalIndex === 0 ? 45 : 28;
    }
  }

  const skillCategoryIndex = SKILL_CATEGORY_PRIORITY[weakestSkill].indexOf(scene.category);
  if (skillCategoryIndex >= 0) {
    score += skillCategoryIndex === 0 ? 36 : 22;
  }

  score += Math.max(0, 24 - levelDistance * 8);
  score += Math.min(scene._count.vocabulary, 8) * (weakestSkill === 'vocabulary' ? 4 : 2);

  for (const keyword of SKILL_KEYWORDS[weakestSkill]) {
    if (text.includes(keyword)) {
      score += 12;
    }
  }

  if (scene.difficulty === userLevel) {
    score += 12;
  }

  return score;
}

function buildRecommendationQuery(args: {
  userLevel: Level;
  learningGoal: string | null;
  weakestSkill: WeakSkill;
  goalCategories: SceneCategory[] | null;
}) {
  const skillNeed = {
    grammar: 'complete sentence structure, clear questions, correct tense, and accurate grammar',
    vocabulary: 'useful topic words, specific phrases, and richer vocabulary',
    naturalness: 'natural conversation flow, polite replies, confidence, and small talk',
  }[args.weakestSkill];
  const categories = args.goalCategories?.join(', ') || 'mixed daily, social, travel, and work scenes';

  return [
    `Learner level: ${args.userLevel}`,
    `Learning goal: ${args.learningGoal || 'GENERAL_ENGLISH'}`,
    `Weak skill: ${args.weakestSkill}`,
    `Needs practice: ${skillNeed}`,
    `Prefer scene categories: ${categories}`,
  ].join('\n');
}

function scoreSemanticRecommendation(input: {
  similarity: number;
  scene: { difficulty: Level; category: SceneCategory };
  userLevel: Level;
  weakestSkill: WeakSkill;
  goalCategories: SceneCategory[] | null;
}) {
  const levelDistance = Math.abs(LEVEL_ORDER.indexOf(input.userLevel) - LEVEL_ORDER.indexOf(input.scene.difficulty));
  const levelScore = Math.max(0, 1 - levelDistance * 0.25);
  const skillMatch = SKILL_CATEGORY_PRIORITY[input.weakestSkill].includes(input.scene.category) ? 1 : 0.35;
  const goalMatch = input.goalCategories
    ? input.goalCategories.includes(input.scene.category) ? 1 : 0.25
    : 0.6;

  return input.similarity * 0.45
    + skillMatch * 0.25
    + levelScore * 0.15
    + goalMatch * 0.10
    + 0.05;
}

function buildRecommendationReason(weakestSkill: WeakSkill, retrievalMode: string) {
  if (weakestSkill === 'grammar') {
    return retrievalMode === 'HYBRID_VECTOR'
      ? 'Phù hợp để luyện câu đầy đủ và sửa lỗi grammar dựa trên hồ sơ học của bạn.'
      : 'Bạn đang cần củng cố grammar nên hệ thống ưu tiên scene có nhiều lượt hỏi/giải thích.';
  }

  if (weakestSkill === 'vocabulary') {
    return retrievalMode === 'HYBRID_VECTOR'
      ? 'Phù hợp để mở rộng từ vựng theo mục tiêu học và ngữ cảnh gần nhất.'
      : 'Bạn đang cần mở rộng vocabulary nên hệ thống ưu tiên scene có nhiều từ/cụm hữu ích.';
  }

  return retrievalMode === 'HYBRID_VECTOR'
    ? 'Phù hợp để luyện phản xạ tự nhiên và cách trả lời mượt hơn.'
    : 'Bạn đang cần luyện naturalness nên hệ thống ưu tiên scene hội thoại đời thường.';
}

/**
 * Function Objective - listScenes
 * Summary: Lấy danh sách scene active theo filter và phân trang.
 * Inputs: Query đã validate từ schema scenes.
 * Behavior: Build where clause -> count tổng -> lấy page hiện tại -> chuẩn hóa response.
 * Returns: Danh sách scene card cùng total, page, limit.
 */
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

/**
 * Function Objective - searchScenes
 * Summary: Tìm scene theo từ khóa cho user hiện tại.
 * Inputs: userId và query đã validate.
 * Behavior: Lấy level user -> query candidate scenes -> text ranking -> cắt theo limit.
 * Returns: Danh sách scene card phù hợp với từ khóa.
 */
export async function searchScenes(userId: string, query: SearchScenesQuery) {
  const user = await scenesRepo.findUserLevel(userId);
  if (!user) {
    throw Object.assign(new Error('User không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  const allowedLevels = getAllowedLevels(user.level);
  try {
    const vectorMatches = await sceneEmbeddingsService.searchSimilarScenes({
      query: query.q,
      allowedLevels,
      limit: query.limit,
    });

    if (vectorMatches.length > 0) {
      return {
        retrievalMode: 'VECTOR',
        scenes: vectorMatches.map((scene) => mapSearchSceneCard(scene, {
          retrievalMode: 'VECTOR',
          similarity: scene.similarity,
          matchReason: 'Semantic match for your search query.',
        })),
      };
    }
  } catch (error: any) {
    console.warn(`[scenes] Vector search fallback: ${error?.message ?? error}`);
  }

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
    .map((item) => mapSearchSceneCard(item.scene, {
      retrievalMode: 'TEXT_FALLBACK',
      matchReason: 'Text match across scene title, mission, character, or vocabulary.',
    }));

  return { retrievalMode: 'TEXT_FALLBACK', scenes };
}

/**
 * Function Objective - recommendScenes
 * Summary: Gợi ý scene theo skill yếu nhất hiện tại của user.
 * Inputs: userId từ access token và query limit đã validate.
 * Behavior: Suy ra weakest skill từ completed sessions gần nhất -> rank candidate scenes bằng heuristic DB-only.
 * Returns: Danh sách scene card phù hợp nhất cho bước học tiếp theo.
 */
export async function recommendScenes(userId: string, query: RecommendScenesQuery) {
  const user = await scenesRepo.findRecommendationUserContext(userId);
  if (!user) {
    throw Object.assign(new Error('User không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  const allowedLevels = getAllowedLevels(user.level);
  const recentSessions = await scenesRepo.findRecentCompletedSessionsForRecommendation(userId, 5);
  const weakestSkill = getWeakestSkill(recentSessions, user.selfAssessment);
  const goalCategories = mapGoalToCategories(user.learningGoal);
  const recentSceneIds = recentSessions
    .map((session) => session.sceneId)
    .filter((sceneId): sceneId is string => Boolean(sceneId));

  try {
    const vectorMatches = await sceneEmbeddingsService.searchSimilarScenes({
      query: buildRecommendationQuery({
        userLevel: user.level,
        learningGoal: user.learningGoal,
        weakestSkill,
        goalCategories,
      }),
      allowedLevels,
      limit: Math.max(query.limit * 3, 12),
      excludeSceneIds: recentSceneIds,
    });

    if (vectorMatches.length > 0) {
      const scenes = vectorMatches
        .map((scene) => ({
          score: scoreSemanticRecommendation({
            similarity: scene.similarity,
            scene,
            userLevel: user.level,
            weakestSkill,
            goalCategories,
          }),
          scene,
        }))
        .sort((a, b) => b.score - a.score || a.scene.title.localeCompare(b.scene.title))
        .slice(0, query.limit)
        .map((item) => mapRecommendedSceneCard(item.scene, {
          retrievalMode: 'HYBRID_VECTOR',
          score: item.score,
          focusSkill: weakestSkill,
          matchReason: buildRecommendationReason(weakestSkill, 'HYBRID_VECTOR'),
          similarity: item.scene.similarity,
        }));

      return {
        retrievalMode: 'HYBRID_VECTOR',
        focusSkill: getSkillLabel(weakestSkill),
        scenes,
      };
    }
  } catch (error: any) {
    console.warn(`[scenes] Vector recommend fallback: ${error?.message ?? error}`);
  }

  const primaryCandidates = await scenesRepo.findRecommendationSceneCandidates(
    allowedLevels,
    Math.max(query.limit * 3, 12),
    recentSceneIds,
  );

  const fallbackCandidates = primaryCandidates.length >= query.limit
    ? []
    : await scenesRepo.findRecommendationSceneCandidates(
        allowedLevels,
        Math.max(query.limit * 5, 16),
      );

  const scenes = [...primaryCandidates, ...fallbackCandidates]
    .filter((scene, index, items) => items.findIndex((item) => item.id === scene.id) === index)
    .map((scene) => ({
      score: scoreRecommendationScene(scene, user.level, weakestSkill, goalCategories),
      scene,
    }))
    .sort((a, b) => b.score - a.score || a.scene.title.localeCompare(b.scene.title))
    .slice(0, query.limit)
    .map((item) => mapRecommendedSceneCard(item.scene, {
      retrievalMode: 'HEURISTIC_FALLBACK',
      score: item.score,
      focusSkill: weakestSkill,
      matchReason: buildRecommendationReason(weakestSkill, 'HEURISTIC_FALLBACK'),
    }));

  return {
    retrievalMode: 'HEURISTIC_FALLBACK',
    focusSkill: getSkillLabel(weakestSkill),
    scenes,
  };
}

/**
 * Function Objective - getSceneById
 * Summary: Lấy chi tiết đầy đủ của một scene active để hiển thị màn hình scene detail.
 * Inputs: sceneId đã qua validate từ params.
 * Behavior: Query scene active theo id -> throw nếu không tồn tại -> chuẩn hóa payload.
 * Returns: Scene detail gồm metadata, missionText, character info và vocabulary list.
 */
export async function getSceneById(sceneId: string) {
  const scene = await scenesRepo.findActiveSceneById(sceneId);
  if (!scene) {
    throw Object.assign(new Error('Kịch bản không tồn tại'), {
      code: 'SCENE_NOT_FOUND',
      status: 404,
    });
  }

  return {
    scene: mapSceneDetail(scene),
  };
}

/**
 * Function Objective - getSceneVoices
 * Summary: Trả về quick-pick voices và advanced catalog cho một scene active.
 * Inputs: sceneId từ params route.
 * Returns: Scene summary, quick picks, và danh sách voice options cho màn chọn giọng.
 */
export async function getSceneVoices(sceneId: string) {
  return voicesService.getSceneVoices(sceneId);
}
