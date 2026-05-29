import { AiFeatureType, AiProvider } from '@prisma/client';
import { createRealtimeClientSecret, getRealtimeDefaults } from '../../config/realtime';
import { getAiFeatureRuntimePlan } from '../ai-models/ai-models.service';
import { SessionContextRecord } from './sessions.repository';
import { getVoiceTranscriptStrategy } from './sessions.voice-learning.service';

function getConversationSource(session: SessionContextRecord) {
  if (session.sourceType === 'CUSTOM_PRACTICE' && session.customPracticeConfig) {
    return {
      title: session.customPracticeConfig.displayTitle,
      category: session.customPracticeConfig.contextType,
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
    title: session.scene.title,
    category: session.scene.category,
    description: session.scene.description,
    missionText: session.scene.missionText,
    characterName: session.scene.characterName,
    characterRole: session.scene.characterRole,
    systemPrompt: session.scene.systemPrompt,
  };
}

/**
 * Helper - buildRealtimeInstructions
 * Summary: Tạo instructions cho OpenAI Realtime từ scene, level, mission, và persona voice đã chọn.
 */
function buildRealtimeInstructions(session: SessionContextRecord) {
  const source = getConversationSource(session);
  const level = session.user.level;
  const learningGoal = session.user.learningGoal || 'GENERAL_ENGLISH';
  const voiceLabel = session.voiceProfile?.displayName || session.voiceSnapshotName || 'Scenio Voice';
  const styleTags = session.voiceProfile?.styleTags?.join(', ') || 'clear, friendly';
  const characterRole = session.sourceType === 'CUSTOM_PRACTICE'
    ? 'the assigned conversation partner'
    : source.characterRole;

  return `You are roleplaying as ${source.characterName}, the ${characterRole}, in the conversation "${source.title}".

Scenio session rules:
- Stay in character at all times.
- Speak only in English.
- If any scene/persona/context field is written in Vietnamese or another language, silently interpret it and speak in natural English only.
- Keep replies concise and natural for a ${level} learner.
- Use short turns that are easy to follow in voice conversation.
- Treat this like a live call, not a scripted lesson.
- Help the learner complete this mission: ${source.missionText}
- Match this voice/persona: ${voiceLabel} (${styleTags})
- Encourage the learner naturally, but do not turn into a teacher unless explicitly asked.
- If the learner struggles, simplify your wording while staying in character.
- Avoid long monologues.
- Ask at most one clear question at a time.
- After each reply, stop speaking and wait for the learner's next turn.
- Never create multiple back-to-back replies for one learner utterance.
- Do not output stage directions, labels, or markdown.
- Do not mention transcription, latency, or backend systems.

Learner context:
- English level: ${level}
- Learning goal: ${learningGoal}
- Self assessment: ${session.user.selfAssessment || 'unknown'}

Scene context:
- Conversation type: ${source.category}
- Description: ${source.description}

Your job:
- have a natural conversation
- move the dialogue toward the mission goal
- sound like a believable human conversation partner`;
}

function uniqueValues(values: Array<string | null | undefined>) {
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .filter((value, index, array) => array.indexOf(value) === index);
}

const SUPPORTED_REALTIME_VOICES = new Set([
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'sage',
  'shimmer',
  'verse',
  'marin',
  'cedar',
]);

function normalizeRealtimeVoice(voice: string | null | undefined) {
  const normalized = voice?.trim().toLowerCase();
  return normalized && SUPPORTED_REALTIME_VOICES.has(normalized) ? normalized : null;
}

function getRealtimeVoiceCandidates(
  selectedVoice: string,
  gender: string | null | undefined,
  defaultVoice: string,
) {
  const supportedSelectedVoice = normalizeRealtimeVoice(selectedVoice);
  const supportedDefaultVoice = normalizeRealtimeVoice(defaultVoice);
  const genderFallbacks = gender === 'MALE'
    ? ['echo', 'ash', 'alloy', 'cedar']
    : gender === 'FEMALE'
      ? [supportedSelectedVoice, 'marin', 'verse', 'shimmer']
      : [supportedSelectedVoice, 'marin', 'echo', 'alloy'];

  return uniqueValues([...genderFallbacks, supportedSelectedVoice, supportedDefaultVoice, 'marin']);
}

function getPreferredTranscriptionModel(
  sttModels: Array<{ modelId: string }>,
  defaultModel: string,
) {
  return sttModels.find((model) => model.modelId === 'gpt-4o-transcribe')?.modelId
    ?? sttModels.find((model) => model.modelId === 'gpt-4o-transcribe-latest')?.modelId
    ?? sttModels[0]?.modelId
    ?? defaultModel;
}

function buildRealtimeTranscriptionPrompt(session: SessionContextRecord) {
  const source = getConversationSource(session);

  return [
    'Transcribe only the learner speech in English.',
    'The speaker is an English learner. Preserve grammar mistakes, hesitations, repeated words, and unnatural word choice exactly.',
    'Do not correct, translate, summarize, or make the learner sound more fluent.',
    `Conversation context: ${source.title}. Mission: ${source.missionText}. AI partner: ${source.characterName}.`,
  ].join(' ');
}

/**
 * Function Objective - createRealtimeTokenForSession
 * Summary: Gọi OpenAI Realtime API để mint client secret cho session ACTIVE hiện tại.
 * Inputs: Session context đã bao gồm scene, user, voiceProfile.
 * Returns: Client secret, session config, và selected voice metadata cho WebRTC client.
 */
export async function createRealtimeTokenForSession(session: SessionContextRecord) {
  const defaults = getRealtimeDefaults();
  const realtimePlan = await getAiFeatureRuntimePlan(AiFeatureType.REALTIME_VOICE);
  const sttPlan = await getAiFeatureRuntimePlan(AiFeatureType.STT);
  const selectedVoice = session.voiceProfile?.realtimeVoiceId || defaults.voice;
  const instructions = buildRealtimeInstructions(session);
  const voiceContract = getVoiceTranscriptStrategy();
  const realtimeModels = realtimePlan.models.filter((model) => model.provider === AiProvider.OPENAI);
  const sttModels = sttPlan.models.filter((model) => model.provider === AiProvider.OPENAI);
  const candidateRealtimeModels = realtimeModels.length > 0 ? realtimeModels.map((model) => model.modelId) : [defaults.model];
  const candidateVoices = getRealtimeVoiceCandidates(
    selectedVoice,
    session.voiceProfile?.gender ?? null,
    defaults.voice,
  );
  const transcriptionModel = getPreferredTranscriptionModel(sttModels, defaults.transcriptionModel);
  const transcriptionPrompt = buildRealtimeTranscriptionPrompt(session);

  let realtime: Awaited<ReturnType<typeof createRealtimeClientSecret>> | null = null;
  const errors: string[] = [];

  for (const realtimeModel of candidateRealtimeModels) {
    for (const voice of candidateVoices) {
      try {
        realtime = await createRealtimeClientSecret({
          instructions,
          voice,
          model: realtimeModel,
          transcriptionModel,
          transcriptionPrompt,
        });
        break;
      } catch (error: any) {
        errors.push(`${realtimeModel}/${voice}: ${error?.message ?? 'unknown error'}`);
      }
    }

    if (realtime) {
      break;
    }
  }

  if (!realtime) {
    throw Object.assign(new Error('Không thể tạo realtime token từ primary hoặc fallback models'), {
      code: 'AI_ENGINE_ERROR',
      status: 502,
      details: errors.map((message) => ({ field: 'fallback', message })),
    });
  }

  return {
    ...realtime,
    sessionConfig: {
      model: realtime.model,
      voice: realtime.voice,
      transcriptionModel,
      turnDetection: 'server_vad',
      outputModalities: ['audio'],
      instructions,
      transport: voiceContract.transport,
      transcriptStrategy: voiceContract.transcriptStrategy,
      eventModel: voiceContract.eventModel,
    },
    selectedVoice: session.voiceProfile
      ? {
          id: session.voiceProfile.id,
          displayName: session.voiceProfile.displayName,
          gender: session.voiceProfile.gender,
          locale: session.voiceProfile.locale,
          accent: session.voiceProfile.accent,
          realtimeVoiceId: realtime.voice,
        }
      : {
          id: null,
          displayName: session.voiceSnapshotName,
          gender: null,
          locale: null,
          accent: null,
          realtimeVoiceId: realtime.voice,
        },
  };
}
