import Anthropic from '@anthropic-ai/sdk';
import { AiFeatureType, AiProvider, ErrorType, MessageRole } from '@prisma/client';
import { z } from 'zod';
import { provider } from '../../config/llm';
import { getAiFeatureRuntimePlan } from '../ai-models/ai-models.service';
import { SessionContextRecord, SessionMessageRecord } from './sessions.repository';

const OPENAI_EVALUATOR_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const CLAUDE_EVALUATOR_MODEL = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
const SHORT_VI_EXPLANATION_LIMIT = 15;

const feedbackIssueSchema = z.object({
  type: z.nativeEnum(ErrorType),
  subtype: z.string().trim().min(1).max(40).nullable().optional(),
  originalPhrase: z.string().nullable().optional(),
  suggestion: z.string().nullable().optional(),
  explanation: z.string().nullable().optional(),
  startIndex: z.number().int().min(0).nullable().optional(),
  endIndex: z.number().int().min(0).nullable().optional(),
});

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
    issues: z.array(feedbackIssueSchema).optional().default([]),
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
type RuntimeAiModel = Awaited<ReturnType<typeof getAiFeatureRuntimePlan>>['models'][number];

export type SessionFeedbackItem = {
  messageId: string;
  hasError: boolean;
  errorType: ErrorType | null;
  originalPhrase: string | null;
  suggestion: string | null;
  explanation: string | null;
  isGood: boolean;
  feedbackDetails: {
    issues: Array<{
      type: ErrorType;
      subtype: string | null;
      originalPhrase: string | null;
      suggestion: string | null;
      explanation: string | null;
      startIndex: number | null;
      endIndex: number | null;
    }>;
  };
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
- evaluate the learner's spoken transcript after the session finishes
- score grammar, vocabulary, and naturalness on a 0-100 scale
- produce one feedback item for every USER message
- include zero or more detailed issues for every feedback item

Rules:
- Judge only what is visible in the transcript. Do not judge pronunciation or audio quality.
- Return JSON only. No markdown. No code fences.
- Always include exactly one feedback object for every USER message id that appears in the transcript.
- If a user message is acceptable, set:
  - hasError: false
  - errorType: null
  - originalPhrase: null
  - suggestion: null
  - explanation: null
  - isGood: true
  - issues: []
- If there is an issue, set:
  - hasError: true
  - errorType: one of GRAMMAR, VOCABULARY, NATURALNESS
  - originalPhrase: the short problematic phrase from the user message
  - suggestion: a short improved version in English
  - explanation: a very short Vietnamese explanation, maximum 15 words
  - isGood: false
  - issues: include every important issue in that message, up to 3 issues
- Each issue should include:
  - type: one of GRAMMAR, VOCABULARY, NATURALNESS
  - subtype: short uppercase label like TENSE, WORD_CHOICE, ARTICLE, SENTENCE_STRUCTURE, POLITENESS, CLARITY
  - originalPhrase: short problematic phrase
  - suggestion: short improved English phrase or sentence
  - explanation: Vietnamese explanation, maximum 15 words
  - startIndex/endIndex: character indexes in the original user message if easy, otherwise null
- Focus on whether the learner expressed the idea clearly, naturally, and appropriately for the roleplay context.
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
      "isGood": false,
      "issues": [
        {
          "type": "GRAMMAR",
          "subtype": "TENSE",
          "originalPhrase": "go yesterday",
          "suggestion": "went yesterday",
          "explanation": "Sai thì quá khứ",
          "startIndex": null,
          "endIndex": null
        }
      ]
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
  const plan = await getAiFeatureRuntimePlan(AiFeatureType.EVALUATOR_LLM);
  const models = plan.models.length > 0
    ? plan.models
    : [getEnvDefaultEvaluatorModel()];
  const errors: string[] = [];

  for (const model of models) {
    try {
      return await callRuntimeEvaluatorModel(model, messages);
    } catch (error: any) {
      errors.push(`${model.provider}/${model.modelId}: ${error?.message ?? 'unknown error'}`);
    }
  }

  throw Object.assign(new Error('Evaluator fallback chain failed'), {
    code: 'AI_ENGINE_ERROR',
    status: 502,
    details: errors.map((message) => ({ field: 'fallback', message })),
  });
}

function getEnvDefaultEvaluatorModel(): RuntimeAiModel {
  return {
    id: 'env-default-evaluator',
    featureType: AiFeatureType.EVALUATOR_LLM,
    provider: provider === 'claude' ? AiProvider.ANTHROPIC : AiProvider.OPENAI,
    modelId: provider === 'claude' ? CLAUDE_EVALUATOR_MODEL : OPENAI_EVALUATOR_MODEL,
    displayName: 'Environment default evaluator model',
    description: null,
    inputModalities: ['TEXT'],
    outputType: 'JSON',
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

async function callRuntimeEvaluatorModel(model: RuntimeAiModel, messages: ProviderMessage[]) {
  if (model.provider === AiProvider.ANTHROPIC) {
    const anthropic = new Anthropic({ apiKey: getRequiredProviderApiKey(AiProvider.ANTHROPIC) });
    const response = await anthropic.messages.create({
      model: model.modelId,
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

  if (model.provider === AiProvider.GOOGLE) {
    return callGeminiEvaluatorModel(model.modelId, messages);
  }

  return callOpenAiEvaluatorModel(model.modelId, messages);
}

async function callOpenAiEvaluatorModel(modelId: string, messages: ProviderMessage[]) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getRequiredProviderApiKey(AiProvider.OPENAI)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      temperature: 0.2,
      max_output_tokens: 1800,
      input: [
        { role: 'system', content: buildEvaluationSystemPrompt() },
        ...messages.map((message) => ({
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
    throw new Error('OpenAI không trả về nội dung evaluator');
  }

  return text;
}

async function callGeminiEvaluatorModel(modelId: string, messages: ProviderMessage[]) {
  const baseUrl = (process.env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/models/${modelId}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': getRequiredProviderApiKey(AiProvider.GOOGLE),
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: buildEvaluationSystemPrompt() }],
      },
      contents: messages.map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      })),
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1800,
        responseMimeType: 'application/json',
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
    throw new Error('Gemini không trả về nội dung evaluator');
  }

  return text;
}

function buildHeuristicFeedback(message: SessionMessageRecord): SessionFeedbackItem {
  const text = normalizeWhitespace(message.content);
  const words = getWords(text);
  const uniqueWordCount = getUniqueWordCount(words);

  if (words.length <= 3) {
    const issue = {
      type: ErrorType.NATURALNESS,
      subtype: 'SHORT_RESPONSE',
      originalPhrase: text,
      suggestion: 'Try a slightly longer response with one more detail.',
      explanation: 'Câu trả lời còn quá ngắn',
      startIndex: 0,
      endIndex: text.length,
    };

    return {
      messageId: message.id,
      hasError: true,
      errorType: ErrorType.NATURALNESS,
      originalPhrase: issue.originalPhrase,
      suggestion: issue.suggestion,
      explanation: issue.explanation,
      isGood: false,
      feedbackDetails: { issues: [issue] },
    };
  }

  if (words.length >= 6 && uniqueWordCount <= Math.max(3, Math.floor(words.length * 0.5))) {
    const issue = {
      type: ErrorType.VOCABULARY,
      subtype: 'REPETITION',
      originalPhrase: text,
      suggestion: 'Add one more specific word or detail to sound clearer.',
      explanation: 'Từ vựng còn hơi lặp',
      startIndex: 0,
      endIndex: text.length,
    };

    return {
      messageId: message.id,
      hasError: true,
      errorType: ErrorType.VOCABULARY,
      originalPhrase: issue.originalPhrase,
      suggestion: issue.suggestion,
      explanation: issue.explanation,
      isGood: false,
      feedbackDetails: { issues: [issue] },
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
    feedbackDetails: { issues: [] },
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
  const rawIssues = hasError
    ? rawItem.issues.length > 0
      ? rawItem.issues
      : [{
          type: rawItem.errorType ?? ErrorType.GRAMMAR,
          subtype: null,
          originalPhrase: rawItem.originalPhrase,
          suggestion: rawItem.suggestion,
          explanation: rawItem.explanation,
          startIndex: null,
          endIndex: null,
        }]
    : [];
  const issues = rawIssues.slice(0, 3).map((issue) => ({
    type: issue.type,
    subtype: issue.subtype ? normalizeWhitespace(issue.subtype).toUpperCase().slice(0, 40) : null,
    originalPhrase: normalizeWhitespace(issue.originalPhrase || rawItem.originalPhrase || fallbackMessage.content).slice(0, 240) || null,
    suggestion: normalizeWhitespace(issue.suggestion || rawItem.suggestion || '').slice(0, 240) || null,
    explanation: truncateVietnameseExplanation(issue.explanation || rawItem.explanation),
    startIndex: typeof issue.startIndex === 'number' ? issue.startIndex : null,
    endIndex: typeof issue.endIndex === 'number' ? issue.endIndex : null,
  }));
  const primaryIssue = issues[0] ?? null;
  const errorType = hasError ? primaryIssue?.type ?? rawItem.errorType ?? ErrorType.GRAMMAR : null;

  return {
    messageId: fallbackMessage.id,
    hasError,
    errorType,
    originalPhrase: hasError ? primaryIssue?.originalPhrase ?? normalizeWhitespace(rawItem.originalPhrase || fallbackMessage.content).slice(0, 240) : null,
    suggestion: hasError ? primaryIssue?.suggestion ?? (normalizeWhitespace(rawItem.suggestion || '').slice(0, 240) || null) : null,
    explanation: hasError ? primaryIssue?.explanation ?? truncateVietnameseExplanation(rawItem.explanation) : null,
    isGood: hasError ? false : true,
    feedbackDetails: { issues },
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
