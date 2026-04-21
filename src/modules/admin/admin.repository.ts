import {
  Level,
  Prisma,
  SceneCategory,
  SessionSourceType,
} from '@prisma/client';
import prisma from '../../config/database';

function buildLearnerSearchWhere(search?: string) {
  if (!search) {
    return {
      isAdmin: false,
    };
  }

  return {
    isAdmin: false,
    OR: [
      {
        email: {
          contains: search,
          mode: 'insensitive' as const,
        },
      },
      {
        displayName: {
          contains: search,
          mode: 'insensitive' as const,
        },
      },
    ],
  };
}

function buildAdminSceneWhere({
  search,
  category,
  difficulty,
  isActive,
}: {
  search?: string;
  category?: SceneCategory;
  difficulty?: Level;
  isActive?: boolean;
}): Prisma.SceneWhereInput {
  return {
    category,
    difficulty,
    isActive,
    OR: search
      ? [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { missionText: { contains: search, mode: 'insensitive' } },
        { characterName: { contains: search, mode: 'insensitive' } },
        { characterRole: { contains: search, mode: 'insensitive' } },
      ]
      : undefined,
  };
}

const adminSceneCardSelect = {
  id: true,
  title: true,
  category: true,
  difficulty: true,
  estimatedMinutes: true,
  characterName: true,
  characterRole: true,
  isActive: true,
  updatedAt: true,
  _count: {
    select: {
      sessions: true,
    },
  },
} satisfies Prisma.SceneSelect;

const adminSceneDetailSelect = {
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
  createdAt: true,
  updatedAt: true,
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
  voicePreset: {
    select: {
      defaultVoiceId: true,
      defaultMaleVoiceId: true,
      defaultFemaleVoiceId: true,
    },
  },
  _count: {
    select: {
      sessions: true,
    },
  },
} satisfies Prisma.SceneSelect;

const adminUserDetailSelect = {
  id: true,
  email: true,
  displayName: true,
  avatarUrl: true,
  level: true,
  learningGoal: true,
  studyFrequency: true,
  selfAssessment: true,
  needsLevelTest: true,
  levelTestedAt: true,
  totalXp: true,
  streakDays: true,
  lastActiveDate: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

const adminUserSessionSelect = {
  id: true,
  sourceType: true,
  status: true,
  modality: true,
  grammarScore: true,
  vocabularyScore: true,
  naturalnessScore: true,
  xpEarned: true,
  hintCount: true,
  startedAt: true,
  endedAt: true,
  scene: {
    select: {
      title: true,
    },
  },
  customPracticeConfig: {
    select: {
      displayTitle: true,
    },
  },
} satisfies Prisma.SessionSelect;

const adminMissionSelect = {
  id: true,
  title: true,
  description: true,
  missionType: true,
  targetValue: true,
  xpReward: true,
  isActive: true,
} satisfies Prisma.DailyMissionSelect;

const adminBadgeSelect = {
  id: true,
  title: true,
  description: true,
  iconKey: true,
  conditionType: true,
  conditionValue: true,
  xpReward: true,
  isActive: true,
  _count: {
    select: {
      userBadges: true,
    },
  },
} satisfies Prisma.BadgeSelect;

const adminVoiceSelect = {
  id: true,
  displayName: true,
  description: true,
  gender: true,
  locale: true,
  accent: true,
  provider: true,
  realtimeProvider: true,
  latencyTier: true,
  styleTags: true,
  sampleText: true,
  sampleUrl: true,
  isActive: true,
} satisfies Prisma.VoiceProfileSelect;

export type AdminUserRecord = Awaited<ReturnType<typeof findAdminUsers>>[number];
export type AdminSceneCardRecord = Prisma.SceneGetPayload<{ select: typeof adminSceneCardSelect }>;
export type AdminSceneDetailRecord = Prisma.SceneGetPayload<{ select: typeof adminSceneDetailSelect }>;
export type AdminUserDetailRecord = Prisma.UserGetPayload<{ select: typeof adminUserDetailSelect }>;
export type AdminUserSessionRecord = Prisma.SessionGetPayload<{ select: typeof adminUserSessionSelect }>;
export type AdminMissionRecord = Prisma.DailyMissionGetPayload<{ select: typeof adminMissionSelect }>;
export type AdminBadgeRecord = Prisma.BadgeGetPayload<{ select: typeof adminBadgeSelect }>;
export type AdminVoiceRecord = Prisma.VoiceProfileGetPayload<{ select: typeof adminVoiceSelect }>;

/**
 * Repository - Admin
 * Summary: Quản lý truy cập dữ liệu cho các màn hình quản trị learner, overview, scenes, missions, badges, và voices.
 */

/**
 * Query Objective - countAdminUsers
 * Summary: Đếm tổng số learner phục vụ phân trang bảng admin.
 * Query Shape: count user theo isAdmin = false, có search nếu được truyền vào.
 */
export async function countAdminUsers(search?: string) {
  return prisma.user.count({
    where: buildLearnerSearchWhere(search),
  });
}

/**
 * Query Objective - findAdminUsers
 * Summary: Lấy danh sách learner cho admin table theo page hiện tại.
 * Query Shape: findMany user theo isAdmin = false, orderBy createdAt desc, include session count.
 */
export async function findAdminUsers({
  skip,
  take,
  search,
}: {
  skip: number;
  take: number;
  search?: string;
}) {
  return prisma.user.findMany({
    where: buildLearnerSearchWhere(search),
    orderBy: [{ createdAt: 'desc' }, { email: 'asc' }],
    skip,
    take,
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      level: true,
      learningGoal: true,
      studyFrequency: true,
      selfAssessment: true,
      needsLevelTest: true,
      totalXp: true,
      streakDays: true,
      lastActiveDate: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          sessions: true,
        },
      },
    },
  });
}

/**
 * Query Objective - findAdminUserById
 * Summary: Lấy profile chi tiết của learner cho admin drawer.
 * Query Shape: findFirst theo id + isAdmin false.
 */
export async function findAdminUserById(userId: string) {
  return prisma.user.findFirst({
    where: {
      id: userId,
      isAdmin: false,
    },
    select: adminUserDetailSelect,
  });
}

/**
 * Query Objective - countAdminCompletedSessionsForUser
 * Summary: Đếm tổng số session COMPLETED của learner cho admin summary.
 */
export async function countAdminCompletedSessionsForUser(userId: string) {
  return prisma.session.count({
    where: {
      userId,
      status: 'COMPLETED',
    },
  });
}

/**
 * Query Objective - countAdminAbandonedSessionsForUser
 * Summary: Đếm tổng số session ABANDONED của learner cho admin summary.
 */
export async function countAdminAbandonedSessionsForUser(userId: string) {
  return prisma.session.count({
    where: {
      userId,
      status: 'ABANDONED',
    },
  });
}

/**
 * Query Objective - countAdminCustomPracticeSessionsForUser
 * Summary: Đếm tổng số session custom practice của learner.
 */
export async function countAdminCustomPracticeSessionsForUser(userId: string) {
  return prisma.session.count({
    where: {
      userId,
      sourceType: SessionSourceType.CUSTOM_PRACTICE,
    },
  });
}

/**
 * Query Objective - countAdminSavedVocabularyForUser
 * Summary: Đếm tổng số từ dictionary aggregate của learner.
 */
export async function countAdminSavedVocabularyForUser(userId: string) {
  return prisma.userVocabulary.count({
    where: {
      userId,
    },
  });
}

/**
 * Query Objective - countAdminEarnedBadgesForUser
 * Summary: Đếm tổng số badge learner đã nhận.
 */
export async function countAdminEarnedBadgesForUser(userId: string) {
  return prisma.userBadge.count({
    where: {
      userId,
    },
  });
}

/**
 * Query Objective - countAdminUserSessions
 * Summary: Đếm tổng số session của learner để phân trang tab sessions.
 */
export async function countAdminUserSessions(userId: string) {
  return prisma.session.count({
    where: {
      userId,
    },
  });
}

/**
 * Query Objective - findAdminUserSessions
 * Summary: Lấy lịch sử session của learner cho tab sessions trong admin drawer.
 * Query Shape: findMany theo userId, orderBy startedAt desc, include scene/custom title.
 */
export async function findAdminUserSessions({
  userId,
  skip,
  take,
}: {
  userId: string;
  skip: number;
  take: number;
}) {
  return prisma.session.findMany({
    where: {
      userId,
    },
    orderBy: [{ startedAt: 'desc' }],
    skip,
    take,
    select: adminUserSessionSelect,
  });
}

/**
 * Query Objective - countLearners
 * Summary: Đếm tổng learner phục vụ overview dashboard.
 */
export async function countLearners() {
  return prisma.user.count({
    where: {
      isAdmin: false,
    },
  });
}

/**
 * Query Objective - countActiveLearnersInRange
 * Summary: Đếm learner active trong ngày hiện tại theo lastActiveDate.
 */
export async function countActiveLearnersInRange(start: Date, end: Date) {
  return prisma.user.count({
    where: {
      isAdmin: false,
      lastActiveDate: {
        gte: start,
        lt: end,
      },
    },
  });
}

/**
 * Query Objective - countScenes
 * Summary: Đếm tổng số scene trong hệ thống.
 */
export async function countScenes() {
  return prisma.scene.count();
}

/**
 * Query Objective - countActiveScenes
 * Summary: Đếm tổng số scene đang active trong hệ thống.
 */
export async function countActiveScenes() {
  return prisma.scene.count({
    where: {
      isActive: true,
    },
  });
}

/**
 * Query Objective - countCustomPracticeSessions
 * Summary: Đếm tổng số session custom practice để hiển thị overview admin.
 */
export async function countCustomPracticeSessions() {
  return prisma.session.count({
    where: {
      sourceType: SessionSourceType.CUSTOM_PRACTICE,
    },
  });
}

/**
 * Query Objective - countSavedVocabulary
 * Summary: Đếm tổng số từ trong dictionary aggregate của toàn hệ thống.
 */
export async function countSavedVocabulary() {
  return prisma.userVocabulary.count();
}

/**
 * Query Objective - findLearnerLevelDistribution
 * Summary: Lấy phân bố level của learner để render pie chart trên admin dashboard.
 */
export async function findLearnerLevelDistribution() {
  return prisma.user.groupBy({
    by: ['level'],
    where: {
      isAdmin: false,
    },
    _count: {
      _all: true,
    },
  });
}

/**
 * Query Objective - findRecentLearners
 * Summary: Lấy learner mới nhất để hiển thị mục Recent learners.
 */
export async function findRecentLearners(take: number) {
  return prisma.user.findMany({
    where: {
      isAdmin: false,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take,
    select: {
      id: true,
      displayName: true,
      email: true,
      level: true,
      createdAt: true,
    },
  });
}

/**
 * Query Objective - findSessionsStartedSince
 * Summary: Lấy startedAt của các session gần đây để service tự bucket theo ngày.
 */
export async function findSessionsStartedSince(start: Date) {
  return prisma.session.findMany({
    where: {
      startedAt: {
        gte: start,
      },
    },
    select: {
      startedAt: true,
    },
  });
}

/**
 * Query Objective - countAdminScenes
 * Summary: Đếm tổng số scene khớp filter để phục vụ phân trang bảng admin scenes.
 */
export async function countAdminScenes(where: Prisma.SceneWhereInput) {
  return prisma.scene.count({ where });
}

/**
 * Query Objective - findAdminScenes
 * Summary: Lấy scene list cho admin table, gồm trạng thái active và sessions count.
 * Query Shape: findMany theo filter + select scene card quản trị.
 */
export async function findAdminScenes(args: {
  where: Prisma.SceneWhereInput;
  skip: number;
  take: number;
}) {
  return prisma.scene.findMany({
    where: args.where,
    skip: args.skip,
    take: args.take,
    orderBy: [{ updatedAt: 'desc' }, { title: 'asc' }],
    select: adminSceneCardSelect,
  });
}

/**
 * Query Objective - findAdminSceneById
 * Summary: Lấy chi tiết scene cho admin edit drawer, bao gồm vocabulary và voice preset.
 * Query Shape: findUnique theo id, không lọc isActive.
 */
export async function findAdminSceneById(sceneId: string) {
  return prisma.scene.findUnique({
    where: { id: sceneId },
    select: adminSceneDetailSelect,
  });
}

/**
 * Query Objective - findAnyActiveVoiceProfileId
 * Summary: Lấy một voice active để gắn preset mặc định cho scene mới nếu có.
 */
export async function findAnyActiveVoiceProfileId() {
  return prisma.voiceProfile.findFirst({
    where: {
      isActive: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      id: true,
    },
  });
}

/**
 * Query Objective - createAdminScene
 * Summary: Tạo scene mới và tự tạo scene_voice_preset đi kèm để scene có cấu trúc đầy đủ.
 */
export async function createAdminScene(
  data: Prisma.SceneUncheckedCreateInput,
  defaultVoiceId?: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const scene = await tx.scene.create({
      data,
      select: {
        id: true,
      },
    });

    await tx.sceneVoicePreset.create({
      data: {
        sceneId: scene.id,
        defaultVoiceId: defaultVoiceId ?? null,
      },
    });

    return tx.scene.findUnique({
      where: {
        id: scene.id,
      },
      select: adminSceneDetailSelect,
    });
  });
}

/**
 * Query Objective - updateAdminScene
 * Summary: Cập nhật scene hiện có và trả lại bản ghi detail mới nhất.
 */
export async function updateAdminScene(sceneId: string, data: Prisma.SceneUncheckedUpdateInput) {
  await prisma.scene.update({
    where: { id: sceneId },
    data,
  });

  return findAdminSceneById(sceneId);
}

/**
 * Query Objective - toggleAdminScene
 * Summary: Bật/tắt trạng thái active của scene trong admin table.
 */
export async function toggleAdminScene(sceneId: string, isActive: boolean) {
  return prisma.scene.update({
    where: { id: sceneId },
    data: { isActive },
    select: {
      id: true,
      isActive: true,
      updatedAt: true,
    },
  });
}

/**
 * Query Objective - findAdminMissions
 * Summary: Lấy danh sách mission template để admin quản lý.
 */
export async function findAdminMissions() {
  return prisma.dailyMission.findMany({
    orderBy: [{ isActive: 'desc' }, { xpReward: 'desc' }, { title: 'asc' }],
    select: adminMissionSelect,
  });
}

/**
 * Query Objective - findAdminMissionById
 * Summary: Lấy một mission template theo id để check tồn tại trước khi update/toggle.
 */
export async function findAdminMissionById(missionId: string) {
  return prisma.dailyMission.findUnique({
    where: { id: missionId },
    select: adminMissionSelect,
  });
}

/**
 * Query Objective - createAdminMission
 * Summary: Tạo mission template mới.
 */
export async function createAdminMission(data: Prisma.DailyMissionUncheckedCreateInput) {
  return prisma.dailyMission.create({
    data,
    select: adminMissionSelect,
  });
}

/**
 * Query Objective - updateAdminMission
 * Summary: Cập nhật mission template hiện có.
 */
export async function updateAdminMission(missionId: string, data: Prisma.DailyMissionUncheckedUpdateInput) {
  return prisma.dailyMission.update({
    where: { id: missionId },
    data,
    select: adminMissionSelect,
  });
}

/**
 * Query Objective - toggleAdminMission
 * Summary: Bật/tắt trạng thái active của mission template.
 */
export async function toggleAdminMission(missionId: string, isActive: boolean) {
  return prisma.dailyMission.update({
    where: { id: missionId },
    data: { isActive },
    select: {
      id: true,
      isActive: true,
    },
  });
}

/**
 * Query Objective - findAdminBadges
 * Summary: Lấy toàn bộ badge để admin quản lý trạng thái active.
 */
export async function findAdminBadges() {
  return prisma.badge.findMany({
    orderBy: [{ isActive: 'desc' }, { xpReward: 'desc' }, { title: 'asc' }],
    select: adminBadgeSelect,
  });
}

/**
 * Query Objective - findAdminBadgeById
 * Summary: Lấy badge theo id để check tồn tại trước khi toggle.
 */
export async function findAdminBadgeById(badgeId: string) {
  return prisma.badge.findUnique({
    where: { id: badgeId },
    select: adminBadgeSelect,
  });
}

/**
 * Query Objective - toggleAdminBadge
 * Summary: Bật/tắt trạng thái active của badge.
 */
export async function toggleAdminBadge(badgeId: string, isActive: boolean) {
  return prisma.badge.update({
    where: { id: badgeId },
    data: { isActive },
    select: {
      id: true,
      isActive: true,
    },
  });
}

/**
 * Query Objective - findAdminVoices
 * Summary: Lấy toàn bộ voice profile cho admin catalog, bao gồm cả active và inactive.
 */
export async function findAdminVoices() {
  return prisma.voiceProfile.findMany({
    orderBy: [{ isActive: 'desc' }, { displayName: 'asc' }],
    select: adminVoiceSelect,
  });
}

/**
 * Query Objective - findAdminVoiceById
 * Summary: Lấy voice theo id để check tồn tại trước khi toggle.
 */
export async function findAdminVoiceById(voiceId: string) {
  return prisma.voiceProfile.findUnique({
    where: { id: voiceId },
    select: adminVoiceSelect,
  });
}

/**
 * Query Objective - toggleAdminVoice
 * Summary: Bật/tắt trạng thái active của voice profile.
 */
export async function toggleAdminVoice(voiceId: string, isActive: boolean) {
  return prisma.voiceProfile.update({
    where: { id: voiceId },
    data: { isActive },
    select: {
      id: true,
      isActive: true,
    },
  });
}

/**
 * Query Objective - buildAdminSceneWhere
 * Summary: Xuất helper where để service list scene có thể tái sử dụng nhất quán.
 */
export function buildSceneWhere(input: {
  search?: string;
  category?: SceneCategory;
  difficulty?: Level;
  isActive?: boolean;
}) {
  return buildAdminSceneWhere(input);
}
