import { createRealtimeClientSecret, getRealtimeDefaults } from '../../config/realtime';
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

  return `You are roleplaying as ${source.characterName}, the ${source.characterRole}, in the conversation "${source.title}".

Scenio session rules:
- Stay in character at all times.
- Speak only in English.
- Keep replies concise and natural for a ${level} learner.
- Use short turns that are easy to follow in voice conversation.
- Treat this like a live call, not a scripted lesson.
- Help the learner complete this mission: ${source.missionText}
- Match this voice/persona: ${voiceLabel} (${styleTags})
- Encourage the learner naturally, but do not turn into a teacher unless explicitly asked.
- If the learner struggles, simplify your wording while staying in character.
- Avoid long monologues.
- Ask at most one clear question at a time.
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

/**
 * Function Objective - createRealtimeTokenForSession
 * Summary: Gọi OpenAI Realtime API để mint client secret cho session ACTIVE hiện tại.
 * Inputs: Session context đã bao gồm scene, user, voiceProfile.
 * Returns: Client secret, session config, và selected voice metadata cho WebRTC client.
 */
export async function createRealtimeTokenForSession(session: SessionContextRecord) {
  const defaults = getRealtimeDefaults();
  const selectedVoice = session.voiceProfile?.realtimeVoiceId || defaults.voice;
  const instructions = buildRealtimeInstructions(session);
  const voiceContract = getVoiceTranscriptStrategy();

  const realtime = await createRealtimeClientSecret({
    instructions,
    voice: selectedVoice,
    model: defaults.model,
  });

  return {
    ...realtime,
    sessionConfig: {
      model: realtime.model,
      voice: realtime.voice,
      transcriptionModel: defaults.transcriptionModel,
      turnDetection: 'server_vad',
      outputModalities: ['audio', 'text'],
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
          realtimeVoiceId: session.voiceProfile.realtimeVoiceId,
        }
      : {
          id: null,
          displayName: session.voiceSnapshotName,
          gender: null,
          locale: null,
          accent: null,
          realtimeVoiceId: selectedVoice,
        },
  };
}
