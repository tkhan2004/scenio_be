import { ErrorType, MessageRole, SessionModality, VoiceProvider } from '@prisma/client';
import { buildVoiceLearningSummary } from './sessions.voice-learning.service';
import { SessionMessageRecord } from './sessions.repository';

type CoachingLocale = 'en' | 'vi';

type SpokenCoachingSessionContext = {
  hintCount: number;
  modality: SessionModality;
  voiceProvider: VoiceProvider | null;
  providerSessionId: string | null;
  voiceSnapshotName: string | null;
};

type SpokenCoachingMessageContext = Pick<
  SessionMessageRecord,
  | 'id'
  | 'role'
  | 'content'
  | 'turnIndex'
  | 'modality'
  | 'audioStartMs'
  | 'audioEndMs'
  | 'isFinal'
  | 'isHint'
  | 'hasError'
  | 'errorType'
  | 'suggestion'
  | 'explanation'
  | 'isGood'
>;

type SpokenCoachingInput = {
  session: SpokenCoachingSessionContext;
  messages: SpokenCoachingMessageContext[];
  locale?: CoachingLocale;
  aiCoaching?: {
    summary: string;
    strengths: string[];
    improvements: string[];
  } | null;
  scores: {
    grammar: number | null;
    vocabulary: number | null;
    naturalness: number | null;
  };
};

function clampScore(value: number, min = 0, max = 100) {
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

function getUserMessages(messages: SpokenCoachingMessageContext[]) {
  return messages.filter((message) => message.role === MessageRole.USER && !message.isHint);
}

function getAverage(numbers: number[]) {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function countByErrorType(messages: SpokenCoachingMessageContext[], errorType: ErrorType) {
  return messages.filter((message) => message.errorType === errorType && message.hasError).length;
}

function getBaseScore(value: number | null, fallback: number) {
  return typeof value === 'number' ? value : fallback;
}

function buildSummary(args: {
  expressionScore: number;
  clarityScore: number;
  confidenceScore: number;
  shortResponseRatio: number;
  hintCount: number;
  locale: CoachingLocale;
}) {
  const en = args.locale === 'en';
  if (args.expressionScore >= 78 && args.clarityScore >= 78 && args.confidenceScore >= 72) {
    return en
      ? 'You expressed your ideas clearly, naturally, and confidently enough for this scene.'
      : 'Bạn diễn đạt ý khá rõ, tự nhiên và đủ tự tin cho ngữ cảnh hội thoại này.';
  }

  if (args.shortResponseRatio >= 0.45) {
    return en
      ? 'You communicated the main idea, but many turns were short, so the conversation felt less confident.'
      : 'Bạn truyền được ý chính, nhưng nhiều lượt trả lời còn ngắn nên cảm giác chưa thật sự tự tin.';
  }

  if (args.clarityScore < 70) {
    return en
      ? 'Your ideas fit the context, but some wording or sentence structure was not clear enough.'
      : 'Bạn có ý đúng ngữ cảnh, nhưng cách diễn đạt đôi lúc chưa đủ rõ hoặc còn vấp ở cấu trúc câu.';
  }

  if (args.hintCount >= 2) {
    return en
      ? 'You followed the conversation, but you still relied on hints to keep speaking.'
      : 'Bạn bám được hội thoại, nhưng vẫn đang phụ thuộc khá nhiều vào hint để duy trì mạch nói.';
  }

  return en
    ? 'You handled this scene fairly well; next, make your replies a little longer and more natural.'
    : 'Bạn đang nói khá ổn trong ngữ cảnh này; bước tiếp theo là làm câu trả lời dài và tự nhiên hơn một chút.';
}

function buildStrengths(args: {
  grammar: number;
  vocabulary: number;
  naturalness: number;
  averageWordsPerTurn: number;
  questionCount: number;
  locale: CoachingLocale;
}) {
  const strengths: string[] = [];
  const en = args.locale === 'en';

  if (args.grammar >= 75) {
    strengths.push(en
      ? 'Your sentence structure was fairly solid with few major grammar issues.'
      : 'Cấu trúc câu tương đối ổn, ít lỗi ngữ pháp lớn.');
  }

  if (args.vocabulary >= 75) {
    strengths.push(en
      ? 'Your vocabulary fit the context and gave enough meaning.'
      : 'Từ vựng dùng khá hợp ngữ cảnh, không quá nghèo ý.');
  }

  if (args.naturalness >= 75) {
    strengths.push(en
      ? 'Your wording sounded natural and close to a real conversation.'
      : 'Cách diễn đạt nghe tự nhiên, khá giống hội thoại thật.');
  }

  if (args.averageWordsPerTurn >= 8) {
    strengths.push(en
      ? 'Most replies had enough detail and did not feel too short.'
      : 'Phần lớn câu trả lời đủ ý, không bị quá cụt.');
  }

  if (args.questionCount >= 1) {
    strengths.push(en
      ? 'You used questions to keep the conversation moving.'
      : 'Bạn biết dùng câu hỏi để giữ mạch hội thoại.');
  }

  if (strengths.length === 0) {
    strengths.push(en
      ? 'You still kept the conversation going and communicated the main idea.'
      : 'Bạn vẫn giữ được mạch hội thoại và truyền đạt được ý chính.');
  }

  return strengths.slice(0, 3);
}

function buildImprovements(args: {
  grammar: number;
  vocabulary: number;
  naturalness: number;
  shortResponseRatio: number;
  hintCount: number;
  grammarErrorCount: number;
  vocabularyErrorCount: number;
  naturalnessErrorCount: number;
  locale: CoachingLocale;
}) {
  const improvements: string[] = [];
  const en = args.locale === 'en';

  if (args.grammar < 72 || args.grammarErrorCount >= 2) {
    improvements.push(en
      ? 'Start with clear simple sentences before connecting longer ideas.'
      : 'Ưu tiên nói câu đơn rõ ràng trước, rồi mới nối ý dài hơn.');
  }

  if (args.vocabulary < 72 || args.vocabularyErrorCount >= 2) {
    improvements.push(en
      ? 'Add more specific words instead of repeating the same wording.'
      : 'Nên thêm từ cụ thể hơn thay vì lặp lại cùng một kiểu diễn đạt.');
  }

  if (args.naturalness < 72 || args.naturalnessErrorCount >= 2) {
    improvements.push(en
      ? 'Use more natural English phrasing instead of translating word by word.'
      : 'Hãy nói theo cách tự nhiên hơn, tránh dịch từng chữ từ tiếng Việt.');
  }

  if (args.shortResponseRatio >= 0.4) {
    improvements.push(en
      ? 'Add one more detail in each turn to sound more confident.'
      : 'Mỗi lượt trả lời nên thêm một chi tiết nữa để nghe tự tin hơn.');
  }

  if (args.hintCount >= 2) {
    improvements.push(en
      ? 'Try answering once by yourself before using a hint.'
      : 'Thử tự nói trước một lượt rồi mới dùng hint khi thật sự bí.');
  }

  if (improvements.length === 0) {
    improvements.push(en
      ? 'You can level up by expanding replies with a reason or example.'
      : 'Bạn có thể nâng level bằng cách mở rộng câu trả lời và thêm lý do hoặc ví dụ.');
  }

  return improvements.slice(0, 3);
}

function buildTurnHighlights(userMessages: SpokenCoachingMessageContext[], locale: CoachingLocale) {
  const en = locale === 'en';
  const issueMessages = userMessages
    .filter((message) => message.hasError)
    .sort((a, b) => a.turnIndex - b.turnIndex)
    .slice(0, 2)
    .map((message) => ({
      messageId: message.id,
      turnIndex: message.turnIndex,
      content: message.content,
      status: 'NEEDS_WORK' as const,
      focus: message.errorType ?? ErrorType.NATURALNESS,
      note: message.explanation || (en
        ? 'This sentence could be clearer and more natural.'
        : 'Câu này có thể diễn đạt tự nhiên và rõ hơn.'),
      suggestion: message.suggestion ?? null,
    }));

  const goodMessage = userMessages.find((message) => message.isGood && !message.hasError);
  const goodHighlight = goodMessage
    ? [{
        messageId: goodMessage.id,
        turnIndex: goodMessage.turnIndex,
        content: goodMessage.content,
        status: 'GOOD' as const,
        focus: 'GOOD_EXAMPLE' as const,
        note: en
          ? 'This sentence works well; keep using similar phrasing in later turns.'
          : 'Câu này ổn, có thể giữ cách diễn đạt tương tự ở các lượt sau.',
        suggestion: null,
      }]
    : [];

  return [...issueMessages, ...goodHighlight].slice(0, 3);
}

/**
 * Function Objective - buildSpokenCoachingSummary
 * Summary: Tổng hợp feedback transcript-level cho speaking session mà không cần pronunciation engine riêng.
 * Inputs: Session context, transcript messages, và 3 trục điểm đã có từ evaluator backend.
 * Behavior: Tính proxy scores cho expression/clarity/confidence -> rút ra strengths/improvements -> chọn vài turn highlights tiêu biểu.
 * Returns: Spoken coaching payload UI-friendly cho result screen hoặc completion response.
 */
export function buildSpokenCoachingSummary(input: SpokenCoachingInput) {
  const userMessages = getUserMessages(input.messages);
  if (userMessages.length === 0) {
    return null;
  }
  const locale = input.locale ?? 'vi';

  const grammar = getBaseScore(input.scores.grammar, 60);
  const vocabulary = getBaseScore(input.scores.vocabulary, 58);
  const naturalness = getBaseScore(input.scores.naturalness, 60);
  const wordCounts = userMessages.map((message) => getWords(message.content).length);
  const averageWordsPerTurn = Math.round(getAverage(wordCounts));
  const shortResponseCount = wordCounts.filter((count) => count <= 3).length;
  const shortResponseRatio = userMessages.length > 0 ? shortResponseCount / userMessages.length : 0;
  const questionCount = userMessages.filter((message) => message.content.includes('?')).length;
  const grammarErrorCount = countByErrorType(userMessages, ErrorType.GRAMMAR);
  const vocabularyErrorCount = countByErrorType(userMessages, ErrorType.VOCABULARY);
  const naturalnessErrorCount = countByErrorType(userMessages, ErrorType.NATURALNESS);
  const voiceLearning = buildVoiceLearningSummary(
    {
      modality: input.session.modality,
      voiceProvider: input.session.voiceProvider,
      providerSessionId: input.session.providerSessionId,
      voiceSnapshotName: input.session.voiceSnapshotName,
    },
    input.messages,
  );

  const expressionScore = clampScore(vocabulary * 0.55 + naturalness * 0.45, 35, 96);
  const clarityScore = clampScore(grammar * 0.6 + naturalness * 0.4, 35, 96);
  const confidenceBase = 48
    + Math.min(averageWordsPerTurn * 3.5, 24)
    + Math.min(userMessages.length * 2.5, 12)
    + (voiceLearning?.speakingMetrics.transcriptTimingCoverage ?? 0) * 0.05
    - input.session.hintCount * 4
    - shortResponseCount * 4;
  const confidenceScore = clampScore(confidenceBase, 30, 94);
  const aiCoaching = input.aiCoaching;

  return {
    available: true,
    mode: aiCoaching ? 'AI_TRANSCRIPT_BASED' : 'TRANSCRIPT_BASED',
    summary: aiCoaching?.summary || buildSummary({
      expressionScore,
      clarityScore,
      confidenceScore,
      shortResponseRatio,
      hintCount: input.session.hintCount,
      locale,
    }),
    scores: {
      expression: expressionScore,
      clarity: clarityScore,
      confidence: confidenceScore,
    },
    strengths: aiCoaching?.strengths?.length ? aiCoaching.strengths.slice(0, 3) : buildStrengths({
      grammar,
      vocabulary,
      naturalness,
      averageWordsPerTurn,
      questionCount,
      locale,
    }),
    improvements: aiCoaching?.improvements?.length ? aiCoaching.improvements.slice(0, 3) : buildImprovements({
      grammar,
      vocabulary,
      naturalness,
      shortResponseRatio,
      hintCount: input.session.hintCount,
      grammarErrorCount,
      vocabularyErrorCount,
      naturalnessErrorCount,
      locale,
    }),
    turnHighlights: buildTurnHighlights(userMessages, locale),
    behaviorSignals: {
      userTurnCount: userMessages.length,
      hintCount: input.session.hintCount,
      averageWordsPerTurn,
      shortResponseCount,
      questionCount,
    },
    note: locale === 'en'
      ? 'This coaching is based on transcript and expression, not pronunciation scoring yet.'
      : 'Đây là coaching dựa trên transcript và cách diễn đạt, chưa phải chấm phát âm.',
  };
}
