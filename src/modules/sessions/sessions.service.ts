import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { MessageRole, SceneCategory } from '@prisma/client';
import prisma from '../../config/database';
import { getLLMClient, provider } from '../../config/llm';
import {
  AbandonSessionParams,
  GetSessionResultParams,
  LevelTestHistoryItem,
  LevelTestInput,
  StartSessionInput,
} from '../../schemas/sessions';
import * as sessionsRepo from './sessions.repository';

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
 * Helper - mapSessionMessage
 * Summary: Chuẩn hóa message transcript cho endpoint result.
 */
function mapSessionMessage(message: sessionsRepo.SessionResultRecord['messages'][number]) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    turnIndex: message.turnIndex,
    hasError: message.hasError,
    errorType: message.errorType,
    originalPhrase: message.originalPhrase,
    suggestion: message.suggestion,
    explanation: message.explanation,
    isGood: message.isGood,
    isHint: message.isHint,
    createdAt: message.createdAt,
  };
}

/**
 * Helper - generateLevelTestReply
 * Summary: Gọi Claude hoặc OpenAI để sinh phản hồi cho level test.
 * Notes: Provider được chọn bởi config hiện tại trong src/config/llm.ts.
 */
async function generateLevelTestReply(messages: ProviderMessage[]) {
  const client = getLLMClient();
  const systemPrompt = getLevelTestSystemPrompt();

  try {
    if (provider === 'claude') {
      const anthropic = client as Anthropic;
      const response = await anthropic.messages.create({
        model: CLAUDE_LEVEL_TEST_MODEL,
        max_tokens: 400,
        temperature: 0.4,
        system: systemPrompt,
        messages,
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

    const openai = client as OpenAI;
    const response = await openai.chat.completions.create({
      model: OPENAI_LEVEL_TEST_MODEL,
      temperature: 0.4,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) {
      throw new Error('OpenAI không trả về nội dung');
    }

    return text;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && 'status' in error) {
      throw error;
    }

    throw Object.assign(new Error('Không thể gọi AI engine cho level test'), {
      code: 'AI_ENGINE_ERROR',
      status: 502,
      details: error instanceof Error
        ? [{ field: 'provider', message: error.message }]
        : null,
    });
  }
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
 * Summary: Tạo session ACTIVE mới và sinh opening message deterministic cho client.
 * Inputs: userId từ access token và sceneId đã validate.
 * Behavior: Kiểm tra user/scene tồn tại -> chặn nhiều session ACTIVE song song -> tạo session + opening message.
 * Returns: sessionId mới và openingMessage đầu tiên để render màn chat.
 */
export async function startSession(userId: string, input: StartSessionInput) {
  const [user, scene, activeSession] = await Promise.all([
    sessionsRepo.findUserById(userId),
    sessionsRepo.findSceneForSessionStart(input.sceneId),
    sessionsRepo.findActiveUserSession(userId),
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
      details: [
        { field: 'activeSession.id', message: activeSession.id },
        { field: 'activeSession.sceneId', message: activeSession.sceneId },
        { field: 'activeSession.sceneTitle', message: activeSession.scene.title },
        { field: 'activeSession.characterName', message: activeSession.scene.characterName },
        { field: 'activeSession.startedAt', message: activeSession.startedAt.toISOString() },
      ],
    });
  }

  const openingMessage = buildOpeningMessage(scene);

  const createdSession = await prisma.$transaction(async (tx) => {
    const session = await sessionsRepo.createSession(
      {
        userId,
        sceneId: scene.id,
      },
      tx,
    );

    await sessionsRepo.createMessage(
      {
        sessionId: session.id,
        role: MessageRole.AI,
        content: openingMessage,
        turnIndex: 0,
      },
      tx,
    );

    return session;
  });

  return {
    sessionId: createdSession.id,
    openingMessage,
  };
}

/**
 * Function Objective - getSessionResult
 * Summary: Lấy transcript và điểm số của một session đã kết thúc.
 * Inputs: userId từ access token và session params đã validate.
 * Behavior: Kiểm tra ownership -> từ chối session ACTIVE -> map transcript cùng scores.
 * Returns: Session summary, messages, và scores để client render màn result.
 */
export async function getSessionResult(userId: string, params: GetSessionResultParams) {
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

  return {
    session: {
      id: session.id,
      status: session.status,
      xpEarned: session.xpEarned,
      hintCount: session.hintCount,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      scene: {
        id: session.scene.id,
        title: session.scene.title,
        category: session.scene.category,
        difficulty: session.scene.difficulty,
        description: session.scene.description,
        characterName: session.scene.characterName,
        characterRole: session.scene.characterRole,
      },
    },
    messages: session.messages.map(mapSessionMessage),
    scores: {
      grammar: session.grammarScore,
      vocabulary: session.vocabularyScore,
      naturalness: session.naturalnessScore,
    },
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
