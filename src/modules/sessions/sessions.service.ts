import Anthropic from '@anthropic-ai/sdk';
import { AiFeatureType, AiProvider, ErrorType, Level, MessageModality, MessageRole, SceneCategory, SessionModality } from '@prisma/client';
import prisma from '../../config/database';
import { provider } from '../../config/llm';
import {
  AbandonSessionParams,
  CompleteSessionParams,
  CreateRealtimeTokenParams,
  GetSessionResultParams,
  LevelTestHistoryItem,
  LevelTestInput,
  SendSessionMessageInput,
  SendSessionMessageParams,
  StartCustomSessionInput,
  SessionHintInput,
  SessionHintParams,
  StartSessionInput,
} from '../../schemas/sessions';
import * as missionsService from '../missions/missions.service';
import { getAiFeatureRuntimePlan } from '../ai-models/ai-models.service';
import * as learningPlanService from '../learning-plan/learning-plan.service';
import * as usersService from '../users/users.service';
import * as voicesService from '../voices/voices.service';
import * as sessionsEvaluatorService from './sessions.evaluator.service';
import * as sessionsRealtimeService from './sessions.realtime.service';
import * as sessionsRepo from './sessions.repository';
import * as sessionsSpokenCoachingService from './sessions.spoken-coaching.service';
import * as sessionsVoiceLearningService from './sessions.voice-learning.service';

const LEVEL_RESULT_PATTERN = /\[LEVEL_RESULT\]([\s\S]*?)\[\/LEVEL_RESULT\]/;
const LEVEL_VALUES = ['A1', 'A2', 'B1', 'B2'] as const;
const OPENAI_LEVEL_TEST_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const CLAUDE_LEVEL_TEST_MODEL = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';

type ProviderMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type LevelTestResult = {
  aiMessage: string;
  isComplete: boolean;
  level?: (typeof LEVEL_VALUES)[number];
  rationale?: string;
};

type MessageSource = SendSessionMessageInput['source'];
type RuntimeAiModel = Awaited<ReturnType<typeof getAiFeatureRuntimePlan>>['models'][number];
type SessionFeedbackLocale = sessionsEvaluatorService.FeedbackLocale;
type SessionRequestOptions = {
  feedbackLocale?: SessionFeedbackLocale;
};

const MESSAGE_SOURCE_MAP: Record<MessageSource, { role: MessageRole; modality: MessageModality }> = {
  USER_TEXT: { role: MessageRole.USER, modality: MessageModality.TEXT },
  USER_AUDIO: { role: MessageRole.USER, modality: MessageModality.AUDIO_TRANSCRIPT },
  AI_TEXT: { role: MessageRole.AI, modality: MessageModality.TEXT },
  AI_AUDIO: { role: MessageRole.AI, modality: MessageModality.AUDIO_TRANSCRIPT },
};

type SessionCompletionResponse = {
  message?: ReturnType<typeof mapSessionMessage>;
  messages: ReturnType<typeof mapSessionMessage>[];
  session: {
    id: string;
    status: 'COMPLETED';
    endedAt: Date | null;
    xpEarned: number;
    targetTurns: number;
    sourceSummary: ReturnType<typeof getSessionConversationSource>;
  };
  scores: sessionsEvaluatorService.SessionEvaluationResult['scores'];
  evaluation: {
    mode: sessionsEvaluatorService.SessionEvaluationResult['evaluationMode'];
    scores: sessionsEvaluatorService.SessionEvaluationResult['scores'];
  };
  spokenCoaching: ReturnType<typeof sessionsSpokenCoachingService.buildSpokenCoachingSummary>;
  nextLearningAction: ReturnType<typeof buildNextLearningAction>;
  rewards: {
    xpEarned: number;
    totalXp: number;
    streakDays: number;
    missionsCompleted: Awaited<ReturnType<typeof usersService.grantCompletedSessionRewards>>['missionsCompleted'];
  };
};

/**
 * Helper - getLevelTestSystemPrompt
 * Summary: Tạo system prompt chuẩn cho bài test trình độ 5 lượt.
 * Notes: AI phải trả marker [LEVEL_RESULT] ở lượt hoàn thành.
 */
function getLevelTestSystemPrompt() {
  return `You are a friendly English conversation partner named Alex.
Your hidden task is to assess the user's English level (A1, A2, B1, or B2)
through natural conversation. Do not mention you are running a test.

CONVERSATION RULES:
- Start with a simple warm greeting and an easy question
- Ask exactly 5 questions total, gradually increasing complexity
- React naturally to the user's answers with curiosity and short follow-ups
- Keep your own sentences short and clear
- Do NOT correct the user's English during the conversation

QUESTION PROGRESSION:
- Turn 1: Very simple (name, where they are from, what they do)
- Turn 2: Simple present (hobbies, daily routine)
- Turn 3: Past tense (recent experience, last weekend)
- Turn 4: Opinion / preference (compare things, give reasons)
- Turn 5: Hypothetical or future plans

ASSESSMENT CRITERIA:
- A1: Very basic words only, many errors, short sentences
- A2: Simple sentences, common vocabulary, some errors
- B1: Can express ideas, some complex sentences, occasional errors
- B2: Fluent expression, good grammar, varied vocabulary

FINAL RESPONSE FORMAT:
After the 5th user response, end the conversation naturally, then on a NEW LINE append ONLY:
[LEVEL_RESULT]{"level":"B1","rationale":"Có thể diễn đạt ý tưởng rõ ràng, đôi khi còn lỗi nhỏ"}[/LEVEL_RESULT]

Do NOT append the marker before the final assessment.`;
}

/**
 * Helper - getHintSystemPrompt
 * Summary: Tạo prompt sinh hint ngắn, đúng vai và không làm hộ toàn bộ user turn.
 */
function getHintSystemPrompt(args: {
  sceneTitle: string;
  characterName: string;
  characterRole: string;
  missionText: string;
  focus?: string;
}) {
  return `You are a speaking coach for an English roleplay app.

Scene: ${args.sceneTitle}
AI character: ${args.characterName} (${args.characterRole})
Mission: ${args.missionText}
Focus: ${args.focus || 'conversation'}

Rules:
- Give only one short hint in plain English.
- Keep the hint under 22 words.
- Do not answer fully for the learner.
- Do not break the roleplay context.
- Prefer nudging the learner toward the next useful question or sentence.
- Avoid bullet points, labels, or JSON.`;
}

/**
 * Helper - toProviderMessages
 * Summary: Chuyển history từ client sang format message của provider LLM.
 * Notes: Khi turnIndex = 0 và chưa có history, helper tự tạo opening prompt.
 */
function toProviderMessages(
  history: LevelTestHistoryItem[],
  message: string | null | undefined,
  turnIndex: number,
): ProviderMessage[] {
  const messages = history.map<ProviderMessage>((item) => ({
    role: item.role === 'USER' ? 'user' : 'assistant',
    content: item.content,
  }));

  if (message) {
    messages.push({ role: 'user', content: message });
    return messages;
  }

  if (turnIndex === 0 && history.length === 0) {
    return [{ role: 'user', content: 'Start the conversation naturally with a greeting and your first easy question.' }];
  }

  return messages;
}

/**
 * Helper - parseLevelResult
 * Summary: Parse marker [LEVEL_RESULT] từ phản hồi AI khi bài test hoàn tất.
 * Notes: Nếu JSON sai format sẽ throw AI_ENGINE_ERROR để controller trả lỗi chuẩn.
 */
function parseLevelResult(responseText: string) {
  const match = responseText.match(LEVEL_RESULT_PATTERN);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[1]) as { level?: string; rationale?: string };
    if (!parsed.level || !LEVEL_VALUES.includes(parsed.level as (typeof LEVEL_VALUES)[number])) {
      throw new Error('Level test result không hợp lệ');
    }

    return {
      aiMessage: responseText.replace(match[0], '').trim(),
      level: parsed.level as (typeof LEVEL_VALUES)[number],
      rationale: parsed.rationale?.trim() || 'Kết quả được suy ra từ hội thoại 5 lượt.',
    };
  } catch (error) {
    throw Object.assign(new Error('Không thể parse kết quả level test từ AI'), {
      code: 'AI_ENGINE_ERROR',
      status: 502,
    });
  }
}

/**
 * Helper - buildOpeningMessage
 * Summary: Sinh opening message deterministic cho session start trước khi roleplay LLM hoàn thiện.
 * Notes: Giữ tone đơn giản để mobile có thể mở chat ngay cả khi chưa gọi model.
 */
function buildOpeningMessage(scene: NonNullable<Awaited<ReturnType<typeof sessionsRepo.findSceneForSessionStart>>>) {
  const promptByCategory: Record<SceneCategory, string> = {
    WORK: 'Thanks for meeting with me today. Could you start by telling me what you need help with?',
    TRAVEL: 'Welcome. How can I help you with your trip today?',
    DAILY: 'Hi there. What would you like to do today?',
    SOCIAL: 'Nice to see you. What would you like to talk about first?',
  };

  return `Hi, I'm ${scene.characterName}, the ${scene.characterRole}. ${promptByCategory[scene.category]}`;
}

/**
 * Helper - getEstimatedMinutesFromLength
 * Summary: Map conversationLength của custom practice sang estimated minutes cho client.
 */
function getEstimatedMinutesFromLength(conversationLength?: string | null) {
  switch (conversationLength) {
    case 'SHORT':
      return 8;
    case 'LONG':
      return 18;
    case 'MEDIUM':
    default:
      return 12;
  }
}

function getConversationLengthFromMinutes(minutes?: number | null) {
  if (!minutes) return 'MEDIUM';
  if (minutes <= 9) return 'SHORT';
  if (minutes >= 16) return 'LONG';
  return 'MEDIUM';
}

function getTargetTurnsFromLength(conversationLength?: string | null) {
  switch (conversationLength) {
    case 'SHORT':
      return 3;
    case 'LONG':
      return 7;
    case 'MEDIUM':
    default:
      return 5;
  }
}

function getTargetTurnsFromMinutes(minutes?: number | null) {
  if (!minutes) return getTargetTurnsFromLength('MEDIUM');
  return Math.max(3, Math.min(12, Math.round(minutes / 2.5)));
}

function getTargetTurnsForCustomConfig(conversationLength?: string | null, estimatedMinutes?: number | null) {
  if (estimatedMinutes) {
    return getTargetTurnsFromMinutes(estimatedMinutes);
  }

  return getTargetTurnsFromLength(conversationLength);
}

/**
 * Helper - getCustomPracticeDisplayTitle
 * Summary: Tạo title hiển thị gọn cho custom practice session.
 */
function getCustomPracticeDisplayTitle(input: StartCustomSessionInput) {
  const summary = input.topicSummary.trim();
  if (summary.length <= 60) {
    return summary;
  }

  const goal = input.practiceGoal.trim();
  return goal.length <= 60 ? goal : `${goal.slice(0, 57).trimEnd()}...`;
}

/**
 * Helper - getCustomPracticeDisplaySubtitle
 * Summary: Tạo subtitle hiển thị cho review/start response của custom practice.
 */
function getCustomPracticeDisplaySubtitle(input: StartCustomSessionInput) {
  return `You are speaking with ${input.aiPersona.aiDisplayName}, a ${input.aiPersona.aiRole}.`;
}

/**
 * Helper - getCustomPracticeMissionText
 * Summary: Chuẩn hóa mission text của custom practice từ successOutcome hoặc practiceGoal.
 */
function getCustomPracticeMissionText(input: StartCustomSessionInput) {
  return input.successOutcome?.trim() || input.practiceGoal.trim();
}

/**
 * Helper - getCustomPracticeOpeningMessage
 * Summary: Sinh opening message deterministic cho custom practice mà chưa cần LLM orchestration.
 */
function getCustomPracticeOpeningMessage(input: StartCustomSessionInput) {
  const displayName = input.aiPersona.aiDisplayName.trim() || 'your conversation partner';
  const channelLine = input.context.conversationChannel === 'PHONE_CALL'
    ? 'Thanks for taking my call.'
    : input.context.conversationChannel === 'VIDEO_CALL'
      ? 'Thanks for joining this call.'
      : 'Thanks for meeting with me.';

  const firstQuestion = input.context.contextType === 'INTERVIEW'
    ? 'Could you start by introducing yourself?'
    : input.context.contextType === 'CUSTOMER_SERVICE'
      ? 'How can I help you today?'
      : input.context.contextType === 'PHONE_CALL'
        ? 'What would you like to discuss first?'
        : 'How would you like to begin?';

  return `Hi, I'm ${displayName}. ${channelLine} ${firstQuestion}`;
}

/**
 * Helper - getCustomPracticeSystemPrompt
 * Summary: Tạo system prompt có cấu trúc cho custom practice session.
 */
function getCustomPracticeSystemPrompt(input: StartCustomSessionInput) {
  const difficulty = input.learningConfig.difficulty || input.userProfile.userEnglishLevel || Level.A2;
  const specialConditions = input.context.specialConditions.length > 0
    ? input.context.specialConditions.join(', ')
    : 'none';
  const focusSkills = input.learningConfig.focusSkills.length > 0
    ? input.learningConfig.focusSkills.join(', ')
    : 'general communication';
  const mustUseVocabulary = input.learningConfig.mustUseVocabulary.length > 0
    ? input.learningConfig.mustUseVocabulary.join(', ')
    : 'none';
  const avoidTopics = input.learningConfig.avoidTopics.length > 0
    ? input.learningConfig.avoidTopics.join(', ')
    : 'none';

  return `You are roleplaying as ${input.aiPersona.aiDisplayName}, a conversation partner whose role/context may be described by the setup below.

Conversation setup:
- Practice goal: ${input.practiceGoal}
- Success outcome: ${input.successOutcome?.trim() || input.practiceGoal}
- Topic summary: ${input.topicSummary}
- Context type: ${input.context.contextType}
- Location: ${input.context.location?.trim() || 'not specified'}
- Conversation channel: ${input.context.conversationChannel}
- Time pressure: ${input.context.timePressure || 'MEDIUM'}
- Special conditions: ${specialConditions}

Learner setup:
- Learner role: ${input.userProfile.userRole}
- Learner intent: ${input.userProfile.userIntent?.trim() || 'not specified'}
- Learner English level: ${input.userProfile.userEnglishLevel || difficulty}
- Learner notes: ${input.userProfile.userPersonaNotes?.trim() || 'none'}

Your persona:
- Relationship to learner: ${input.aiPersona.aiRelationshipToUser || 'not specified'}
- Primary goal: ${input.aiPersona.aiPrimaryGoal?.trim() || 'help the learner practice naturally'}
- Behavior style: ${input.aiPersona.aiBehaviorStyle?.trim() || 'natural and believable'}
- Gender presentation: ${input.aiPersona.aiGenderPresentation}
- Voice tone: ${input.aiPersona.aiVoiceTone || 'balanced'}
- Speech speed: ${input.aiPersona.aiSpeechSpeed || 'NORMAL'}
- Accent preference: ${input.aiPersona.aiAccentPreference?.trim() || 'neutral'}

Coaching rules:
- Difficulty target: ${difficulty}
- Conversation length: ${input.learningConfig.conversationLength || getConversationLengthFromMinutes(input.learningConfig.targetMinutes)}
- Target duration: ${input.learningConfig.targetMinutes || getEstimatedMinutesFromLength(input.learningConfig.conversationLength)} minutes
- Correction style: ${input.learningConfig.correctionStyle || 'END_ONLY'}
- Hint frequency: ${input.learningConfig.hintFrequency || 'LOW'}
- Response complexity: ${input.learningConfig.responseComplexity || 'BALANCED'}
- Focus skills: ${focusSkills}
- Must-use vocabulary: ${mustUseVocabulary}
- Avoid topics: ${avoidTopics}
- Extra instructions: ${input.learningConfig.customInstructions?.trim() || 'none'}

Scenio session rules:
- Stay in character at all times.
- Speak only in English unless the system explicitly asks otherwise.
- If any setup field is written in Vietnamese or another language, silently interpret it and speak in natural English only.
- Keep responses concise, natural, and appropriate for the learner level.
- Move the conversation toward the learner's goal naturally.
- Be believable as a real conversation partner, not a generic tutor.
- Only give explicit correction if the configured correction style allows it.`;
}

function getActiveSessionConflictDetails(
  activeSession: Awaited<ReturnType<typeof sessionsRepo.findActiveUserSession>>,
) {
  if (!activeSession) return [];

  const title = activeSession.sourceType === 'CUSTOM_PRACTICE'
    ? activeSession.customPracticeConfig?.displayTitle ?? 'Custom Practice'
    : activeSession.scene?.title ?? 'Unknown Scene';
  const characterName = activeSession.sourceType === 'CUSTOM_PRACTICE'
    ? activeSession.customPracticeConfig?.aiDisplayName ?? 'AI'
    : activeSession.scene?.characterName ?? 'AI';
  const targetTurns = activeSession.sourceType === 'CUSTOM_PRACTICE'
    ? getTargetTurnsForCustomConfig(
        activeSession.customPracticeConfig?.conversationLength,
        activeSession.customPracticeConfig?.estimatedMinutes,
      )
    : 3;

  return [
    { field: 'activeSession.id', message: activeSession.id },
    { field: 'activeSession.sourceType', message: activeSession.sourceType },
    { field: 'activeSession.sceneId', message: activeSession.sceneId ?? '' },
    { field: 'activeSession.customPracticeConfigId', message: activeSession.customPracticeConfigId ?? '' },
    { field: 'activeSession.sceneTitle', message: title },
    { field: 'activeSession.characterName', message: characterName },
    { field: 'activeSession.startedAt', message: activeSession.startedAt.toISOString() },
    { field: 'activeSession.targetTurns', message: String(targetTurns) },
  ];
}

function getSessionConversationSource(
  session: sessionsRepo.SessionContextRecord,
) {
  if (session.sourceType === 'CUSTOM_PRACTICE' && session.customPracticeConfig) {
    return {
      id: session.customPracticeConfig.id,
      title: session.customPracticeConfig.displayTitle,
      category: session.customPracticeConfig.contextType,
      difficulty: session.customPracticeConfig.difficulty,
      description: session.customPracticeConfig.topicSummary,
      missionText: session.customPracticeConfig.missionText,
      characterName: session.customPracticeConfig.aiDisplayName,
      characterRole: session.customPracticeConfig.aiRole,
      systemPrompt: session.customPracticeConfig.systemPrompt,
    };
  }

  if (!session.scene) {
    throw Object.assign(new Error('Session hiện không có source context hợp lệ'), {
      code: 'SESSION_SOURCE_INVALID',
      status: 500,
    });
  }

  return {
    id: session.scene.id,
    title: session.scene.title,
    category: session.scene.category,
    difficulty: session.scene.difficulty,
    description: session.scene.description,
    missionText: session.scene.missionText,
    characterName: session.scene.characterName,
    characterRole: session.scene.characterRole,
    systemPrompt: session.scene.systemPrompt,
  };
}

function getSessionResultSource(
  session: sessionsRepo.SessionResultRecord,
) {
  if (session.sourceType === 'CUSTOM_PRACTICE' && session.customPracticeConfig) {
    return {
      title: session.customPracticeConfig.displayTitle,
      category: session.customPracticeConfig.contextType,
      difficulty: session.customPracticeConfig.difficulty,
      description: session.customPracticeConfig.topicSummary,
      missionText: session.customPracticeConfig.missionText,
      estimatedMinutes: session.customPracticeConfig.estimatedMinutes,
      characterName: session.customPracticeConfig.aiDisplayName,
      characterRole: session.customPracticeConfig.aiRole,
    };
  }

  if (!session.scene) {
    throw Object.assign(new Error('Session result hiện không có source context hợp lệ'), {
      code: 'SESSION_SOURCE_INVALID',
      status: 500,
    });
  }

  return {
    title: session.scene.title,
    category: session.scene.category,
    difficulty: session.scene.difficulty,
    description: session.scene.description,
    missionText: session.scene.missionText,
    estimatedMinutes: session.scene.estimatedMinutes,
    characterName: session.scene.characterName,
    characterRole: session.scene.characterRole,
  };
}

/**
 * Helper - mapSessionMessage
 * Summary: Chuẩn hóa message transcript cho endpoint result và sync response.
 */
function mapSessionMessage(message: sessionsRepo.SessionMessageRecord | sessionsRepo.SessionResultRecord['messages'][number]) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    turnIndex: message.turnIndex,
    providerEventId: message.providerEventId,
    modality: message.modality,
    audioStartMs: message.audioStartMs,
    audioEndMs: message.audioEndMs,
    isFinal: message.isFinal,
    hasError: message.hasError,
    errorType: message.errorType,
    originalPhrase: message.originalPhrase,
    suggestion: message.suggestion,
    explanation: message.explanation,
    isGood: message.isGood,
    feedbackDetails: message.feedbackDetails,
    isHint: message.isHint,
    createdAt: message.createdAt,
  };
}

/**
 * Helper - getTodayDateString
 * Summary: Trả về ngày hiện tại dạng YYYY-MM-DD để reward flow dùng chung với missions/users.
 */
function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function extractIssueSubtypes(feedbackDetails: unknown) {
  if (!feedbackDetails || typeof feedbackDetails !== 'object' || !('issues' in feedbackDetails)) {
    return [] as string[];
  }

  const issues = (feedbackDetails as { issues?: unknown }).issues;
  if (!Array.isArray(issues)) {
    return [] as string[];
  }

  return issues
    .map((issue) => {
      if (!issue || typeof issue !== 'object' || !('subtype' in issue)) {
        return null;
      }

      const subtype = (issue as { subtype?: unknown }).subtype;
      return typeof subtype === 'string' ? subtype : null;
    })
    .filter((subtype): subtype is string => Boolean(subtype));
}

function buildNextLearningAction(input: {
  scores: {
    grammar: number | null;
    vocabulary: number | null;
    naturalness: number | null;
  };
  feedbackItems: Array<{
    hasError: boolean | null;
    errorType: ErrorType | null;
    subtypes?: string[];
  }>;
  sourceTitle?: string | null;
}) {
  const scoreEntries = [
    { key: 'grammar' as const, value: input.scores.grammar },
    { key: 'vocabulary' as const, value: input.scores.vocabulary },
    { key: 'naturalness' as const, value: input.scores.naturalness },
  ].filter((item): item is { key: 'grammar' | 'vocabulary' | 'naturalness'; value: number } => (
    typeof item.value === 'number'
  ));

  if (scoreEntries.length === 0) return null;

  const weakest = scoreEntries.reduce((min, item) => (item.value < min.value ? item : min), scoreEntries[0]);
  const issueCounts = input.feedbackItems.reduce(
    (acc, item) => {
      if (!item.hasError || !item.errorType) return acc;
      acc[item.errorType] += 1;
      return acc;
    },
    {
      [ErrorType.GRAMMAR]: 0,
      [ErrorType.VOCABULARY]: 0,
      [ErrorType.NATURALNESS]: 0,
    },
  );
  const nonEnglishCount = input.feedbackItems.filter((item) => (
    item.hasError && item.subtypes?.includes('NON_ENGLISH_RESPONSE')
  )).length;

  if (nonEnglishCount > 0) {
    return {
      type: 'ENGLISH_ONLY_RETRY',
      focus: 'NATURALNESS',
      title: 'Retry this scene fully in English',
      reason: `Detected ${nonEnglishCount} reply/replies that were not in English.`,
      ctaLabel: 'Retry in English',
      suggestedSceneQuery: input.sourceTitle ? `${input.sourceTitle} beginner english speaking` : 'beginner english speaking practice',
    };
  }

  if (weakest.key === 'grammar') {
    return {
      type: 'GRAMMAR_PRACTICE',
      focus: 'GRAMMAR',
      title: 'Practice cleaner sentence structure',
      reason: `Grammar is your lowest score (${weakest.value}) with ${issueCounts.GRAMMAR} grammar issue(s).`,
      ctaLabel: 'Practice grammar',
      suggestedSceneQuery: input.sourceTitle ? `${input.sourceTitle} grammar follow-up` : 'grammar roleplay practice',
    };
  }

  if (weakest.key === 'vocabulary') {
    return {
      type: 'VOCABULARY_REVIEW',
      focus: 'VOCABULARY',
      title: 'Review useful words and phrases',
      reason: `Vocabulary is your lowest score (${weakest.value}) with ${issueCounts.VOCABULARY} vocabulary issue(s).`,
      ctaLabel: 'Review vocabulary',
      suggestedSceneQuery: input.sourceTitle ? `${input.sourceTitle} useful phrases` : 'vocabulary roleplay practice',
    };
  }

  return {
    type: 'NATURALNESS_RETRY',
    focus: 'NATURALNESS',
    title: 'Try a more natural reply',
    reason: `Naturalness is your lowest score (${weakest.value}) with ${issueCounts.NATURALNESS} naturalness issue(s).`,
    ctaLabel: 'Try again',
    suggestedSceneQuery: input.sourceTitle ? `${input.sourceTitle} natural conversation` : 'natural conversation practice',
  };
}

/**
 * Helper - assertSessionCanBeCompleted
 * Summary: Kiểm tra session còn ACTIVE và có đủ transcript tối thiểu để chấm điểm.
 * Notes: Giữ rule completion ở backend để client không hoàn tất session rỗng.
 */
function assertSessionCanBeCompleted(
  session: sessionsRepo.SessionContextRecord,
  finalMessages: sessionsRepo.SessionMessageRecord[],
) {
  if (session.status !== 'ACTIVE') {
    throw Object.assign(new Error('Chỉ có thể hoàn tất session đang ACTIVE'), {
      code: 'SESSION_NOT_ACTIVE',
      status: 409,
    });
  }

  const finalUserMessages = finalMessages.filter((message) => message.role === MessageRole.USER && !message.isHint);
  if (finalUserMessages.length === 0) {
    throw Object.assign(new Error('Session chưa có đủ transcript của người học để chấm điểm'), {
      code: 'SESSION_TRANSCRIPT_INSUFFICIENT',
      status: 409,
    });
  }
}

/**
 * Helper - completeSessionWithEvaluation
 * Summary: Chốt transcript final, chấm điểm bằng evaluator, rồi grant rewards trong cùng flow backend.
 * Notes: Dùng chung cho endpoint /message legacy và endpoint /complete mới.
 */
async function completeSessionWithEvaluation(
  userId: string,
  session: sessionsRepo.SessionContextRecord,
  responseMessage?: sessionsRepo.SessionMessageRecord,
  options: SessionRequestOptions = {},
): Promise<SessionCompletionResponse> {
  const finalMessages = await sessionsRepo.findFinalMessagesForSession(session.id);
  assertSessionCanBeCompleted(session, finalMessages);
  const feedbackLocale = options.feedbackLocale ?? 'vi';

  const evaluation = await sessionsEvaluatorService.evaluateCompletedSession({
    session,
    messages: finalMessages,
    feedbackLocale,
  });
  const spokenCoaching = sessionsSpokenCoachingService.buildSpokenCoachingSummary({
    session: {
      hintCount: session.hintCount,
      modality: session.modality,
      voiceProvider: session.voiceProvider,
      providerSessionId: session.providerSessionId,
      voiceSnapshotName: session.voiceSnapshotName,
    },
    messages: finalMessages.map((message) => {
      const feedback = evaluation.feedback.find((item) => item.messageId === message.id);
      return {
        ...message,
        hasError: feedback?.hasError ?? message.hasError,
        errorType: feedback?.errorType ?? message.errorType,
        suggestion: feedback?.suggestion ?? message.suggestion,
        explanation: feedback?.explanation ?? message.explanation,
        isGood: feedback?.isGood ?? message.isGood,
      };
    }),
    scores: {
      grammar: evaluation.scores.grammar,
      vocabulary: evaluation.scores.vocabulary,
      naturalness: evaluation.scores.naturalness,
    },
    aiCoaching: evaluation.coaching,
    locale: feedbackLocale,
  });
  const today = getTodayDateString();

  await missionsService.ensureTodayMissions(userId, today);

  const completion = await prisma.$transaction(async (tx) => {
    let updatedResponseMessage = responseMessage ?? null;

    for (const feedback of evaluation.feedback) {
      const updatedMessage = await sessionsRepo.updateMessageFeedbackById(
        feedback.messageId,
        {
          hasError: feedback.hasError,
          errorType: feedback.errorType,
          originalPhrase: feedback.originalPhrase,
          suggestion: feedback.suggestion,
          explanation: feedback.explanation,
          isGood: feedback.isGood,
          feedbackDetails: feedback.feedbackDetails,
        },
        tx,
      );

      if (updatedResponseMessage && updatedMessage.id === updatedResponseMessage.id) {
        updatedResponseMessage = updatedMessage;
      }
    }

    const updatedSession = await sessionsRepo.updateSessionById(
      session.id,
      {
        status: 'COMPLETED',
        endedAt: new Date(),
        grammarScore: evaluation.scores.grammar,
        vocabularyScore: evaluation.scores.vocabulary,
        naturalnessScore: evaluation.scores.naturalness,
        xpEarned: evaluation.xpEarned,
      },
      tx,
    );

    const rewards = await usersService.grantCompletedSessionRewards(userId, session.id, tx, today);

    return {
      message: updatedResponseMessage,
      session: updatedSession,
      rewards,
    };
  });

  await learningPlanService.updatePlanAfterSessionComplete(userId, {
    sceneId: session.sceneId,
    scores: evaluation.scores,
    feedbackItems: evaluation.feedback.map((item) => ({
      hasError: item.hasError,
      errorType: item.errorType,
      subtypes: item.feedbackDetails.issues.map((issue) => issue.subtype).filter((subtype): subtype is string => Boolean(subtype)),
    })),
  });

  return {
    ...(completion.message ? { message: mapSessionMessage(completion.message) } : {}),
    messages: finalMessages.map(mapSessionMessage),
    session: {
      id: session.id,
      status: 'COMPLETED',
      endedAt: completion.session.endedAt,
      xpEarned: evaluation.xpEarned,
      targetTurns: session.sourceType === 'CUSTOM_PRACTICE'
        ? getTargetTurnsForCustomConfig(
            session.customPracticeConfig?.conversationLength,
            session.customPracticeConfig?.estimatedMinutes,
          )
        : 3,
      sourceSummary: getSessionConversationSource(session),
    },
    scores: evaluation.scores,
    evaluation: {
      mode: evaluation.evaluationMode,
      scores: evaluation.scores,
    },
    spokenCoaching,
    nextLearningAction: buildNextLearningAction({
      scores: evaluation.scores,
      feedbackItems: evaluation.feedback.map((item) => ({
        hasError: item.hasError,
        errorType: item.errorType,
        subtypes: item.feedbackDetails.issues.map((issue) => issue.subtype).filter((subtype): subtype is string => Boolean(subtype)),
      })),
      sourceTitle: getSessionConversationSource(session).title,
    }),
    rewards: {
      xpEarned: evaluation.xpEarned,
      totalXp: completion.rewards.totalXp,
      streakDays: completion.rewards.streakDays,
      missionsCompleted: completion.rewards.missionsCompleted,
    },
  };
}

/**
 * Helper - callTextProvider
 * Summary: Gọi Claude hoặc OpenAI để sinh ra một đoạn text theo system prompt hiện tại.
 * Notes: Dùng chung cho level test và session hint.
 */
async function callTextProvider(args: {
  systemPrompt: string;
  messages: ProviderMessage[];
  temperature: number;
  maxTokens: number;
}) {
  const plan = await getAiFeatureRuntimePlan(AiFeatureType.ROLEPLAY_LLM);
  const models = plan.models.length > 0
    ? plan.models
    : [getEnvDefaultTextModel()];
  const errors: string[] = [];

  for (const model of models) {
    try {
      return await callRuntimeTextModel(model, args);
    } catch (error: any) {
      errors.push(`${model.provider}/${model.modelId}: ${error?.message ?? 'unknown error'}`);
    }
  }

  throw Object.assign(new Error('Không thể gọi AI engine từ primary hoặc fallback models'), {
    code: 'AI_ENGINE_ERROR',
    status: 502,
    details: errors.map((message) => ({ field: 'fallback', message })),
  });
}

function getEnvDefaultTextModel(): RuntimeAiModel {
  return {
    id: 'env-default-roleplay',
    featureType: AiFeatureType.ROLEPLAY_LLM,
    provider: provider === 'claude' ? AiProvider.ANTHROPIC : AiProvider.OPENAI,
    modelId: provider === 'claude' ? CLAUDE_LEVEL_TEST_MODEL : OPENAI_LEVEL_TEST_MODEL,
    displayName: 'Environment default roleplay model',
    description: null,
    inputModalities: ['TEXT'],
    outputType: 'TEXT',
    dimensionOptions: [],
    defaultDimension: null,
    config: null,
    isActive: true,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function getRequiredProviderApiKey(providerName: AiProvider) {
  const envName = providerName === AiProvider.ANTHROPIC
    ? 'CLAUDE_API_KEY'
    : providerName === AiProvider.GOOGLE
      ? 'GEMINI_API_KEY'
      : 'OPENAI_API_KEY';
  const value = process.env[envName]?.trim();
  const isPlaceholder =
    !value ||
    value.includes('replace-with-your-key') ||
    value.includes('replace_with_your_key') ||
    value.startsWith('your_') ||
    value.startsWith('sk-replace');

  if (isPlaceholder) {
    throw new Error(`Thiếu ${envName} hợp lệ`);
  }

  return value;
}

async function callRuntimeTextModel(model: RuntimeAiModel, args: {
  systemPrompt: string;
  messages: ProviderMessage[];
  temperature: number;
  maxTokens: number;
}) {
  try {
    if (model.provider === AiProvider.ANTHROPIC) {
      const anthropic = new Anthropic({ apiKey: getRequiredProviderApiKey(AiProvider.ANTHROPIC) });
      const response = await anthropic.messages.create({
        model: model.modelId,
        max_tokens: args.maxTokens,
        temperature: args.temperature,
        system: args.systemPrompt,
        messages: args.messages,
      });

      const text = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
        .trim();

      if (!text) {
        throw new Error('Claude không trả về nội dung');
      }

      return text;
    }

    if (model.provider === AiProvider.GOOGLE) {
      return callGeminiTextModel(model.modelId, args);
    }

    return callOpenAiTextModel(model.modelId, args);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && 'status' in error) {
      throw error;
    }

    throw Object.assign(new Error('Không thể gọi AI engine'), {
      code: 'AI_ENGINE_ERROR',
      status: 502,
      details: error instanceof Error ? [{ field: 'provider', message: error.message }] : null,
    });
  }
}

async function callOpenAiTextModel(modelId: string, args: {
  systemPrompt: string;
  messages: ProviderMessage[];
  temperature: number;
  maxTokens: number;
}) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getRequiredProviderApiKey(AiProvider.OPENAI)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      temperature: args.temperature,
      max_output_tokens: args.maxTokens,
      input: [
        { role: 'system', content: args.systemPrompt },
        ...args.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `OpenAI tra loi ${response.status}`);
  }

  const text = payload?.output_text
    ?? payload?.output?.flatMap((item: any) => item.content ?? [])
      .map((content: any) => content.text ?? content.output_text ?? '')
      .join('\n')
      .trim();

  if (!text) {
    throw new Error('OpenAI không trả về nội dung');
  }

  return text;
}

async function callGeminiTextModel(modelId: string, args: {
  systemPrompt: string;
  messages: ProviderMessage[];
  temperature: number;
  maxTokens: number;
}) {
  const baseUrl = (process.env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/models/${modelId}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': getRequiredProviderApiKey(AiProvider.GOOGLE),
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: args.systemPrompt }],
      },
      contents: args.messages.map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      })),
      generationConfig: {
        temperature: args.temperature,
        maxOutputTokens: args.maxTokens,
      },
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `Gemini tra loi ${response.status}`);
  }

  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part: any) => part.text ?? '')
    .join('\n')
    .trim();

  if (!text) {
    throw new Error('Gemini không trả về nội dung');
  }

  return text;
}

/**
 * Helper - generateLevelTestReply
 * Summary: Gọi provider text để sinh phản hồi cho level test.
 */
async function generateLevelTestReply(messages: ProviderMessage[]) {
  return callTextProvider({
    systemPrompt: getLevelTestSystemPrompt(),
    messages,
    temperature: 0.4,
    maxTokens: 400,
  });
}

/**
 * Helper - buildHintFallback
 * Summary: Sinh hint deterministic khi provider text chưa sẵn sàng hoặc lỗi runtime.
 */
function buildHintFallback(args: {
  characterName: string;
  characterRole: string;
  missionText: string;
  focus?: string;
}) {
  if (args.focus === 'pronunciation') {
    return 'Speak a little slower and keep each word clear before you continue.';
  }

  if (args.focus === 'grammar') {
    return 'Try one short sentence with a clear subject, verb, and question for the next turn.';
  }

  if (args.focus === 'vocabulary') {
    return `Use one keyword from the mission and ask ${args.characterName} for more detail.`;
  }

  return `Ask ${args.characterName}, the ${args.characterRole}, one short question that moves the mission forward.`;
}

/**
 * Function Objective - runLevelTest
 * Summary: Xử lý một lượt level test cho user hiện tại.
 * Inputs: userId và payload level test đã validate.
 * Behavior: Kiểm tra trạng thái user -> gọi AI -> parse marker -> update level nếu hoàn tất.
 * Returns: AI message, cờ isComplete, và level/rationale nếu bài test đã xong.
 */
export async function runLevelTest(userId: string, input: LevelTestInput): Promise<LevelTestResult> {
  const user = await sessionsRepo.findUserById(userId);
  if (!user) {
    throw Object.assign(new Error('Người dùng không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  if (!user.needsLevelTest) {
    throw Object.assign(new Error('Người dùng đã hoàn thành level test'), {
      code: 'LEVEL_TEST_ALREADY_COMPLETED',
      status: 409,
    });
  }

  const reply = await generateLevelTestReply(
    toProviderMessages(input.history, input.message, input.turnIndex),
  );

  const parsed = parseLevelResult(reply);
  if (!parsed) {
    return {
      aiMessage: reply,
      isComplete: false,
    };
  }

  await sessionsRepo.completeLevelTest(userId, parsed.level);

  return {
    aiMessage: parsed.aiMessage,
    isComplete: true,
    level: parsed.level,
    rationale: parsed.rationale,
  };
}

/**
 * Function Objective - startSession
 * Summary: Tạo session ACTIVE mới với voice selection và opening message deterministic.
 * Inputs: userId từ access token, sceneId, optional voiceProfileId và modality.
 * Behavior: Kiểm tra user/scene tồn tại -> resolve voice -> chặn session ACTIVE song song -> tạo session + opening message.
 * Returns: sessionId mới, openingMessage, modality, và selectedVoice để client mở màn practice.
 */
export async function startSession(userId: string, input: StartSessionInput) {
  const [user, scene, activeSession, resolvedVoice] = await Promise.all([
    sessionsRepo.findUserById(userId),
    sessionsRepo.findSceneForSessionStart(input.sceneId),
    sessionsRepo.findActiveUserSession(userId),
    voicesService.resolveVoiceSelection(input.sceneId, input.voiceProfileId),
  ]);

  if (!user) {
    throw Object.assign(new Error('Người dùng không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  if (!scene) {
    throw Object.assign(new Error('Kịch bản không tồn tại'), { code: 'SCENE_NOT_FOUND', status: 404 });
  }

  if (activeSession) {
    throw Object.assign(new Error('Bạn đang có một phiên học chưa hoàn thành'), {
      code: 'SESSION_ALREADY_ACTIVE',
      status: 409,
      details: getActiveSessionConflictDetails(activeSession),
    });
  }

  const selectedVoice = resolvedVoice.voice;
  const openingMessage = buildOpeningMessage(scene);

  const createdSession = await prisma.$transaction(async (tx) => {
    const session = await sessionsRepo.createSession(
      {
        userId,
        sceneId: scene.id,
        sourceType: 'CURATED_SCENE',
        modality: input.modality ?? SessionModality.TEXT,
        voiceProfileId: selectedVoice.id,
        voiceProvider: selectedVoice.realtimeProvider,
        voiceSnapshotName: selectedVoice.displayName,
      },
      tx,
    );

    await sessionsRepo.createMessage(
      {
        sessionId: session.id,
        role: MessageRole.AI,
        content: openingMessage,
        turnIndex: 0,
        modality: MessageModality.TEXT,
      },
      tx,
    );

    return session;
  });

  return {
    sessionId: createdSession.id,
    sourceType: createdSession.sourceType,
    openingMessage,
    modality: createdSession.modality,
    targetTurns: 3,
    selectedVoice: {
      id: selectedVoice.id,
      displayName: selectedVoice.displayName,
      gender: selectedVoice.gender,
      locale: selectedVoice.locale,
      accent: selectedVoice.accent,
      realtimeVoiceId: selectedVoice.realtimeVoiceId,
    },
    voiceSelection: resolvedVoice.policy,
  };
}

/**
 * Function Objective - startCustomSession
 * Summary: Tạo custom practice session từ structured brief thay vì scene có sẵn.
 * Inputs: userId từ access token và payload custom practice đã validate.
 * Behavior: Kiểm tra user -> resolve voice -> chặn session ACTIVE song song -> lưu custom config + session + opening message.
 * Returns: sessionId mới, custom practice summary, openingMessage, modality, và selectedVoice.
 */
export async function startCustomSession(userId: string, input: StartCustomSessionInput) {
  const [user, activeSession, resolvedVoice] = await Promise.all([
    sessionsRepo.findUserById(userId),
    sessionsRepo.findActiveUserSession(userId),
    voicesService.resolveCustomPracticeVoiceSelection(
      input.aiPersona.aiVoicePresetId,
      input.aiPersona.aiGenderPresentation,
      input.aiPersona.aiAccentPreference,
      input.aiPersona.aiVoiceTone,
    ),
  ]);

  if (!user) {
    throw Object.assign(new Error('Người dùng không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  if (activeSession) {
    throw Object.assign(new Error('Bạn đang có một phiên học chưa hoàn thành'), {
      code: 'SESSION_ALREADY_ACTIVE',
      status: 409,
      details: getActiveSessionConflictDetails(activeSession),
    });
  }

  const selectedVoice = resolvedVoice.voice;
  const difficulty = input.learningConfig.difficulty || input.userProfile.userEnglishLevel || user.level || Level.A2;
  const conversationLength = input.learningConfig.conversationLength
    ?? getConversationLengthFromMinutes(input.learningConfig.targetMinutes);
  const displayTitle = getCustomPracticeDisplayTitle(input);
  const displaySubtitle = getCustomPracticeDisplaySubtitle(input);
  const missionText = getCustomPracticeMissionText(input);
  const estimatedMinutes = input.learningConfig.targetMinutes
    ?? getEstimatedMinutesFromLength(conversationLength);
  const targetTurns = getTargetTurnsFromMinutes(estimatedMinutes);
  const openingMessage = getCustomPracticeOpeningMessage(input);
  const systemPrompt = getCustomPracticeSystemPrompt(input);

  const createdSession = await prisma.$transaction(async (tx) => {
    const customConfig = await sessionsRepo.createCustomPracticeConfig(
      {
        user: { connect: { id: userId } },
        practiceGoal: input.practiceGoal.trim(),
        successOutcome: input.successOutcome?.trim(),
        topicSummary: input.topicSummary.trim(),
        contextType: input.context.contextType,
        location: input.context.location?.trim(),
        conversationChannel: input.context.conversationChannel,
        timePressure: input.context.timePressure ?? null,
        specialConditions: input.context.specialConditions,
        userRole: input.userProfile.userRole.trim(),
        userIntent: input.userProfile.userIntent?.trim(),
        userEnglishLevel: input.userProfile.userEnglishLevel,
        userPersonaNotes: input.userProfile.userPersonaNotes?.trim(),
        aiRole: input.aiPersona.aiRole.trim(),
        aiDisplayName: input.aiPersona.aiDisplayName.trim(),
        aiRelationshipToUser: input.aiPersona.aiRelationshipToUser ?? null,
        aiPrimaryGoal: input.aiPersona.aiPrimaryGoal?.trim(),
        aiBehaviorStyle: input.aiPersona.aiBehaviorStyle?.trim(),
        aiGenderPresentation: input.aiPersona.aiGenderPresentation,
        aiVoicePreset: input.aiPersona.aiVoicePresetId
          ? { connect: { id: input.aiPersona.aiVoicePresetId } }
          : undefined,
        aiVoiceTone: input.aiPersona.aiVoiceTone ?? null,
        aiSpeechSpeed: input.aiPersona.aiSpeechSpeed ?? null,
        aiAccentPreference: input.aiPersona.aiAccentPreference?.trim(),
        difficulty,
        conversationLength,
        correctionStyle: input.learningConfig.correctionStyle ?? null,
        hintFrequency: input.learningConfig.hintFrequency ?? null,
        responseComplexity: input.learningConfig.responseComplexity ?? null,
        focusSkills: input.learningConfig.focusSkills,
        mustUseVocabulary: input.learningConfig.mustUseVocabulary,
        avoidTopics: input.learningConfig.avoidTopics,
        customInstructions: input.learningConfig.customInstructions?.trim(),
        displayTitle,
        displaySubtitle,
        missionText,
        estimatedMinutes,
        openingMessage,
        systemPrompt,
      },
      tx,
    );

    const session = await sessionsRepo.createSession(
      {
        userId,
        customPracticeConfigId: customConfig.id,
        sourceType: 'CUSTOM_PRACTICE',
        modality: input.modality ?? SessionModality.TEXT,
        voiceProfileId: selectedVoice.id,
        voiceProvider: selectedVoice.realtimeProvider,
        voiceSnapshotName: selectedVoice.displayName,
      },
      tx,
    );

    await sessionsRepo.createMessage(
      {
        sessionId: session.id,
        role: MessageRole.AI,
        content: openingMessage,
        turnIndex: 0,
        modality: MessageModality.TEXT,
      },
      tx,
    );

    return {
      session,
      customConfig,
    };
  });

  return {
    sessionId: createdSession.session.id,
    sourceType: createdSession.session.sourceType,
    openingMessage,
    modality: createdSession.session.modality,
    targetTurns,
    customPractice: {
      id: createdSession.customConfig.id,
      displayTitle: createdSession.customConfig.displayTitle,
      displaySubtitle: createdSession.customConfig.displaySubtitle,
      contextType: createdSession.customConfig.contextType,
      difficulty: createdSession.customConfig.difficulty,
      conversationLength,
      targetMinutes: createdSession.customConfig.estimatedMinutes,
      topicSummary: createdSession.customConfig.topicSummary,
      missionText: createdSession.customConfig.missionText,
      estimatedMinutes: createdSession.customConfig.estimatedMinutes,
      aiPersona: {
        displayName: createdSession.customConfig.aiDisplayName,
        role: createdSession.customConfig.aiRole,
        behaviorStyle: createdSession.customConfig.aiBehaviorStyle,
        genderPresentation: createdSession.customConfig.aiGenderPresentation,
        voiceTone: createdSession.customConfig.aiVoiceTone,
        accentPreference: createdSession.customConfig.aiAccentPreference,
      },
    },
    selectedVoice: {
      id: selectedVoice.id,
      displayName: selectedVoice.displayName,
      gender: selectedVoice.gender,
      locale: selectedVoice.locale,
      accent: selectedVoice.accent,
      realtimeVoiceId: selectedVoice.realtimeVoiceId,
    },
    voiceSelection: resolvedVoice.policy,
  };
}

/**
 * Function Objective - createRealtimeToken
 * Summary: Mint Realtime client secret cho một session ACTIVE thuộc user hiện tại.
 * Inputs: userId và session params đã validate.
 * Behavior: Kiểm tra ownership -> kiểm tra ACTIVE -> build instructions + gọi OpenAI -> lưu providerSessionId.
 * Returns: Client secret, session config, selected voice, và metadata phục vụ WebRTC client.
 */
export async function createRealtimeToken(userId: string, params: CreateRealtimeTokenParams) {
  const session = await sessionsRepo.findOwnedSessionContext(userId, params.id);
  if (!session) {
    throw Object.assign(new Error('Phiên học không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  if (session.status !== 'ACTIVE') {
    throw Object.assign(new Error('Chỉ session ACTIVE mới có thể mở realtime voice'), {
      code: 'SESSION_NOT_ACTIVE',
      status: 409,
    });
  }

  if (!session.voiceProfile?.realtimeVoiceId) {
    throw Object.assign(new Error('Session chưa có realtime voice hợp lệ'), {
      code: 'VOICE_PROVIDER_NOT_CONFIGURED',
      status: 409,
    });
  }

  const realtime = await sessionsRealtimeService.createRealtimeTokenForSession(session);

  await sessionsRepo.updateSessionById(session.id, {
    modality: SessionModality.VOICE,
    providerSessionId: realtime.providerSessionId ?? undefined,
  });

  return {
    sessionId: session.id,
    modality: 'VOICE',
    realtimeProvider: 'OPENAI',
    clientSecret: realtime.clientSecret,
    sessionConfig: realtime.sessionConfig,
    selectedVoice: realtime.selectedVoice,
  };
}

/**
 * Function Objective - sendSessionMessage
 * Summary: Đồng bộ finalized transcript hoặc text turn từ client về backend session.
 * Inputs: userId, session params, và payload source/content đã validate.
 * Behavior: Kiểm tra ownership -> bỏ qua partial transcript -> chuẩn hóa transcript -> lưu final message -> optionally complete session.
 * Returns: Message vừa lưu và snapshot session hiện tại.
 */
export async function sendSessionMessage(
  userId: string,
  params: SendSessionMessageParams,
  input: SendSessionMessageInput,
) {
  const session = await sessionsRepo.findOwnedSessionContext(userId, params.id);
  if (!session) {
    throw Object.assign(new Error('Phiên học không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  if (input.providerEventId) {
    const existing = await sessionsRepo.findMessageByProviderEventId(session.id, input.providerEventId);
    if (existing) {
      return {
        stored: true,
        message: mapSessionMessage(existing),
        session: {
          id: session.id,
          status: session.status,
          endedAt: session.endedAt,
        },
      };
    }
  }

  if (session.status !== 'ACTIVE') {
    throw Object.assign(new Error('Không thể thêm message vào session không còn ACTIVE'), {
      code: 'SESSION_NOT_ACTIVE',
      status: 409,
    });
  }

  if (!input.isFinal) {
    return {
      stored: false,
      ignoredReason: 'PARTIAL_TRANSCRIPT',
      session: {
        id: session.id,
        status: session.status,
        endedAt: session.endedAt,
      },
    };
  }

  const sourceConfig = MESSAGE_SOURCE_MAP[input.source];
  const turnIndex = input.turnIndex ?? await sessionsRepo.findNextTurnIndex(session.id);

  const storedMessage = await sessionsRepo.createMessage({
    sessionId: session.id,
    role: sourceConfig.role,
    content: sessionsVoiceLearningService.normalizeTranscriptContent(input.content),
    turnIndex,
    providerEventId: input.providerEventId ?? null,
    modality: sourceConfig.modality,
    audioStartMs: input.audioStartMs ?? null,
    audioEndMs: input.audioEndMs ?? null,
    isFinal: true,
  });

  return {
    stored: true,
    ...(input.completeSession
      ? await completeSessionWithEvaluation(userId, session, storedMessage)
      : {
          message: mapSessionMessage(storedMessage),
          session: {
            id: session.id,
            status: session.status,
            endedAt: session.endedAt,
          },
        }),
  };
}

/**
 * Function Objective - completeSession
 * Summary: Tách flow hoàn tất session ra endpoint riêng để backend chấm điểm rõ ràng hơn.
 * Inputs: userId và session params đã validate.
 * Behavior: Kiểm tra ownership -> load session context -> chạy evaluator + reward flow trên transcript final.
 * Returns: Session đã complete, score, và rewards do backend tính.
 */
export async function completeSession(
  userId: string,
  params: CompleteSessionParams,
  options: SessionRequestOptions = {},
) {
  const session = await sessionsRepo.findOwnedSessionContext(userId, params.id);
  if (!session) {
    throw Object.assign(new Error('Phiên học không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  if (session.status === 'COMPLETED') {
    return getSessionResult(userId, params, options);
  }

  return completeSessionWithEvaluation(userId, session, undefined, options);
}

/**
 * Function Objective - createSessionHint
 * Summary: Sinh một hint ngắn cho session ACTIVE hiện tại.
 * Inputs: userId, session params, và optional focus.
 * Behavior: Kiểm tra ownership -> giới hạn 3 hint -> lấy transcript gần nhất -> gọi provider hoặc fallback -> lưu message hint.
 * Returns: Hint message mới và hintCount hiện tại.
 */
export async function createSessionHint(
  userId: string,
  params: SessionHintParams,
  input: SessionHintInput,
) {
  const session = await sessionsRepo.findOwnedSessionContext(userId, params.id);
  if (!session) {
    throw Object.assign(new Error('Phiên học không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  if (session.status !== 'ACTIVE') {
    throw Object.assign(new Error('Chỉ session ACTIVE mới có thể xin hint'), {
      code: 'SESSION_NOT_ACTIVE',
      status: 409,
    });
  }

  if (session.hintCount >= 3) {
    throw Object.assign(new Error('Session này đã dùng tối đa 3 hint'), {
      code: 'HINT_LIMIT_REACHED',
      status: 409,
    });
  }

  const recentMessages = await sessionsRepo.findRecentMessagesForSession(session.id, 8);
  const source = getSessionConversationSource(session);
  const providerMessages = recentMessages
    .filter((message) => !message.isHint)
    .slice()
    .reverse()
    .map<ProviderMessage>((message) => ({
      role: message.role === MessageRole.USER ? 'user' : 'assistant',
      content: message.content,
    }));

  let hintText = '';
  try {
    hintText = await callTextProvider({
      systemPrompt: getHintSystemPrompt({
        sceneTitle: source.title,
        characterName: source.characterName,
        characterRole: source.characterRole,
        missionText: source.missionText,
        focus: input.focus,
      }),
      messages: providerMessages,
      temperature: 0.3,
      maxTokens: 80,
    });
  } catch {
    hintText = buildHintFallback({
      characterName: source.characterName,
      characterRole: source.characterRole,
      missionText: source.missionText,
      focus: input.focus,
    });
  }

  const turnIndex = await sessionsRepo.findNextTurnIndex(session.id);

  const message = await prisma.$transaction(async (tx) => {
    await sessionsRepo.updateSessionById(
      session.id,
      {
        hintCount: {
          increment: 1,
        },
      },
      tx,
    );

    return sessionsRepo.createMessage(
      {
        sessionId: session.id,
        role: MessageRole.AI,
        content: hintText.trim(),
        turnIndex,
        modality: MessageModality.TEXT,
        isFinal: true,
        isHint: true,
      },
      tx,
    );
  });

  return {
    message: mapSessionMessage(message),
    hintCount: session.hintCount + 1,
  };
}

/**
 * Function Objective - getSessionResult
 * Summary: Lấy transcript và điểm số của một session đã kết thúc.
 * Inputs: userId từ access token và session params đã validate.
 * Behavior: Kiểm tra ownership -> từ chối session ACTIVE -> map transcript, scores, và voiceLearning summary nếu là voice session.
 * Returns: Session summary, messages, scores, và metadata học nói để client render màn result.
 */
export async function getSessionResult(
  userId: string,
  params: GetSessionResultParams,
  options: SessionRequestOptions = {},
) {
  const session = await sessionsRepo.findOwnedSessionById(userId, params.id);
  if (!session) {
    throw Object.assign(new Error('Phiên học không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  if (session.status === 'ACTIVE') {
    throw Object.assign(new Error('Phiên học chưa kết thúc'), {
      code: 'SESSION_NOT_FINISHED',
      status: 409,
    });
  }

  const source = getSessionResultSource(session);
  const feedbackLocale = options.feedbackLocale ?? 'vi';
  const spokenCoaching = sessionsSpokenCoachingService.buildSpokenCoachingSummary({
    session: {
      hintCount: session.hintCount,
      modality: session.modality,
      voiceProvider: session.voiceProvider,
      providerSessionId: session.providerSessionId,
      voiceSnapshotName: session.voiceSnapshotName,
    },
    messages: session.messages,
    scores: {
      grammar: session.grammarScore,
      vocabulary: session.vocabularyScore,
      naturalness: session.naturalnessScore,
    },
    locale: feedbackLocale,
  });

  return {
    session: {
      id: session.id,
      sourceType: session.sourceType,
      status: session.status,
      targetTurns: session.sourceType === 'CUSTOM_PRACTICE'
        ? getTargetTurnsForCustomConfig(
            session.customPracticeConfig?.conversationLength,
            session.customPracticeConfig?.estimatedMinutes,
          )
        : 3,
      modality: session.modality,
      voiceProvider: session.voiceProvider,
      providerSessionId: session.providerSessionId,
      voiceSnapshotName: session.voiceSnapshotName,
      xpEarned: session.xpEarned,
      hintCount: session.hintCount,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      voiceProfile: session.voiceProfile
        ? {
            id: session.voiceProfile.id,
            displayName: session.voiceProfile.displayName,
            gender: session.voiceProfile.gender,
            locale: session.voiceProfile.locale,
            accent: session.voiceProfile.accent,
            realtimeVoiceId: session.voiceProfile.realtimeVoiceId,
          }
        : null,
      scene: session.scene
        ? {
            id: session.scene.id,
            title: session.scene.title,
            category: session.scene.category,
            description: session.scene.description,
            missionText: session.scene.missionText,
            difficulty: session.scene.difficulty,
            estimatedMinutes: session.scene.estimatedMinutes,
            characterName: session.scene.characterName,
            characterRole: session.scene.characterRole,
          }
        : null,
      customPractice: session.customPracticeConfig
        ? {
            id: session.customPracticeConfig.id,
            displayTitle: session.customPracticeConfig.displayTitle,
            displaySubtitle: session.customPracticeConfig.displaySubtitle,
            contextType: session.customPracticeConfig.contextType,
            difficulty: session.customPracticeConfig.difficulty,
            conversationLength: session.customPracticeConfig.conversationLength,
            targetMinutes: session.customPracticeConfig.estimatedMinutes,
            topicSummary: session.customPracticeConfig.topicSummary,
            missionText: session.customPracticeConfig.missionText,
            estimatedMinutes: session.customPracticeConfig.estimatedMinutes,
            aiPersona: {
              displayName: session.customPracticeConfig.aiDisplayName,
              role: session.customPracticeConfig.aiRole,
              behaviorStyle: session.customPracticeConfig.aiBehaviorStyle,
              genderPresentation: session.customPracticeConfig.aiGenderPresentation,
              voiceTone: session.customPracticeConfig.aiVoiceTone,
              accentPreference: session.customPracticeConfig.aiAccentPreference,
            },
          }
        : null,
      sourceSummary: {
        title: source.title,
        category: source.category,
        description: source.description,
        missionText: source.missionText,
        difficulty: source.difficulty,
        estimatedMinutes: source.estimatedMinutes,
        characterName: source.characterName,
        characterRole: source.characterRole,
      },
      voiceLearning: sessionsVoiceLearningService.buildVoiceLearningSummary(
        {
          modality: session.modality,
          voiceProvider: session.voiceProvider,
          providerSessionId: session.providerSessionId,
          voiceSnapshotName: session.voiceSnapshotName,
        },
        session.messages,
      ),
    },
    messages: session.messages.map(mapSessionMessage),
    scores: {
      grammar: session.grammarScore,
      vocabulary: session.vocabularyScore,
      naturalness: session.naturalnessScore,
    },
    spokenCoaching,
    nextLearningAction: buildNextLearningAction({
      scores: {
        grammar: session.grammarScore,
        vocabulary: session.vocabularyScore,
        naturalness: session.naturalnessScore,
      },
      feedbackItems: session.messages.map((message) => ({
        hasError: message.hasError,
        errorType: message.errorType,
        subtypes: extractIssueSubtypes(message.feedbackDetails),
      })),
      sourceTitle: source.title,
    }),
  };
}

/**
 * Function Objective - abandonSession
 * Summary: Đánh dấu session ACTIVE là ABANDONED để user thoát giữa chừng.
 * Inputs: userId từ access token và session params đã validate.
 * Behavior: Kiểm tra ownership -> nếu đang ACTIVE thì cập nhật status/endedAt -> idempotent cho session đã abandon.
 * Returns: Cờ updated và trạng thái mới của session.
 */
export async function abandonSession(userId: string, params: AbandonSessionParams) {
  const session = await sessionsRepo.findOwnedSessionStatus(userId, params.id);
  if (!session) {
    throw Object.assign(new Error('Phiên học không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  if (session.status === 'COMPLETED') {
    throw Object.assign(new Error('Không thể abandon phiên đã hoàn thành'), {
      code: 'SESSION_ALREADY_COMPLETED',
      status: 409,
    });
  }

  if (session.status === 'ABANDONED') {
    return {
      updated: true,
      status: session.status,
      endedAt: session.endedAt,
    };
  }

  const updated = await sessionsRepo.updateSessionById(session.id, {
    status: 'ABANDONED',
    endedAt: new Date(),
  });

  return {
    updated: true,
    status: updated.status,
    endedAt: updated.endedAt,
  };
}
