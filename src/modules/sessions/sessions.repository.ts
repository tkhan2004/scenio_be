import {
  Level,
  MessageModality,
  MessageRole,
  Prisma,
  SessionModality,
  SessionSourceType,
  SessionStatus,
  VoiceProvider,
} from '@prisma/client';
import prisma from '../../config/database';

type DbClient = Prisma.TransactionClient | typeof prisma;

const messageSelect = {
  id: true,
  role: true,
  content: true,
  turnIndex: true,
  providerEventId: true,
  modality: true,
  audioStartMs: true,
  audioEndMs: true,
  isFinal: true,
  hasError: true,
  errorType: true,
  originalPhrase: true,
  suggestion: true,
  explanation: true,
  isGood: true,
  isHint: true,
  createdAt: true,
} satisfies Prisma.MessageSelect;

const sessionResultSelect = {
  id: true,
  sourceType: true,
  status: true,
  modality: true,
  providerSessionId: true,
  voiceSnapshotName: true,
  grammarScore: true,
  vocabularyScore: true,
  naturalnessScore: true,
  xpEarned: true,
  hintCount: true,
  startedAt: true,
  endedAt: true,
  voiceProfile: {
    select: {
      id: true,
      displayName: true,
      gender: true,
      locale: true,
      accent: true,
      realtimeVoiceId: true,
    },
  },
  scene: {
    select: {
      id: true,
      title: true,
      category: true,
      difficulty: true,
      description: true,
      characterName: true,
      characterRole: true,
    },
  },
  customPracticeConfig: {
    select: {
      id: true,
      displayTitle: true,
      displaySubtitle: true,
      contextType: true,
      difficulty: true,
      topicSummary: true,
      missionText: true,
      aiDisplayName: true,
      aiRole: true,
      aiBehaviorStyle: true,
      aiGenderPresentation: true,
      aiVoiceTone: true,
      aiAccentPreference: true,
      estimatedMinutes: true,
    },
  },
  messages: {
    orderBy: [
      { turnIndex: 'asc' },
      { createdAt: 'asc' },
    ],
    select: messageSelect,
  },
} satisfies Prisma.SessionSelect;

const sessionContextSelect = {
  id: true,
  sourceType: true,
  status: true,
  modality: true,
  hintCount: true,
  voiceProvider: true,
  voiceSnapshotName: true,
  providerSessionId: true,
  startedAt: true,
  endedAt: true,
  user: {
    select: {
      id: true,
      displayName: true,
      level: true,
      learningGoal: true,
      selfAssessment: true,
    },
  },
  scene: {
    select: {
      id: true,
      title: true,
      category: true,
      description: true,
      missionText: true,
      difficulty: true,
      characterName: true,
      characterRole: true,
      systemPrompt: true,
    },
  },
  customPracticeConfig: {
    select: {
      id: true,
      practiceGoal: true,
      successOutcome: true,
      topicSummary: true,
      contextType: true,
      location: true,
      conversationChannel: true,
      timePressure: true,
      specialConditions: true,
      userRole: true,
      userIntent: true,
      userEnglishLevel: true,
      userPersonaNotes: true,
      aiRole: true,
      aiDisplayName: true,
      aiRelationshipToUser: true,
      aiPrimaryGoal: true,
      aiBehaviorStyle: true,
      aiGenderPresentation: true,
      aiVoiceTone: true,
      aiSpeechSpeed: true,
      aiAccentPreference: true,
      difficulty: true,
      conversationLength: true,
      correctionStyle: true,
      hintFrequency: true,
      responseComplexity: true,
      focusSkills: true,
      mustUseVocabulary: true,
      avoidTopics: true,
      customInstructions: true,
      displayTitle: true,
      displaySubtitle: true,
      missionText: true,
      estimatedMinutes: true,
      openingMessage: true,
      systemPrompt: true,
    },
  },
  voiceProfile: {
    select: {
      id: true,
      displayName: true,
      description: true,
      gender: true,
      locale: true,
      accent: true,
      provider: true,
      providerVoiceId: true,
      realtimeProvider: true,
      realtimeVoiceId: true,
      styleTags: true,
      sampleText: true,
    },
  },
} satisfies Prisma.SessionSelect;

export type SessionMessageRecord = Prisma.MessageGetPayload<{ select: typeof messageSelect }>;
export type SessionResultRecord = Prisma.SessionGetPayload<{ select: typeof sessionResultSelect }>;
export type SessionContextRecord = Prisma.SessionGetPayload<{ select: typeof sessionContextSelect }>;
export type CustomPracticeConfigRecord = Prisma.CustomPracticeConfigGetPayload<{
  select: {
    id: true;
    displayTitle: true;
    displaySubtitle: true;
    contextType: true;
    difficulty: true;
    topicSummary: true;
    missionText: true;
    aiDisplayName: true;
    aiRole: true;
    aiBehaviorStyle: true;
    aiGenderPresentation: true;
    aiVoiceTone: true;
    aiAccentPreference: true;
    estimatedMinutes: true;
  };
}>;

/**
 * Repository - Sessions
 * Summary: Quản lý truy vấn dữ liệu cho level test, voice sessions, transcript sync, result, và abandon flow.
 */

/**
 * Query Objective - findUserById
 * Summary: Lấy thông tin user cần thiết để kiểm tra level test hoặc quyền sở hữu session.
 * Query Shape: findUnique + select các field tối thiểu.
 */
export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      displayName: true,
      level: true,
      learningGoal: true,
      selfAssessment: true,
      needsLevelTest: true,
    },
  });
}

/**
 * Query Objective - findSceneForSessionStart
 * Summary: Lấy scene active cần thiết để tạo session mới và dựng opening message template.
 * Query Shape: findFirst theo id + isActive.
 */
export async function findSceneForSessionStart(sceneId: string) {
  return prisma.scene.findFirst({
    where: {
      id: sceneId,
      isActive: true,
    },
    select: {
      id: true,
      title: true,
      category: true,
      description: true,
      missionText: true,
      difficulty: true,
      characterName: true,
      characterRole: true,
      systemPrompt: true,
    },
  });
}

/**
 * Query Objective - findActiveUserSession
 * Summary: Lấy session ACTIVE gần nhất của user để tránh mở nhiều phiên song song.
 * Query Shape: findFirst theo userId + status ACTIVE.
 */
export async function findActiveUserSession(userId: string) {
  return prisma.session.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
    },
    orderBy: {
      startedAt: 'desc',
    },
    select: {
      id: true,
      sceneId: true,
      sourceType: true,
      customPracticeConfigId: true,
      startedAt: true,
      modality: true,
      scene: {
        select: {
          title: true,
          characterName: true,
        },
      },
      customPracticeConfig: {
        select: {
          displayTitle: true,
          aiDisplayName: true,
        },
      },
    },
  });
}

/**
 * Query Objective - createSession
 * Summary: Tạo bản ghi session mới cho user.
 * Query Shape: create với userId + sceneId + metadata voice/modality.
 */
export async function createSession(
  data: {
    userId: string;
    sceneId?: string | null;
    customPracticeConfigId?: string | null;
    sourceType?: SessionSourceType;
    status?: SessionStatus;
    modality?: SessionModality;
    voiceProfileId?: string | null;
    voiceProvider?: VoiceProvider | null;
    voiceSnapshotName?: string | null;
  },
  db: DbClient = prisma,
) {
  return db.session.create({
    data: {
      userId: data.userId,
      sceneId: data.sceneId,
      customPracticeConfigId: data.customPracticeConfigId ?? null,
      sourceType: data.sourceType ?? 'CURATED_SCENE',
      status: data.status ?? 'ACTIVE',
      modality: data.modality ?? 'TEXT',
      voiceProfileId: data.voiceProfileId ?? null,
      voiceProvider: data.voiceProvider ?? null,
      voiceSnapshotName: data.voiceSnapshotName ?? null,
    },
    select: {
      id: true,
      sourceType: true,
      modality: true,
      voiceProfileId: true,
      voiceSnapshotName: true,
    },
  });
}

/**
 * Query Objective - createCustomPracticeConfig
 * Summary: Lưu cấu hình custom practice đã được chuẩn hóa trước khi tạo session.
 * Query Shape: create một bản ghi custom practice config đầy đủ.
 */
export async function createCustomPracticeConfig(
  data: Prisma.CustomPracticeConfigCreateInput,
  db: DbClient = prisma,
) {
  return db.customPracticeConfig.create({
    data,
    select: {
      id: true,
      displayTitle: true,
      displaySubtitle: true,
      contextType: true,
      difficulty: true,
      topicSummary: true,
      missionText: true,
      aiDisplayName: true,
      aiRole: true,
      aiBehaviorStyle: true,
      aiGenderPresentation: true,
      aiVoiceTone: true,
      aiAccentPreference: true,
      estimatedMinutes: true,
    },
  });
}

/**
 * Query Objective - createMessage
 * Summary: Lưu message transcript hoặc hint thuộc về session.
 * Query Shape: create một bản ghi message với metadata realtime nếu có.
 */
export async function createMessage(
  data: {
    sessionId: string;
    role: MessageRole;
    content: string;
    turnIndex: number;
    providerEventId?: string | null;
    modality?: MessageModality;
    audioStartMs?: number | null;
    audioEndMs?: number | null;
    isFinal?: boolean;
    isHint?: boolean;
  },
  db: DbClient = prisma,
) {
  return db.message.create({
    data: {
      sessionId: data.sessionId,
      role: data.role,
      content: data.content,
      turnIndex: data.turnIndex,
      providerEventId: data.providerEventId ?? null,
      modality: data.modality ?? 'TEXT',
      audioStartMs: data.audioStartMs ?? null,
      audioEndMs: data.audioEndMs ?? null,
      isFinal: data.isFinal ?? true,
      isHint: data.isHint ?? false,
    },
    select: messageSelect,
  });
}

/**
 * Query Objective - findMessageByProviderEventId
 * Summary: Tìm message đã lưu theo providerEventId để xử lý idempotent cho realtime sync.
 * Query Shape: findFirst theo sessionId + providerEventId.
 */
export async function findMessageByProviderEventId(sessionId: string, providerEventId: string) {
  return prisma.message.findFirst({
    where: {
      sessionId,
      providerEventId,
    },
    select: messageSelect,
  });
}

/**
 * Query Objective - findOwnedSessionById
 * Summary: Lấy session của chính user kèm transcript chi tiết cho màn hình result.
 * Query Shape: findFirst theo userId + sessionId + include scene/messages select.
 */
export async function findOwnedSessionById(userId: string, sessionId: string) {
  return prisma.session.findFirst({
    where: {
      id: sessionId,
      userId,
    },
    select: sessionResultSelect,
  });
}

/**
 * Query Objective - findOwnedSessionStatus
 * Summary: Lấy trạng thái hiện tại của một session thuộc user.
 * Query Shape: findFirst theo userId + sessionId + select status tối thiểu.
 */
export async function findOwnedSessionStatus(userId: string, sessionId: string) {
  return prisma.session.findFirst({
    where: {
      id: sessionId,
      userId,
    },
    select: {
      id: true,
      status: true,
      endedAt: true,
    },
  });
}

/**
 * Query Objective - findOwnedSessionContext
 * Summary: Lấy context đầy đủ của session ACTIVE để tạo realtime token hoặc hint.
 * Query Shape: findFirst theo userId + sessionId + include user/scene/voiceProfile.
 */
export async function findOwnedSessionContext(userId: string, sessionId: string) {
  return prisma.session.findFirst({
    where: {
      id: sessionId,
      userId,
    },
    select: sessionContextSelect,
  });
}

/**
 * Query Objective - findRecentMessagesForSession
 * Summary: Lấy transcript gần nhất để build hint hoặc resume context.
 * Query Shape: findMany theo sessionId, orderBy newest first, giới hạn theo limit.
 */
export async function findRecentMessagesForSession(sessionId: string, limit: number) {
  return prisma.message.findMany({
    where: {
      sessionId,
      isFinal: true,
    },
    orderBy: [
      { turnIndex: 'desc' },
      { createdAt: 'desc' },
    ],
    take: limit,
    select: messageSelect,
  });
}

/**
 * Query Objective - findNextTurnIndex
 * Summary: Tìm turnIndex tiếp theo của session để transcript được lưu đúng thứ tự.
 * Query Shape: aggregate max(turnIndex) theo sessionId.
 */
export async function findNextTurnIndex(sessionId: string) {
  const aggregate = await prisma.message.aggregate({
    where: { sessionId },
    _max: { turnIndex: true },
  });

  return (aggregate._max.turnIndex ?? -1) + 1;
}

/**
 * Query Objective - updateSessionById
 * Summary: Cập nhật trạng thái hoặc metadata cho session theo id.
 * Query Shape: update theo sessionId với Prisma.SessionUpdateInput.
 */
export async function updateSessionById(
  sessionId: string,
  data: Prisma.SessionUpdateInput,
  db: DbClient = prisma,
) {
  return db.session.update({
    where: { id: sessionId },
    data,
    select: {
      id: true,
      status: true,
      modality: true,
      providerSessionId: true,
      endedAt: true,
    },
  });
}

/**
 * Query Objective - completeLevelTest
 * Summary: Cập nhật level và đánh dấu user đã hoàn thành level test.
 * Query Shape: update theo userId, set level + needsLevelTest + levelTestedAt.
 */
export async function completeLevelTest(userId: string, level: Level) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      level,
      needsLevelTest: false,
      levelTestedAt: new Date(),
    },
    select: {
      level: true,
      needsLevelTest: true,
      levelTestedAt: true,
    },
  });
}
