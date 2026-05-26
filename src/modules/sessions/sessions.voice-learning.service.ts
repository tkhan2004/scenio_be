import { MessageModality, MessageRole, SessionModality, VoiceProvider } from '@prisma/client';
import { getRealtimeDefaults } from '../../config/realtime';
import { SessionMessageRecord } from './sessions.repository';

const AUDIO_PCM_FORMAT = 'audio/pcm@24000';

type VoiceLearningSessionContext = {
  modality: SessionModality;
  voiceProvider: VoiceProvider | null;
  providerSessionId: string | null;
  voiceSnapshotName: string | null;
};

type VoiceLearningMessageContext = Pick<
  SessionMessageRecord,
  'role' | 'modality' | 'audioStartMs' | 'audioEndMs' | 'isHint' | 'isFinal' | 'content'
>;

/**
 * Helper - normalizeTranscriptContent
 * Summary: Chuẩn hóa transcript text trước khi lưu để giảm nhiễu whitespace/punctuation.
 * Notes: Không cố sửa ngữ pháp; chỉ làm sạch format cho evaluator và result screen.
 */
export function normalizeTranscriptContent(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\s+([?.!,;:])/g, '$1')
    .trim();
}

/**
 * Helper - getVoiceTranscriptStrategy
 * Summary: Trả về contract thống nhất cho voice transcript sync giữa mobile và backend.
 */
export function getVoiceTranscriptStrategy() {
  const defaults = getRealtimeDefaults();

  return {
    transport: {
      type: 'WEBRTC_DIRECT',
      turnDetection: 'server_vad',
      transcriptionModel: defaults.transcriptionModel,
      inputAudioFormat: AUDIO_PCM_FORMAT,
      outputAudioFormat: AUDIO_PCM_FORMAT,
    },
    transcriptStrategy: {
      partialTranscript: 'IGNORE',
      finalTranscript: 'STORE_AND_EVALUATE',
      syncEndpoint: '/api/sessions/:id/message',
      completionEndpoint: '/api/sessions/:id/complete',
    },
    eventModel: {
      userAudioSource: 'USER_AUDIO',
      aiAudioSource: 'AI_AUDIO',
      finalOnlySync: true,
      providerSessionIdField: 'providerSessionId',
    },
  } as const;
}

function isAudioTranscriptMessage(message: VoiceLearningMessageContext) {
  return message.modality === MessageModality.AUDIO_TRANSCRIPT && message.isFinal;
}

function getAudioDurationMs(message: VoiceLearningMessageContext) {
  if (
    typeof message.audioStartMs !== 'number'
    || typeof message.audioEndMs !== 'number'
    || message.audioEndMs <= message.audioStartMs
  ) {
    return 0;
  }

  return message.audioEndMs - message.audioStartMs;
}

/**
 * Function Objective - buildVoiceLearningSummary
 * Summary: Tổng hợp metadata học nói cho voice session từ transcript final và audio timing đã sync.
 * Inputs: Session context tối thiểu và toàn bộ messages đã lưu.
 * Behavior: Chỉ bật summary cho VOICE session hoặc session có audio transcript -> tính speaking metrics -> trả contract UI-friendly.
 * Returns: Voice learning payload hoặc null nếu session text không có audio transcript.
 */
export function buildVoiceLearningSummary(
  session: VoiceLearningSessionContext,
  messages: VoiceLearningMessageContext[],
) {
  const hasAudioTranscript = messages.some(isAudioTranscriptMessage);
  const isVoiceSession = session.modality === SessionModality.VOICE || hasAudioTranscript;
  if (!isVoiceSession) {
    return null;
  }

  const defaults = getRealtimeDefaults();
  const userAudioMessages = messages.filter((message) => (
    message.role === MessageRole.USER
    && message.isHint === false
    && isAudioTranscriptMessage(message)
  ));
  const aiAudioMessages = messages.filter((message) => (
    message.role === MessageRole.AI
    && message.isHint === false
    && isAudioTranscriptMessage(message)
  ));

  const totalUserSpeechMs = userAudioMessages.reduce((sum, message) => sum + getAudioDurationMs(message), 0);
  const totalAiSpeechMs = aiAudioMessages.reduce((sum, message) => sum + getAudioDurationMs(message), 0);
  const timedUserTurns = userAudioMessages.filter((message) => getAudioDurationMs(message) > 0).length;
  const transcriptTimingCoverage = userAudioMessages.length > 0
    ? Math.round((timedUserTurns / userAudioMessages.length) * 100)
    : 0;
  const averageUserTurnDurationMs = userAudioMessages.length > 0
    ? Math.round(totalUserSpeechMs / userAudioMessages.length)
    : null;

  return {
    available: true,
    mode: 'REALTIME_TRANSCRIPT',
    realtimeProvider: session.voiceProvider ?? VoiceProvider.OPENAI,
    providerSessionId: session.providerSessionId,
    voiceSnapshotName: session.voiceSnapshotName,
    transport: {
      type: 'WEBRTC_DIRECT',
      turnDetection: 'server_vad',
      transcriptionModel: defaults.transcriptionModel,
      inputAudioFormat: AUDIO_PCM_FORMAT,
      outputAudioFormat: AUDIO_PCM_FORMAT,
    },
    transcriptStrategy: {
      partialTranscript: 'IGNORE',
      finalTranscript: 'STORE_AND_EVALUATE',
      syncEndpoint: '/api/sessions/:id/message',
      completionEndpoint: '/api/sessions/:id/complete',
    },
    eventModel: {
      userAudioSource: 'USER_AUDIO',
      aiAudioSource: 'AI_AUDIO',
      finalOnlySync: true,
      providerSessionIdField: 'providerSessionId',
    },
    speakingMetrics: {
      userAudioTurns: userAudioMessages.length,
      aiAudioTurns: aiAudioMessages.length,
      totalUserSpeechMs,
      totalAiSpeechMs,
      averageUserTurnDurationMs,
      transcriptTimingCoverage,
    },
    pronunciation: {
      available: false,
      mode: 'NOT_IMPLEMENTED_YET',
      score: null,
      note: 'Chưa có pronunciation assessment thật; hiện backend mới có transcript và audio timing foundation.',
    },
  };
}
