import Anthropic from '@anthropic-ai/sdk';
import { AiFeatureType, AiProvider, ConditionType, MissionType, Prisma } from '@prisma/client';
import prisma from '../../config/database';
import {
  CreateVocabularyInput,
  DeleteVocabularyParams,
  GetVocabularyDeckDetailParams,
  ListVocabularyQuery,
  ReviewVocabularyInput,
  ReviewVocabularyParams,
} from '../../schemas/vocabulary';
import * as missionsService from '../missions/missions.service';
import { getAiFeatureRuntimePlan } from '../ai-models/ai-models.service';
import * as usersRepo from '../users/users.repository';
import * as vocabularyRepo from './vocabulary.repository';

type BadgeRecord = Awaited<ReturnType<typeof usersRepo.findActiveBadgesWithEarnedStatus>>[number];

const SRS_INTERVAL_DAYS = [1, 3, 7, 14, 30, 60] as const;
const MANUAL_VOCABULARY_PLACEHOLDER = 'A word saved from your practice transcript for review.';
type RuntimeAiModel = Awaited<ReturnType<typeof getAiFeatureRuntimePlan>>['models'][number];

/**
 * Helper - getTodayDateString
 * Summary: Trả về ngày hiện tại dạng YYYY-MM-DD để đồng bộ với mission progress.
 */
function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Helper - normalizeWord
 * Summary: Chuẩn hóa từ để tạo unique dictionary key theo user.
 */
function normalizeWord(word: string) {
  return word.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeDefinition(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, ' ') ?? '';
}

function shouldGenerateVietnameseDefinition(definition: string | null | undefined) {
  const normalized = normalizeDefinition(definition);
  return !normalized || normalized.toLowerCase() === MANUAL_VOCABULARY_PLACEHOLDER.toLowerCase();
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

function extractJsonObject(rawText: string) {
  const trimmed = rawText.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) return fencedMatch[1].trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

function parseVocabularyDefinition(rawText: string) {
  try {
    const parsed = JSON.parse(extractJsonObject(rawText)) as { definition?: string };
    const definition = normalizeDefinition(parsed.definition);
    if (definition) return definition.slice(0, 240);
  } catch (_) {
    // Fallback to raw text below.
  }

  return normalizeDefinition(rawText).slice(0, 240);
}

async function callOpenAiVocabularyModel(modelId: string, prompt: string) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getRequiredProviderApiKey(AiProvider.OPENAI)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      temperature: 0.2,
      max_output_tokens: 160,
      input: [
        {
          role: 'system',
          content: 'You write concise Vietnamese meanings for English vocabulary in a language learning app. Return JSON only.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `OpenAI returned ${response.status}`);
  }

  const text = payload?.output_text
    ?? payload?.output?.flatMap((item: any) => item?.content ?? [])
      ?.map((part: any) => part?.text ?? '')
      ?.join('')
    ?? '';
  if (!text.trim()) throw new Error('OpenAI không trả vocabulary definition');
  return text.trim();
}

async function callClaudeVocabularyModel(modelId: string, prompt: string) {
  const anthropic = new Anthropic({ apiKey: getRequiredProviderApiKey(AiProvider.ANTHROPIC) });
  const response = await anthropic.messages.create({
    model: modelId,
    max_tokens: 160,
    temperature: 0.2,
    system: 'You write concise Vietnamese meanings for English vocabulary in a language learning app. Return JSON only.',
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
  if (!text) throw new Error('Claude không trả vocabulary definition');
  return text;
}

async function callGeminiVocabularyModel(modelId: string, prompt: string) {
  const apiKey = getRequiredProviderApiKey(AiProvider.GOOGLE);
  const baseUrl = (process.env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/models/${modelId}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 160,
        responseMimeType: 'application/json',
      },
      systemInstruction: {
        parts: [{ text: 'You write concise Vietnamese meanings for English vocabulary in a language learning app. Return JSON only.' }],
      },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `Gemini returned ${response.status}`);
  }

  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part: any) => part?.text ?? '')
    ?.join('')
    ?.trim() ?? '';
  if (!text) throw new Error('Gemini không trả vocabulary definition');
  return text;
}

async function callVocabularyDefinitionModel(model: RuntimeAiModel, prompt: string) {
  if (model.provider === AiProvider.ANTHROPIC) {
    return callClaudeVocabularyModel(model.modelId, prompt);
  }
  if (model.provider === AiProvider.GOOGLE) {
    return callGeminiVocabularyModel(model.modelId, prompt);
  }
  return callOpenAiVocabularyModel(model.modelId, prompt);
}

async function generateVietnameseDefinition(input: {
  word: string;
  sampleSentence?: string | null;
}) {
  const prompt = `Create a short Vietnamese meaning for this English vocabulary item.

Word or phrase: ${input.word}
Context sentence: ${input.sampleSentence?.trim() || 'not provided'}

Rules:
- Return JSON only: {"definition":"..."}
- Definition must be Vietnamese.
- Keep it concise, natural, and useful for a Vietnamese learner.
- If the word is a phrase, explain the phrase meaning in this context.`;

  const plan = await getAiFeatureRuntimePlan(AiFeatureType.ROLEPLAY_LLM);
  const models = plan.models.length > 0 ? plan.models : [];
  for (const model of models) {
    try {
      const rawText = await callVocabularyDefinitionModel(model, prompt);
      const definition = parseVocabularyDefinition(rawText);
      if (definition) return definition;
    } catch (_) {
      // Try the next configured fallback model.
    }
  }

  return `Nghĩa tiếng Việt của "${input.word}" trong ngữ cảnh này.`;
}

/**
 * Helper - addDays
 * Summary: Tạo timestamp cộng thêm số ngày cho SRS schedule.
 */
function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Helper - isVocabularyDue
 * Summary: Xác định một dictionary word có đang cần review hay không.
 */
function isVocabularyDue(item: {
  isMastered: boolean;
  nextReviewAt: Date | null;
}) {
  if (!item.isMastered) return true;
  if (!item.nextReviewAt) return false;
  return item.nextReviewAt.getTime() <= Date.now();
}

function mapSessionSource(session: {
  id: string;
  sourceType: string;
  scene: {
    id: string;
    title: string;
    category: string;
    difficulty: string;
    characterName?: string;
    characterRole?: string;
  } | null;
  customPracticeConfig: {
    id: string;
    displayTitle: string;
    contextType: string;
    difficulty: string;
    aiDisplayName: string;
    aiRole: string;
  } | null;
}) {
  if (session.sourceType === 'CUSTOM_PRACTICE' && session.customPracticeConfig) {
    return {
      id: session.customPracticeConfig.id,
      title: session.customPracticeConfig.displayTitle,
      category: session.customPracticeConfig.contextType,
      difficulty: session.customPracticeConfig.difficulty,
      characterName: session.customPracticeConfig.aiDisplayName,
      characterRole: session.customPracticeConfig.aiRole,
    };
  }

  if (!session.scene) {
    return null;
  }

  return {
    id: session.scene.id,
    title: session.scene.title,
    category: session.scene.category,
    difficulty: session.scene.difficulty,
    characterName: session.scene.characterName ?? null,
    characterRole: session.scene.characterRole ?? null,
  };
}

/**
 * Helper - mapVocabularyItem
 * Summary: Chuẩn hóa dictionary aggregate record thành payload trả về cho client.
 */
function mapVocabularyItem(item: vocabularyRepo.UserVocabularyRecord) {
  const latestOccurrence = item.occurrences[0] ?? null;
  const latestOccurrenceSource = latestOccurrence?.session ? mapSessionSource(latestOccurrence.session) : null;

  return {
    id: item.id,
    normalizedWord: item.normalizedWord,
    word: item.word,
    definition: item.definition,
    example: item.sceneVocabulary?.example ?? latestOccurrence?.sampleSentence ?? null,
    isMastered: item.isMastered,
    needsReview: isVocabularyDue(item),
    encounterCount: item.encounterCount,
    srsLevel: item.srsLevel,
    nextReviewAt: item.nextReviewAt,
    savedAt: item.savedAt,
    lastSeenAt: item.lastSeenAt,
    reviewedAt: item.reviewedAt,
    sourceSessionId: item.sourceSessionId,
    scene: item.sceneVocabulary
      ? {
          id: item.sceneVocabulary.scene.id,
          title: item.sceneVocabulary.scene.title,
          category: item.sceneVocabulary.scene.category,
          difficulty: item.sceneVocabulary.scene.difficulty,
        }
      : latestOccurrenceSource
        ? {
            id: latestOccurrenceSource.id,
            title: latestOccurrenceSource.title,
            category: latestOccurrenceSource.category,
            difficulty: latestOccurrenceSource.difficulty,
          }
        : null,
    latestOccurrence: latestOccurrence
      ? {
          id: latestOccurrence.id,
          sessionId: latestOccurrence.sessionId,
          sampleSentence: latestOccurrence.sampleSentence,
          sourceMessageId: latestOccurrence.sourceMessageId,
          createdAt: latestOccurrence.createdAt,
          session: latestOccurrence.session
            ? {
                id: latestOccurrence.session.id,
                status: latestOccurrence.session.status,
                sourceType: latestOccurrence.session.sourceType,
                scene: latestOccurrenceSource
                  ? {
                      id: latestOccurrenceSource.id,
                      title: latestOccurrenceSource.title,
                      category: latestOccurrenceSource.category,
                      difficulty: latestOccurrenceSource.difficulty,
                    }
                  : null,
              }
            : null,
        }
      : null,
  };
}

/**
 * Helper - mapDeckWord
 * Summary: Chuẩn hóa một occurrence trong session deck để client render screen review.
 */
function mapDeckWord(item: vocabularyRepo.VocabularyDeckOccurrenceRecord) {
  return {
    occurrenceId: item.id,
    vocabularyId: item.userVocabulary.id,
    word: item.userVocabulary.word,
    definition: item.userVocabulary.definition,
    example: item.userVocabulary.sceneVocabulary?.example ?? null,
    sampleSentence: item.sampleSentence,
    sourceMessageId: item.sourceMessageId,
    isMastered: item.userVocabulary.isMastered,
    needsReview: isVocabularyDue(item.userVocabulary),
    encounterCount: item.userVocabulary.encounterCount,
    srsLevel: item.userVocabulary.srsLevel,
    nextReviewAt: item.userVocabulary.nextReviewAt,
    savedAt: item.userVocabulary.savedAt,
    lastSeenAt: item.userVocabulary.lastSeenAt,
    reviewedAt: item.userVocabulary.reviewedAt,
    createdAt: item.createdAt,
  };
}

/**
 * Helper - isVocabularyBadgeEligible
 * Summary: Kiểm tra badge VOCAB_SAVED đã đủ điều kiện award hay chưa.
 */
function isVocabularyBadgeEligible(badge: BadgeRecord, savedVocabulary: number) {
  return badge.conditionType === ConditionType.VOCAB_SAVED
    && badge.userBadges.length === 0
    && savedVocabulary >= badge.conditionValue;
}

/**
 * Helper - updateSaveVocabularyMission
 * Summary: Tăng progress SAVE_VOCABULARY cho ngày hiện tại và cộng thưởng nếu mission vừa complete.
 */
async function updateSaveVocabularyMission(userId: string, today: string, tx: Prisma.TransactionClient) {
  const todayMissions = await usersRepo.findTodayUserMissions(userId, today, tx);
  let missionBonusXp = 0;

  for (const mission of todayMissions) {
    if (mission.mission.missionType !== MissionType.SAVE_VOCABULARY) {
      continue;
    }

    const nextValue = mission.currentValue + 1;
    const shouldComplete = !mission.isCompleted && nextValue >= mission.mission.targetValue;

    await usersRepo.updateUserMissionById(
      mission.id,
      {
        currentValue: nextValue,
        isCompleted: mission.isCompleted || shouldComplete,
        completedAt: shouldComplete ? new Date() : mission.completedAt,
      },
      tx,
    );

    if (shouldComplete) {
      missionBonusXp += mission.mission.xpReward;
    }
  }

  return missionBonusXp;
}

/**
 * Function Objective - listVocabulary
 * Summary: Lấy dictionary tổng hợp của user hiện tại.
 * Inputs: userId từ access token và query phân trang đã validate.
 * Behavior: Count tổng -> lấy page hiện tại -> chuẩn hóa payload dictionary list.
 * Returns: Danh sách dictionary entries cùng total, page, limit.
 */
export async function listVocabulary(userId: string, query: ListVocabularyQuery) {
  const skip = (query.page - 1) * query.limit;

  const [total, vocabulary] = await Promise.all([
    vocabularyRepo.countUserVocabulary(userId, query.isMastered),
    vocabularyRepo.findUserVocabulary({
      userId,
      skip,
      take: query.limit,
      isMastered: query.isMastered,
    }),
  ]);

  return {
    vocabulary: vocabulary.map(mapVocabularyItem),
    total,
    page: query.page,
    limit: query.limit,
  };
}

/**
 * Function Objective - listVocabularyDecks
 * Summary: Lấy danh sách deck từ vựng theo session context mà user đã đi qua.
 * Inputs: userId từ access token.
 * Behavior: Lấy occurrence có session -> group theo sessionId -> tính words/mastered/due.
 * Returns: Danh sách deck theo session để render tab vocabulary theo ngữ cảnh.
 */
export async function listVocabularyDecks(userId: string) {
  const occurrences = await vocabularyRepo.findVocabularyDeckOccurrences(userId);
  const deckMap = new Map<string, {
    sessionId: string;
    session: NonNullable<vocabularyRepo.VocabularyDeckOccurrenceRecord['session']>;
    wordsCount: number;
    masteredCount: number;
    dueWordsCount: number;
    latestEncounterAt: Date;
  }>();

  for (const occurrence of occurrences) {
    if (!occurrence.session || !occurrence.sessionId) continue;

    const due = isVocabularyDue(occurrence.userVocabulary);
    const existing = deckMap.get(occurrence.sessionId);

    if (!existing) {
      deckMap.set(occurrence.sessionId, {
        sessionId: occurrence.sessionId,
        session: occurrence.session,
        wordsCount: 1,
        masteredCount: occurrence.userVocabulary.isMastered ? 1 : 0,
        dueWordsCount: due ? 1 : 0,
        latestEncounterAt: occurrence.createdAt,
      });
      continue;
    }

    existing.wordsCount += 1;
    existing.masteredCount += occurrence.userVocabulary.isMastered ? 1 : 0;
    existing.dueWordsCount += due ? 1 : 0;
    if (occurrence.createdAt > existing.latestEncounterAt) {
      existing.latestEncounterAt = occurrence.createdAt;
    }
  }

  const decks = Array.from(deckMap.values())
    .sort((a, b) => b.latestEncounterAt.getTime() - a.latestEncounterAt.getTime())
    .map((deck) => {
      const source = mapSessionSource(deck.session);
      return {
        sessionId: deck.sessionId,
        sourceType: deck.session.sourceType,
        scene: source
          ? {
              id: source.id,
              title: source.title,
              category: source.category,
              difficulty: source.difficulty,
              characterName: source.characterName,
              characterRole: source.characterRole,
            }
          : null,
        sessionStatus: deck.session.status,
        startedAt: deck.session.startedAt,
        endedAt: deck.session.endedAt,
        wordsCount: deck.wordsCount,
        masteredCount: deck.masteredCount,
        dueWordsCount: deck.dueWordsCount,
        completionPercent: deck.wordsCount === 0
          ? 0
          : Math.round((deck.masteredCount / deck.wordsCount) * 100),
        latestEncounterAt: deck.latestEncounterAt,
      };
    });

  return {
    decks,
    total: decks.length,
  };
}

/**
 * Function Objective - getVocabularyDeckDetail
 * Summary: Lấy danh sách words nằm trong một session deck cụ thể.
 * Inputs: userId từ access token và sessionId đã validate.
 * Behavior: Lấy occurrence theo session -> map detail deck + words list.
 * Returns: Deck summary và words trong deck đó.
 */
export async function getVocabularyDeckDetail(userId: string, params: GetVocabularyDeckDetailParams) {
  const occurrences = await vocabularyRepo.findDeckOccurrencesBySession(userId, params.sessionId);
  if (occurrences.length === 0) {
    throw Object.assign(new Error('Deck từ vựng không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  const session = occurrences[0].session;
  if (!session) {
    throw Object.assign(new Error('Deck từ vựng không hợp lệ'), { code: 'NOT_FOUND', status: 404 });
  }

  const words = occurrences.map(mapDeckWord);
  const masteredCount = words.filter((word) => word.isMastered).length;
  const dueWordsCount = words.filter((word) => word.needsReview).length;
  const source = mapSessionSource(session);

  return {
    deck: {
      sessionId: session.id,
      sourceType: session.sourceType,
      scene: source
        ? {
            id: source.id,
            title: source.title,
            category: source.category,
            difficulty: source.difficulty,
            characterName: source.characterName,
            characterRole: source.characterRole,
          }
        : null,
      sessionStatus: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      wordsCount: words.length,
      masteredCount,
      dueWordsCount,
      completionPercent: words.length === 0 ? 0 : Math.round((masteredCount / words.length) * 100),
    },
    words,
  };
}

/**
 * Function Objective - createVocabulary
 * Summary: Lưu từ vào dictionary tổng hợp và tạo occurrence theo session nếu có context.
 * Inputs: userId từ access token và payload đã validate.
 * Behavior: Upsert dictionary word -> tạo occurrence mới nếu là lần gặp ở session mới -> chỉ cộng mission/badge khi dictionary có từ mới thật.
 * Returns: Dictionary word hiện tại cùng cờ createdDictionary/createdOccurrence.
 */
export async function createVocabulary(userId: string, input: CreateVocabularyInput) {
  const today = getTodayDateString();

  let sceneVocabulary: Awaited<ReturnType<typeof vocabularyRepo.findSceneVocabularyById>> | null = null;
  if (input.sceneVocabularyId) {
    sceneVocabulary = await vocabularyRepo.findSceneVocabularyById(input.sceneVocabularyId);
    if (!sceneVocabulary) {
      throw Object.assign(new Error('Scene vocabulary không tồn tại'), {
        code: 'NOT_FOUND',
        status: 404,
      });
    }
  }

  if (input.sourceSessionId) {
    const sourceSession = await vocabularyRepo.findOwnedSourceSession(userId, input.sourceSessionId);
    if (!sourceSession) {
      throw Object.assign(new Error('Source session không tồn tại'), {
        code: 'NOT_FOUND',
        status: 404,
      });
    }
  }

  const word = sceneVocabulary?.word ?? input.word!;
  const definition = sceneVocabulary?.definition
    ?? (shouldGenerateVietnameseDefinition(input.definition)
      ? await generateVietnameseDefinition({
          word,
          sampleSentence: input.sampleSentence ?? null,
        })
      : normalizeDefinition(input.definition));
  const normalizedWord = normalizeWord(word);

  await missionsService.ensureTodayMissions(userId, today);

  return prisma.$transaction(async (tx) => {
    let createdDictionary = false;
    let createdOccurrence = false;

    let vocabulary = await vocabularyRepo.findUserVocabularyByNormalizedWord(userId, normalizedWord, tx);

    if (!vocabulary) {
      createdDictionary = true;
      vocabulary = await vocabularyRepo.createUserVocabulary(
        {
          user: { connect: { id: userId } },
          sceneVocabulary: sceneVocabulary ? { connect: { id: sceneVocabulary.id } } : undefined,
          normalizedWord,
          word,
          definition,
          sourceSessionId: input.sourceSessionId ?? null,
          encounterCount: 1,
          lastSeenAt: new Date(),
        },
        tx,
      );
    } else if (shouldGenerateVietnameseDefinition(vocabulary.definition)) {
      vocabulary = await vocabularyRepo.updateUserVocabularyById(
        vocabulary.id,
        { definition },
        tx,
      );
    }

    if (input.sourceSessionId) {
      const existingOccurrence = await vocabularyRepo.findVocabularyOccurrenceBySession(
        vocabulary.id,
        input.sourceSessionId,
        tx,
      );

      if (!existingOccurrence) {
        createdOccurrence = true;
        await vocabularyRepo.createVocabularyOccurrence(
          {
            userVocabulary: { connect: { id: vocabulary.id } },
            user: { connect: { id: userId } },
            session: { connect: { id: input.sourceSessionId } },
            sampleSentence: input.sampleSentence ?? sceneVocabulary?.example ?? null,
            sourceMessageId: input.sourceMessageId ?? null,
          },
          tx,
        );

        vocabulary = await vocabularyRepo.updateUserVocabularyById(
          vocabulary.id,
          {
            sourceSessionId: input.sourceSessionId,
            lastSeenAt: new Date(),
            encounterCount: createdDictionary ? vocabulary.encounterCount : { increment: 1 },
            sceneVocabulary: !vocabulary.sceneVocabulary && sceneVocabulary
              ? { connect: { id: sceneVocabulary.id } }
              : undefined,
          },
          tx,
        );
      } else if ((input.sampleSentence && !existingOccurrence.sampleSentence)
        || (input.sourceMessageId && !existingOccurrence.sourceMessageId)) {
        await vocabularyRepo.updateVocabularyOccurrenceById(
          existingOccurrence.id,
          {
            sampleSentence: existingOccurrence.sampleSentence ?? input.sampleSentence ?? undefined,
            sourceMessageId: existingOccurrence.sourceMessageId ?? input.sourceMessageId ?? undefined,
          },
          tx,
        );

        vocabulary = await vocabularyRepo.updateUserVocabularyById(
          vocabulary.id,
          {
            sourceSessionId: input.sourceSessionId,
            lastSeenAt: new Date(),
          },
          tx,
        );
      }
    }

    if (createdDictionary) {
      const [savedVocabulary, badges] = await Promise.all([
        vocabularyRepo.countUserVocabulary(userId, undefined, tx),
        usersRepo.findActiveBadgesWithEarnedStatus(userId, tx),
      ]);

      const missionBonusXp = await updateSaveVocabularyMission(userId, today, tx);

      let badgeBonusXp = 0;
      for (const badge of badges) {
        if (!isVocabularyBadgeEligible(badge, savedVocabulary)) {
          continue;
        }

        await usersRepo.createUserBadge(
          {
            userId,
            badgeId: badge.id,
            earnedAt: new Date(),
          },
          tx,
        );
        badgeBonusXp += badge.xpReward;
      }

      if (missionBonusXp > 0 || badgeBonusXp > 0) {
        await usersRepo.updateUserById(
          userId,
          {
            totalXp: {
              increment: missionBonusXp + badgeBonusXp,
            },
          },
          tx,
        );
      }
    }

    const latestVocabulary = await vocabularyRepo.findUserVocabularyById(userId, vocabulary.id, tx);
    if (!latestVocabulary) {
      throw Object.assign(new Error('Không thể đọc lại từ vựng vừa lưu'), {
        code: 'INTERNAL_ERROR',
        status: 500,
      });
    }

    return {
      vocabulary: mapVocabularyItem(latestVocabulary),
      createdDictionary,
      createdOccurrence,
    };
  });
}

/**
 * Function Objective - reviewVocabulary
 * Summary: Submit kết quả review cho một dictionary word theo SRS hybrid.
 * Inputs: userId từ access token, vocabularyId, và payload recallQuality/isDone.
 * Behavior: Cập nhật isMastered, srsLevel, nextReviewAt, reviewedAt theo kết quả review.
 * Returns: Dictionary word sau khi review và summary schedule.
 */
export async function reviewVocabulary(
  userId: string,
  params: ReviewVocabularyParams,
  input: ReviewVocabularyInput,
) {
  const vocabulary = await vocabularyRepo.findUserVocabularyById(userId, params.id);
  if (!vocabulary) {
    throw Object.assign(new Error('Từ vựng không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  const now = new Date();
  let nextLevel = vocabulary.srsLevel;
  let nextReviewAt: Date | null = null;
  let isMastered = vocabulary.isMastered;

  if (!input.isDone || input.recallQuality <= 2) {
    nextLevel = Math.max(0, vocabulary.srsLevel - 1);
    nextReviewAt = addDays(now, SRS_INTERVAL_DAYS[0]);
    isMastered = false;
  } else {
    const increment = input.recallQuality >= 5 ? 2 : 1;
    nextLevel = Math.min(vocabulary.srsLevel + increment, SRS_INTERVAL_DAYS.length - 1);
    nextReviewAt = addDays(now, SRS_INTERVAL_DAYS[nextLevel]);
    isMastered = true;
  }

  const updated = await vocabularyRepo.updateUserVocabularyById(vocabulary.id, {
    isMastered,
    srsLevel: nextLevel,
    nextReviewAt,
    reviewedAt: now,
  });

  return {
    vocabulary: mapVocabularyItem(updated),
    review: {
      isDone: input.isDone,
      recallQuality: input.recallQuality,
      nextReviewAt,
      nextSrsLevel: nextLevel,
    },
  };
}

/**
 * Function Objective - deleteVocabulary
 * Summary: Xóa một dictionary word khỏi danh sách học của user hiện tại.
 * Inputs: userId từ access token và params id đã validate.
 * Behavior: Kiểm tra ownership -> xóa dictionary entry -> occurrence sẽ cascade.
 * Returns: Cờ deleted để client cập nhật local state.
 */
export async function deleteVocabulary(userId: string, params: DeleteVocabularyParams) {
  const vocabulary = await vocabularyRepo.findUserVocabularyById(userId, params.id);
  if (!vocabulary) {
    throw Object.assign(new Error('Từ vựng không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  await vocabularyRepo.deleteUserVocabularyById(vocabulary.id);

  return {
    deleted: true,
  };
}
