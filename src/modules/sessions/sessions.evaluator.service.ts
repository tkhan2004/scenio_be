import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { ErrorType, MessageRole } from '@prisma/client';
import { z } from 'zod';
import { getLLMClient, provider } from '../../config/llm';
import { SessionContextRecord, SessionMessageRecord } from './sessions.repository';

const OPENAI_EVALUATOR_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const CLAUDE_EVALUATOR_MODEL = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
const SHORT_VI_EXPLANATION_LIMIT = 15;

const aiEvaluationSchema = z.object({
  scores: z.object({
    grammar: z.number(),
    vocabulary: z.number(),
    naturalness: z.number(),
  }),
  feedback: z.array(z.object({
    messageId: z.string(),
    hasError: z.boolean(),
    errorType: z.nativeEnum(ErrorType).nullable().optional(),
    originalPhrase: z.string().nullable().optional(),
    suggestion: z.string().nullable().optional(),
    explanation: z.string().nullable().optional(),
    isGood: z.boolean(),
  })),
});

type ProviderMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type SessionEvaluationInput = {
  session: SessionContextRecord;
  messages: SessionMessageRecord[];
};

export type SessionFeedbackItem = {
  messageId: string;
  hasError: boolean;
  errorType: ErrorType | null;
  originalPhrase: string | null;
  suggestion: string | null;
  explanation: string | null;
  isGood: boolean;
};

export type SessionEvaluationResult = {
  scores: {
    grammar: number;
    vocabulary: number;
    naturalness: number;
  };
  xpEarned: number;
  feedback: SessionFeedbackItem[];
  evaluationMode: 'AI' | 'HEURISTIC_FALLBACK';
};

function clampScore(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function clampXp(value: number, min = 20, max = 120) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function getWords(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/gi, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function getUniqueWordCount(words: string[]) {
  return new Set(words).size;
}

function truncateVietnameseExplanation(value: string | null | undefined) {
  if (!value) return null;

  const words = normalizeWhitespace(value).split(' ');
  return words.slice(0, SHORT_VI_EXPLANATION_LIMIT).join(' ');
}

function getConversationSource(session: SessionContextRecord) {
  if (session.sourceType === 'CUSTOM_PRACTICE' && session.customPracticeConfig) {
    return {
      title: session.customPracticeConfig.displayTitle,
      description: session.customPracticeConfig.topicSummary,
      missionText: session.customPracticeConfig.missionText,
      characterName: session.customPracticeConfig.aiDisplayName,
      characterRole: session.customPracticeConfig.aiRole,
    };
  }

  if (!session.scene) {
    throw Object.assign(new Error('Session hiện không có source context hợp lệ'), {
      code: 'SESSION_SOURCE_INVALID',
      status: 500,
    });
  }

  return {
    title: session.scene.title,
    description: session.scene.description,
    missionText: session.scene.missionText,
    characterName: session.scene.characterName,
    characterRole: session.scene.characterRole,
  };
}

function getUserMessages(messages: SessionMessageRecord[]) {
  return messages.filter((message) => message.role === MessageRole.USER && !message.isHint);
}

function buildEvaluationSystemPrompt() {
  return `You are the Scenio backend evaluator for an English speaking roleplay app.

Your task:
- evaluate the learner's transcript after the session finishes
- score grammar, vocabulary, and naturalness on a 0-100 scale
- produce one feedback item for every USER message

Rules:
- Return JSON only. No markdown. No code fences.
- Always include exactly one feedback object for every USER message id that appears in the transcript.
- If a user message is acceptable, set:
  - hasError: false
  - errorType: null
  - originalPhrase: null
  - suggestion: null
  - explanation: null
  - isGood: true
- If there is an issue, set:
  - hasError: true
  - errorType: one of GRAMMAR, VOCABULARY, NATURALNESS
  - originalPhrase: the short problematic phrase from the user message
  - suggestion: a short improved version in English
  - explanation: a very short Vietnamese explanation, maximum 15 words
  - isGood: false
- Keep scores realistic for a learner, not overly generous.
- Consider the whole conversation context, mission, and learner level.

Required JSON shape:
{
  "scores": {
    "grammar": 0,
    "vocabulary": 0,
    "naturalness": 0
  },
  "feedback": [
    {
      "messageId": "uuid",
      "hasError": true,
      "errorType": "GRAMMAR",
      "originalPhrase": "I go yesterday",
      "suggestion": "I went yesterday",
      "explanation": "Sai thì quá khứ",
      "isGood": false
    }
  ]
}`;
}

function buildEvaluationPrompt(input: SessionEvaluationInput) {
  const source = getConversationSource(input.session);
  const transcript = input.messages
    .map((message) => {
      const role = message.role === MessageRole.USER ? 'USER' : 'AI';
      return `[turn=${message.turnIndex}][id=${message.id}][role=${role}] ${normalizeWhitespace(message.content)}`;
    })
    .join('\n');

  return `Session context:
- Conversation title: ${source.title}
- Mission: ${source.missionText}
- Character: ${source.characterName} (${source.characterRole})
- Learner level: ${input.session.user.level}
- Learning goal: ${input.session.user.learningGoal || 'GENERAL_ENGLISH'}
- Self assessment: ${input.session.user.selfAssessment || 'unknown'}

Transcript:
${transcript}`;
}

function extractJsonObject(rawText: string) {
  const trimmed = rawText.trim();

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  throw new Error('Evaluator không trả về JSON hợp lệ');
}

async function callEvaluationProvider(messages: ProviderMessage[]) {
  const client = getLLMClient();

  if (provider === 'claude') {
    const anthropic = client as Anthropic;
    const response = await anthropic.messages.create({
      model: CLAUDE_EVALUATOR_MODEL,
      max_tokens: 1800,
      temperature: 0.2,
      system: buildEvaluationSystemPrompt(),
      messages,
    });

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    if (!text) {
      throw new Error('Claude không trả về nội dung evaluator');
    }

    return text;
  }

  const openai = client as OpenAI;
  const response = await openai.chat.completions.create({
    model: OPENAI_EVALUATOR_MODEL,
    temperature: 0.2,
    max_tokens: 1800,
    messages: [
      { role: 'system', content: buildEvaluationSystemPrompt() },
      ...messages,
    ],
  });

  const text = response.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error('OpenAI không trả về nội dung evaluator');
  }

  return text;
}

function buildHeuristicFeedback(message: SessionMessageRecord): SessionFeedbackItem {
  const text = normalizeWhitespace(message.content);
  const words = getWords(text);
  const uniqueWordCount = getUniqueWordCount(words);

  if (words.length <= 3) {
    return {
      messageId: message.id,
      hasError: true,
      errorType: ErrorType.NATURALNESS,
      originalPhrase: text,
      suggestion: 'Try a slightly longer response with one more detail.',
      explanation: 'Câu trả lời còn quá ngắn',
      isGood: false,
    };
  }

  if (words.length >= 6 && uniqueWordCount <= Math.max(3, Math.floor(words.length * 0.5))) {
    return {
      messageId: message.id,
      hasError: true,
      errorType: ErrorType.VOCABULARY,
      originalPhrase: text,
      suggestion: 'Add one more specific word or detail to sound clearer.',
      explanation: 'Từ vựng còn hơi lặp',
      isGood: false,
    };
  }

  return {
    messageId: message.id,
    hasError: false,
    errorType: null,
    originalPhrase: null,
    suggestion: null,
    explanation: null,
    isGood: true,
  };
}

function buildHeuristicScores(messages: SessionMessageRecord[]) {
  const userMessages = getUserMessages(messages);
  if (userMessages.length === 0) {
    return {
      grammar: 60,
      vocabulary: 58,
      naturalness: 60,
    };
  }

  const aggregates = userMessages.reduce(
    (acc, message) => {
      const words = getWords(message.content);
      const uniqueWordCount = getUniqueWordCount(words);
      const hasPoliteCue = /\b(please|thank|could|would|can i|may i)\b/i.test(message.content);
      const hasConnector = /\b(because|but|so|if|when|although|however|actually)\b/i.test(message.content);
      const hasQuestion = message.content.includes('?');

      acc.grammar += 58 + Math.min(words.length, 12) * 2 + (hasConnector ? 6 : 0) - (words.length <= 3 ? 18 : 0);
      acc.vocabulary += 52 + Math.min(uniqueWordCount, 12) * 2.5 + (hasConnector ? 4 : 0);
      acc.naturalness += 56 + (hasPoliteCue ? 8 : 0) + (hasQuestion ? 6 : 0) + Math.min(words.length, 10) * 1.8;
      return acc;
    },
    { grammar: 0, vocabulary: 0, naturalness: 0 },
  );

  return {
    grammar: clampScore(aggregates.grammar / userMessages.length, 45, 96),
    vocabulary: clampScore(aggregates.vocabulary / userMessages.length, 45, 96),
    naturalness: clampScore(aggregates.naturalness / userMessages.length, 45, 96),
  };
}

function computeSessionXp(args: {
  scores: {
    grammar: number;
    vocabulary: number;
    naturalness: number;
  };
  hintCount: number;
  userTurnCount: number;
}) {
  const averageScore = Math.round((args.scores.grammar + args.scores.vocabulary + args.scores.naturalness) / 3);
  const baseXp = 20 + averageScore * 0.6 + Math.min(args.userTurnCount * 4, 24) - args.hintCount * 3;
  return clampXp(baseXp);
}

function sanitizeFeedbackItem(
  rawItem: z.infer<typeof aiEvaluationSchema>['feedback'][number],
  fallbackMessage: SessionMessageRecord,
): SessionFeedbackItem {
  const hasError = Boolean(rawItem.hasError);
  const errorType = hasError ? rawItem.errorType ?? ErrorType.GRAMMAR : null;

  return {
    messageId: fallbackMessage.id,
    hasError,
    errorType,
    originalPhrase: hasError ? normalizeWhitespace(rawItem.originalPhrase || fallbackMessage.content).slice(0, 240) : null,
    suggestion: hasError ? normalizeWhitespace(rawItem.suggestion || '').slice(0, 240) || null : null,
    explanation: hasError ? truncateVietnameseExplanation(rawItem.explanation) : null,
    isGood: hasError ? false : true,
  };
}

function parseAiEvaluation(rawText: string, messages: SessionMessageRecord[]) {
  const userMessages = getUserMessages(messages);
  const parsed = aiEvaluationSchema.parse(JSON.parse(extractJsonObject(rawText)));
  const feedbackMap = new Map(parsed.feedback.map((item) => [item.messageId, item]));

  return {
    scores: {
      grammar: clampScore(parsed.scores.grammar),
      vocabulary: clampScore(parsed.scores.vocabulary),
      naturalness: clampScore(parsed.scores.naturalness),
    },
    feedback: userMessages.map((message) => {
      const rawItem = feedbackMap.get(message.id);
      return rawItem
        ? sanitizeFeedbackItem(rawItem, message)
        : buildHeuristicFeedback(message);
    }),
  };
}

/**
 * Function Objective - evaluateCompletedSession
 * Summary: Chấm điểm toàn bộ transcript session đã hoàn tất và sinh feedback per-turn cho các user messages.
 * Inputs: Session context đầy đủ và transcript final theo thứ tự hội thoại.
 * Behavior: Ưu tiên gọi LLM evaluator -> parse JSON -> fallback heuristic nếu provider lỗi.
 * Returns: Scores, xpEarned, feedback per-turn, và evaluationMode.
 */
export async function evaluateCompletedSession(input: SessionEvaluationInput): Promise<SessionEvaluationResult> {
  const userMessages = getUserMessages(input.messages);
  const heuristicScores = buildHeuristicScores(input.messages);
  const heuristicFeedback = userMessages.map(buildHeuristicFeedback);

  try {
    const rawText = await callEvaluationProvider([
      {
        role: 'user',
        content: buildEvaluationPrompt(input),
      },
    ]);

    const parsed = parseAiEvaluation(rawText, input.messages);
    return {
      scores: parsed.scores,
      xpEarned: computeSessionXp({
        scores: parsed.scores,
        hintCount: input.session.hintCount,
        userTurnCount: userMessages.length,
      }),
      feedback: parsed.feedback,
      evaluationMode: 'AI',
    };
  } catch {
    return {
      scores: heuristicScores,
      xpEarned: computeSessionXp({
        scores: heuristicScores,
        hintCount: input.session.hintCount,
        userTurnCount: userMessages.length,
      }),
      feedback: heuristicFeedback,
      evaluationMode: 'HEURISTIC_FALLBACK',
    };
  }
}
