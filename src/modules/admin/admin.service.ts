import { Level, Prisma, SceneCategory } from '@prisma/client';
import * as adminRepo from './admin.repository';
import * as aiModelsService from '../ai-models/ai-models.service';
import * as sceneEmbeddingsService from '../scene-embeddings/scene-embeddings.service';
import {
  BenchmarkAiModelInput,
  ConnectAiModelInput,
  CreateAdminMissionInput,
  CreateAdminSceneInput,
  GetAdminUserSessionsQuery,
  GetAllUsersQuery,
  ListAiModelsQuery,
  ListAdminScenesQuery,
  UpdateAdminMissionInput,
  UpdateAdminSceneInput,
} from '../../schemas/admin';

type AdminUserRecord = adminRepo.AdminUserRecord;
type AdminSceneCardRecord = adminRepo.AdminSceneCardRecord;
type AdminSceneDetailRecord = adminRepo.AdminSceneDetailRecord;
type AdminUserDetailRecord = adminRepo.AdminUserDetailRecord;
type AdminUserSessionRecord = adminRepo.AdminUserSessionRecord;
type AdminMissionRecord = adminRepo.AdminMissionRecord;
type AdminBadgeRecord = adminRepo.AdminBadgeRecord;
type AdminVoiceRecord = adminRepo.AdminVoiceRecord;

const LEVEL_ORDER: Level[] = [Level.A1, Level.A2, Level.B1, Level.B2];

/**
 * Helper - mapAdminUser
 * Summary: Chuẩn hóa user record cho admin table, chỉ giữ field an toàn cho client.
 */
function mapAdminUser(user: AdminUserRecord) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    level: user.level,
    learningGoal: user.learningGoal,
    studyFrequency: user.studyFrequency,
    selfAssessment: user.selfAssessment,
    needsLevelTest: user.needsLevelTest,
    totalXp: user.totalXp,
    streakDays: user.streakDays,
    lastActiveDate: user.lastActiveDate,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    sessionsCount: user._count.sessions,
  };
}

/**
 * Helper - mapAdminSceneCard
 * Summary: Chuẩn hóa scene record cho bảng admin scene list.
 */
function mapAdminSceneCard(scene: AdminSceneCardRecord) {
  return {
    id: scene.id,
    title: scene.title,
    category: scene.category,
    difficulty: scene.difficulty,
    estimatedMinutes: scene.estimatedMinutes,
    characterName: scene.characterName,
    characterRole: scene.characterRole,
    isActive: scene.isActive,
    updatedAt: scene.updatedAt,
    sessionsCount: scene._count.sessions,
  };
}

/**
 * Helper - mapAdminSceneDetail
 * Summary: Chuẩn hóa scene detail cho admin edit drawer.
 */
function mapAdminSceneDetail(scene: AdminSceneDetailRecord) {
  return {
    scene: {
      id: scene.id,
      title: scene.title,
      category: scene.category,
      difficulty: scene.difficulty,
      description: scene.description,
      missionText: scene.missionText,
      estimatedMinutes: scene.estimatedMinutes,
      characterName: scene.characterName,
      characterRole: scene.characterRole,
      systemPrompt: scene.systemPrompt,
      isActive: scene.isActive,
      createdAt: scene.createdAt,
      updatedAt: scene.updatedAt,
      sessionsCount: scene._count.sessions,
    },
    vocabulary: scene.vocabulary.map((item) => ({
      id: item.id,
      word: item.word,
      definition: item.definition,
      example: item.example,
      sortOrder: item.sortOrder,
    })),
    voicePreset: {
      defaultVoiceId: scene.voicePreset?.defaultVoiceId ?? null,
      defaultMaleVoiceId: scene.voicePreset?.defaultMaleVoiceId ?? null,
      defaultFemaleVoiceId: scene.voicePreset?.defaultFemaleVoiceId ?? null,
    },
  };
}

/**
 * Helper - mapAdminUserDetail
 * Summary: Chuẩn hóa learner detail cho admin drawer profile tab.
 */
function mapAdminUserDetail(user: AdminUserDetailRecord) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName || user.email.split('@')[0],
    avatarUrl: user.avatarUrl,
    level: user.level,
    learningGoal: user.learningGoal,
    studyFrequency: user.studyFrequency,
    selfAssessment: user.selfAssessment,
    needsLevelTest: user.needsLevelTest,
    levelTestedAt: user.levelTestedAt,
    totalXp: user.totalXp,
    streakDays: user.streakDays,
    lastActiveDate: user.lastActiveDate,
    createdAt: user.createdAt,
  };
}

/**
 * Helper - mapAdminUserSession
 * Summary: Chuẩn hóa session history record cho admin learner drawer.
 */
function mapAdminUserSession(session: AdminUserSessionRecord) {
  return {
    id: session.id,
    sourceType: session.sourceType,
    title:
      session.sourceType === 'CUSTOM_PRACTICE'
        ? session.customPracticeConfig?.displayTitle ?? 'Custom Practice'
        : session.scene?.title ?? 'Unknown Scene',
    status: session.status,
    modality: session.modality,
    grammarScore: session.grammarScore,
    vocabularyScore: session.vocabularyScore,
    naturalnessScore: session.naturalnessScore,
    xpEarned: session.xpEarned,
    hintCount: session.hintCount,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
  };
}

/**
 * Helper - mapAdminMission
 * Summary: Chuẩn hóa mission template cho admin mission table.
 */
function mapAdminMission(mission: AdminMissionRecord) {
  return {
    id: mission.id,
    title: mission.title,
    description: mission.description,
    missionType: mission.missionType,
    targetValue: mission.targetValue,
    xpReward: mission.xpReward,
    isActive: mission.isActive,
  };
}

/**
 * Helper - mapAdminBadge
 * Summary: Chuẩn hóa badge record cho admin badge table.
 */
function mapAdminBadge(badge: AdminBadgeRecord) {
  return {
    id: badge.id,
    title: badge.title,
    description: badge.description,
    iconKey: badge.iconKey,
    conditionType: badge.conditionType,
    conditionValue: badge.conditionValue,
    xpReward: badge.xpReward,
    isActive: badge.isActive,
    earnedCount: badge._count.userBadges,
  };
}

/**
 * Helper - mapAdminVoice
 * Summary: Chuẩn hóa voice record cho admin voice table.
 */
function mapAdminVoice(voice: AdminVoiceRecord) {
  return {
    id: voice.id,
    displayName: voice.displayName,
    description: voice.description,
    gender: voice.gender,
    locale: voice.locale,
    accent: voice.accent,
    provider: voice.provider,
    realtimeProvider: voice.realtimeProvider,
    latencyTier: voice.latencyTier,
    styleTags: voice.styleTags,
    sampleText: voice.sampleText,
    sampleUrl: voice.sampleUrl,
    isActive: voice.isActive,
  };
}

/**
 * Helper - getLocalDayBounds
 * Summary: Tạo mốc đầu ngày và đầu ngày kế tiếp theo timezone local của server.
 */
function getLocalDayBounds(baseDate: Date = new Date()) {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

/**
 * Helper - formatDateKey
 * Summary: Chuẩn hóa Date thành chuỗi YYYY-MM-DD cho chart bucket.
 */
function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Helper - getRecentDateKeys
 * Summary: Tạo danh sách ngày liên tiếp để chart sessions luôn có đủ cột dù count = 0.
 */
function getRecentDateKeys(days: number) {
  const dates: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let index = days - 1; index >= 0; index -= 1) {
    const current = new Date(today);
    current.setDate(today.getDate() - index);
    dates.push(formatDateKey(current));
  }

  return dates;
}

/**
 * Helper - getDefaultCharacterRole
 * Summary: Sinh role mặc định theo category để admin có thể tạo scene tối thiểu mà vẫn usable.
 */
function getDefaultCharacterRole(category: SceneCategory) {
  switch (category) {
    case SceneCategory.TRAVEL:
      return 'Travel Staff';
    case SceneCategory.WORK:
      return 'Workplace Partner';
    case SceneCategory.SOCIAL:
      return 'Conversation Partner';
    case SceneCategory.DAILY:
    default:
      return 'Service Staff';
  }
}

/**
 * Helper - buildFallbackDescription
 * Summary: Sinh mô tả ngắn khi admin chưa nhập description cho scene.
 */
function buildFallbackDescription(title: string, category: SceneCategory) {
  return `Practice a ${category.toLowerCase()} conversation for "${title}".`;
}

/**
 * Helper - buildFallbackMissionText
 * Summary: Sinh mission mặc định để scene mới có learning objective rõ ràng.
 */
function buildFallbackMissionText(title: string) {
  return `Complete the "${title}" conversation naturally and confidently.`;
}

/**
 * Helper - buildFallbackSystemPrompt
 * Summary: Sinh system prompt cơ bản cho scene khi admin chưa nhập prompt riêng.
 */
function buildFallbackSystemPrompt(input: {
  title: string;
  description: string;
  missionText: string;
  characterName: string;
  characterRole: string;
}) {
  return [
    `You are ${input.characterName}, acting as a ${input.characterRole}.`,
    `Scene title: ${input.title}.`,
    `Scene description: ${input.description}.`,
    `Mission: ${input.missionText}.`,
    'Stay in role, keep responses concise, and help the learner practice realistic English conversation.',
  ].join(' ');
}

/**
 * Helper - sanitizeScenePayload
 * Summary: Chuẩn hóa payload scene từ admin form, tự bù dữ liệu fallback cho field chưa nhập.
 */
function sanitizeScenePayload(input: {
  title: string;
  category: SceneCategory;
  difficulty: Level;
  description?: string;
  missionText?: string;
  estimatedMinutes?: number;
  characterName?: string;
  characterRole?: string;
  systemPrompt?: string;
  isActive?: boolean;
}) {
  const title = input.title.trim();
  const description = input.description?.trim() || buildFallbackDescription(title, input.category);
  const missionText = input.missionText?.trim() || buildFallbackMissionText(title);
  const characterName = input.characterName?.trim() || 'Scenio AI';
  const characterRole = input.characterRole?.trim() || getDefaultCharacterRole(input.category);
  const systemPrompt = input.systemPrompt?.trim() || buildFallbackSystemPrompt({
    title,
    description,
    missionText,
    characterName,
    characterRole,
  });

  return {
    title,
    category: input.category,
    difficulty: input.difficulty,
    description,
    missionText,
    estimatedMinutes: input.estimatedMinutes ?? 5,
    characterName,
    characterRole,
    systemPrompt,
    isActive: input.isActive ?? true,
  };
}

/**
 * Function Objective - getAllUsers
 * Summary: Lấy danh sách toàn bộ learner cho admin dashboard.
 * Inputs: Query phân trang và search đã qua validation.
 * Behavior: Đếm tổng -> lấy users theo page hiện tại -> chuẩn hóa response cho bảng admin.
 * Returns: Summary, pagination metadata, và danh sách user đã loại field nhạy cảm.
 */
export async function getAllUsers(query: GetAllUsersQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const search = query.search?.trim() || undefined;
  const skip = (page - 1) * limit;

  const [total, users] = await Promise.all([
    adminRepo.countAdminUsers(search),
    adminRepo.findAdminUsers({ skip, take: limit, search }),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    summary: {
      totalUsers: total,
      returnedUsers: users.length,
      search: search ?? null,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
    users: users.map(mapAdminUser),
  };
}

/**
 * Function Objective - getUserDetail
 * Summary: Lấy profile learner và các chỉ số tổng quan cho admin drawer.
 * Inputs: userId của learner.
 * Behavior: Tải profile + đếm summary song song -> chuẩn hóa payload.
 * Returns: user detail và summary học tập.
 */
export async function getUserDetail(userId: string) {
  const user = await adminRepo.findAdminUserById(userId);
  if (!user) {
    throw Object.assign(new Error('Không tìm thấy learner'), {
      code: 'USER_NOT_FOUND',
      status: 404,
    });
  }

  const [
    completedSessions,
    abandonedSessions,
    customPracticeSessions,
    savedVocabularyCount,
    earnedBadgesCount,
  ] = await Promise.all([
    adminRepo.countAdminCompletedSessionsForUser(userId),
    adminRepo.countAdminAbandonedSessionsForUser(userId),
    adminRepo.countAdminCustomPracticeSessionsForUser(userId),
    adminRepo.countAdminSavedVocabularyForUser(userId),
    adminRepo.countAdminEarnedBadgesForUser(userId),
  ]);

  return {
    user: mapAdminUserDetail(user),
    summary: {
      completedSessions,
      abandonedSessions,
      customPracticeSessions,
      savedVocabularyCount,
      earnedBadgesCount,
    },
  };
}

/**
 * Function Objective - getUserSessions
 * Summary: Lấy lịch sử session của learner cho tab Sessions trong admin drawer.
 * Inputs: userId, page, limit.
 * Behavior: Kiểm tra learner tồn tại -> load session history theo trang -> chuẩn hóa title/source.
 * Returns: sessions và pagination tối giản.
 */
export async function getUserSessions(userId: string, query: GetAdminUserSessionsQuery) {
  const user = await adminRepo.findAdminUserById(userId);
  if (!user) {
    throw Object.assign(new Error('Không tìm thấy learner'), {
      code: 'USER_NOT_FOUND',
      status: 404,
    });
  }

  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const [total, sessions] = await Promise.all([
    adminRepo.countAdminUserSessions(userId),
    adminRepo.findAdminUserSessions({ userId, skip, take: limit }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    sessions: sessions.map(mapAdminUserSession),
  };
}

/**
 * Function Objective - getOverview
 * Summary: Lấy overview data cho admin dashboard gồm KPI, chart level, recent learners, và sessions by day.
 * Inputs: Không có input ngoài quyền admin.
 * Behavior: Tải song song các metric chính -> bucket session theo 7 ngày gần nhất -> chuẩn hóa chart data.
 * Returns: Summary cards, level distribution, recent learners, sessionsByDay.
 */
export async function getOverview() {
  const { start: todayStart, end: todayEnd } = getLocalDayBounds();
  const chartStart = new Date(todayStart);
  chartStart.setDate(chartStart.getDate() - 6);

  const [
    totalLearners,
    activeToday,
    totalScenes,
    totalCustomPracticeSessions,
    totalVocabularySaved,
    levelDistributionRows,
    recentLearnersRows,
    sessions,
  ] = await Promise.all([
    adminRepo.countLearners(),
    adminRepo.countActiveLearnersInRange(todayStart, todayEnd),
    adminRepo.countScenes(),
    adminRepo.countCustomPracticeSessions(),
    adminRepo.countSavedVocabulary(),
    adminRepo.findLearnerLevelDistribution(),
    adminRepo.findRecentLearners(5),
    adminRepo.findSessionsStartedSince(chartStart),
  ]);

  const levelMap = new Map(levelDistributionRows.map((row) => [row.level, row._count._all]));
  const dateKeys = getRecentDateKeys(7);
  const sessionCounts = new Map(dateKeys.map((date) => [date, 0]));

  for (const session of sessions) {
    const key = formatDateKey(session.startedAt);
    if (sessionCounts.has(key)) {
      sessionCounts.set(key, (sessionCounts.get(key) ?? 0) + 1);
    }
  }

  return {
    summary: {
      totalLearners,
      activeToday,
      totalScenes,
      totalCustomPracticeSessions,
      totalVocabularySaved,
    },
    levelDistribution: LEVEL_ORDER.map((level) => ({
      level,
      count: levelMap.get(level) ?? 0,
    })),
    recentLearners: recentLearnersRows.map((user) => ({
      id: user.id,
      displayName: user.displayName || user.email.split('@')[0],
      email: user.email,
      level: user.level,
      createdAt: user.createdAt,
    })),
    sessionsByDay: dateKeys.map((date) => ({
      date,
      count: sessionCounts.get(date) ?? 0,
    })),
  };
}

/**
 * Function Objective - listScenes
 * Summary: Lấy scene list cho admin table với filter và phân trang.
 * Inputs: Search, category, difficulty, isActive, page, limit.
 * Behavior: Build where -> đếm tổng + đếm active toàn cục -> lấy page hiện tại -> chuẩn hóa row data.
 * Returns: Summary scene counts, pagination, và danh sách scene card.
 */
export async function listScenes(query: ListAdminScenesQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const search = query.search?.trim() || undefined;
  const skip = (page - 1) * limit;
  const where = adminRepo.buildSceneWhere({
    search,
    category: query.category,
    difficulty: query.difficulty,
    isActive: query.isActive,
  });

  const [total, activeScenes, scenes] = await Promise.all([
    adminRepo.countAdminScenes(where),
    adminRepo.countActiveScenes(),
    adminRepo.findAdminScenes({ where, skip, take: limit }),
  ]);

  const totalScenes = await adminRepo.countScenes();
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    summary: {
      totalScenes,
      activeScenes,
      inactiveScenes: Math.max(totalScenes - activeScenes, 0),
      returnedScenes: scenes.length,
      search: search ?? null,
      category: query.category ?? null,
      difficulty: query.difficulty ?? null,
      isActive: typeof query.isActive === 'boolean' ? query.isActive : null,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
    scenes: scenes.map(mapAdminSceneCard),
  };
}

/**
 * Function Objective - getSceneById
 * Summary: Lấy chi tiết scene cho admin edit drawer.
 * Inputs: sceneId.
 * Behavior: Tải scene detail không phân biệt active/inactive -> throw nếu không tồn tại -> chuẩn hóa payload.
 * Returns: Scene detail, vocabulary list, và voice preset ids.
 */
export async function getSceneById(sceneId: string) {
  const scene = await adminRepo.findAdminSceneById(sceneId);
  if (!scene) {
    throw Object.assign(new Error('Không tìm thấy scene'), {
      code: 'SCENE_NOT_FOUND',
      status: 404,
    });
  }

  return mapAdminSceneDetail(scene);
}

/**
 * Function Objective - createScene
 * Summary: Tạo scene mới từ admin form với fallback prompt/character để tránh scene rỗng unusable.
 * Inputs: Payload create scene từ admin.
 * Behavior: Sanitize field -> tìm voice mặc định đầu tiên nếu có -> create scene + voice preset -> trả detail chuẩn hóa.
 * Returns: Scene payload cho FE sau khi lưu thành công.
 */
export async function createScene(input: CreateAdminSceneInput) {
  const payload = sanitizeScenePayload(input);
  const defaultVoice = await adminRepo.findAnyActiveVoiceProfileId();
  const scene = await adminRepo.createAdminScene(payload, defaultVoice?.id);

  if (!scene) {
    throw Object.assign(new Error('Không thể tạo scene'), {
      code: 'SCENE_CREATE_FAILED',
      status: 500,
    });
  }

  const detail = mapAdminSceneDetail(scene);
  await sceneEmbeddingsService.upsertSceneEmbeddingBestEffort(detail.scene.id);

  return {
    scene: detail.scene,
    vocabulary: detail.vocabulary,
    voicePreset: detail.voicePreset,
  };
}

/**
 * Function Objective - updateScene
 * Summary: Cập nhật scene hiện có từ admin form và tự chuẩn hóa lại field fallback nếu bị để trống.
 * Inputs: sceneId và payload patch từ admin.
 * Behavior: Tải scene hiện tại -> merge với patch -> sanitize -> update DB -> trả detail mới nhất.
 * Returns: Scene payload sau cập nhật.
 */
export async function updateScene(sceneId: string, input: UpdateAdminSceneInput) {
  const existing = await adminRepo.findAdminSceneById(sceneId);
  if (!existing) {
    throw Object.assign(new Error('Không tìm thấy scene'), {
      code: 'SCENE_NOT_FOUND',
      status: 404,
    });
  }

  const payload = sanitizeScenePayload({
    title: input.title ?? existing.title,
    category: input.category ?? existing.category,
    difficulty: input.difficulty ?? existing.difficulty,
    description: input.description ?? existing.description,
    missionText: input.missionText ?? existing.missionText,
    estimatedMinutes: input.estimatedMinutes ?? existing.estimatedMinutes,
    characterName: input.characterName ?? existing.characterName,
    characterRole: input.characterRole ?? existing.characterRole,
    systemPrompt: input.systemPrompt ?? existing.systemPrompt,
    isActive: input.isActive ?? existing.isActive,
  });

  const scene = await adminRepo.updateAdminScene(sceneId, payload);
  if (!scene) {
    throw Object.assign(new Error('Không thể cập nhật scene'), {
      code: 'SCENE_UPDATE_FAILED',
      status: 500,
    });
  }

  const detail = mapAdminSceneDetail(scene);
  await sceneEmbeddingsService.upsertSceneEmbeddingBestEffort(detail.scene.id);

  return {
    scene: detail.scene,
    vocabulary: detail.vocabulary,
    voicePreset: detail.voicePreset,
  };
}

/**
 * Function Objective - toggleScene
 * Summary: Bật/tắt trạng thái active của scene trong admin list.
 * Inputs: sceneId và isActive target.
 * Behavior: Kiểm tra scene tồn tại -> update trạng thái -> trả row tối giản để FE optimistic update.
 * Returns: id, isActive, updatedAt.
 */
export async function toggleScene(sceneId: string, isActive: boolean) {
  const existing = await adminRepo.findAdminSceneById(sceneId);
  if (!existing) {
    throw Object.assign(new Error('Không tìm thấy scene'), {
      code: 'SCENE_NOT_FOUND',
      status: 404,
    });
  }

  const scene = await adminRepo.toggleAdminScene(sceneId, isActive);
  if (isActive) {
    await sceneEmbeddingsService.upsertSceneEmbeddingBestEffort(scene.id);
  }

  return scene;
}

/**
 * Function Objective - listMissions
 * Summary: Lấy toàn bộ mission template để admin quản lý.
 * Inputs: Không yêu cầu query filter ở phiên bản hiện tại.
 * Returns: Danh sách missions cho mission table.
 */
export async function listMissions() {
  const missions = await adminRepo.findAdminMissions();
  return {
    missions: missions.map(mapAdminMission),
  };
}

/**
 * Function Objective - createMission
 * Summary: Tạo mission template mới cho hệ thống.
 * Inputs: title, description, missionType, targetValue, xpReward, isActive.
 * Returns: Mission vừa tạo.
 */
export async function createMission(input: CreateAdminMissionInput) {
  const mission = await adminRepo.createAdminMission(input);
  return {
    mission: mapAdminMission(mission),
  };
}

/**
 * Function Objective - updateMission
 * Summary: Cập nhật mission template hiện có.
 * Inputs: missionId và payload patch.
 * Behavior: Check tồn tại -> update -> trả mission mới nhất.
 * Returns: Mission đã cập nhật.
 */
export async function updateMission(missionId: string, input: UpdateAdminMissionInput) {
  const existing = await adminRepo.findAdminMissionById(missionId);
  if (!existing) {
    throw Object.assign(new Error('Không tìm thấy mission'), {
      code: 'MISSION_NOT_FOUND',
      status: 404,
    });
  }

  const mission = await adminRepo.updateAdminMission(missionId, input);
  return {
    mission: mapAdminMission(mission),
  };
}

/**
 * Function Objective - toggleMission
 * Summary: Bật/tắt trạng thái active của mission template.
 * Inputs: missionId và isActive target.
 * Returns: Minimal mission payload cho optimistic update.
 */
export async function toggleMission(missionId: string, isActive: boolean) {
  const existing = await adminRepo.findAdminMissionById(missionId);
  if (!existing) {
    throw Object.assign(new Error('Không tìm thấy mission'), {
      code: 'MISSION_NOT_FOUND',
      status: 404,
    });
  }

  const mission = await adminRepo.toggleAdminMission(missionId, isActive);
  return {
    mission,
  };
}

/**
 * Function Objective - listBadges
 * Summary: Lấy toàn bộ badge của hệ thống cho admin badge table.
 * Inputs: Không yêu cầu query filter ở phiên bản hiện tại.
 * Returns: Danh sách badge đã chuẩn hóa.
 */
export async function listBadges() {
  const badges = await adminRepo.findAdminBadges();
  return {
    badges: badges.map(mapAdminBadge),
  };
}

/**
 * Function Objective - toggleBadge
 * Summary: Bật/tắt trạng thái active của badge.
 * Inputs: badgeId và isActive target.
 * Returns: Minimal badge payload cho optimistic update.
 */
export async function toggleBadge(badgeId: string, isActive: boolean) {
  const existing = await adminRepo.findAdminBadgeById(badgeId);
  if (!existing) {
    throw Object.assign(new Error('Không tìm thấy badge'), {
      code: 'BADGE_NOT_FOUND',
      status: 404,
    });
  }

  const badge = await adminRepo.toggleAdminBadge(badgeId, isActive);
  return {
    badge,
  };
}

/**
 * Function Objective - listVoices
 * Summary: Lấy toàn bộ voice profile cho admin catalog.
 * Inputs: Không yêu cầu filter ở phiên bản hiện tại.
 * Returns: Danh sách voice, gồm cả active và inactive.
 */
export async function listVoices() {
  const voices = await adminRepo.findAdminVoices();
  return {
    voices: voices.map(mapAdminVoice),
  };
}

/**
 * Function Objective - toggleVoice
 * Summary: Bật/tắt trạng thái active của voice profile.
 * Inputs: voiceId và isActive target.
 * Returns: Minimal voice payload cho optimistic update.
 */
export async function toggleVoice(voiceId: string, isActive: boolean) {
  const existing = await adminRepo.findAdminVoiceById(voiceId);
  if (!existing) {
    throw Object.assign(new Error('Không tìm thấy voice'), {
      code: 'VOICE_NOT_FOUND',
      status: 404,
    });
  }

  const voice = await adminRepo.toggleAdminVoice(voiceId, isActive);
  return {
    voice,
  };
}

/**
 * Function Objective - listAiModels
 * Summary: Lấy AI model catalog và active setting cho màn admin model settings.
 * Inputs: Optional featureType filter.
 * Returns: Danh sách model và setting hiện hành theo feature.
 */
export async function listAiModels(query: ListAiModelsQuery) {
  return aiModelsService.listAiModels(query.featureType);
}

/**
 * Function Objective - connectAiModel
 * Summary: Test provider và chọn model làm active cho feature tương ứng.
 * Inputs: model id, outputDimension/config optional.
 * Returns: Active setting mới và benchmark connect.
 */
export async function connectAiModel(modelId: string, input: ConnectAiModelInput) {
  return aiModelsService.connectAiModel(modelId, {
    outputDimension: input.outputDimension,
    fallbackModelIds: input.fallbackModelIds,
    benchmarkText: input.benchmarkText,
    config: input.config as Prisma.InputJsonValue | undefined,
  });
}

/**
 * Function Objective - benchmarkAiModel
 * Summary: Chạy benchmark model mà chưa thay đổi active setting.
 * Inputs: model id, sample text, outputDimension.
 * Returns: Kết quả benchmark để admin so sánh latency/dimension.
 */
export async function benchmarkAiModel(modelId: string, input: BenchmarkAiModelInput) {
  return aiModelsService.benchmarkAiModel(modelId, input);
}
