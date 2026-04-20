import { VoiceGender } from '@prisma/client';
import { synthesizeElevenLabsSpeech, synthesizeOpenAISpeech } from '../../config/tts';
import {
  GetVoiceParams,
  ListVoicesQuery,
  PreviewVoiceInput,
} from '../../schemas/voices';
import * as voicesRepo from './voices.repository';

type VoiceProfileRecord = voicesRepo.VoiceProfileRecord;

function mapVoice(voice: VoiceProfileRecord) {
  return {
    id: voice.id,
    displayName: voice.displayName,
    description: voice.description,
    gender: voice.gender,
    locale: voice.locale,
    accent: voice.accent,
    styleTags: voice.styleTags,
    provider: voice.provider,
    realtimeProvider: voice.realtimeProvider,
    sampleText: voice.sampleText,
    sampleUrl: voice.sampleUrl,
    latencyTier: voice.latencyTier,
    isActive: voice.isActive,
  };
}

function uniqueVoices(voices: Array<VoiceProfileRecord | null | undefined>) {
  const map = new Map<string, VoiceProfileRecord>();

  for (const voice of voices) {
    if (!voice) continue;
    map.set(voice.id, voice);
  }

  return Array.from(map.values());
}

/**
 * Helper - getPreferredQuickPick
 * Summary: Chọn default voice cho scene khi user chưa explicit chọn một profile.
 */
function getPreferredQuickPick(preset: voicesRepo.SceneVoicePresetRecord | null) {
  return preset?.defaultVoice || preset?.defaultFemaleVoice || preset?.defaultMaleVoice || null;
}

/**
 * Function Objective - listVoices
 * Summary: Trả về voice catalog active có filter và phân trang.
 * Inputs: query search/gender/page/limit.
 * Returns: Summary, pagination metadata, và danh sách voice catalog.
 */
export async function listVoices(query: ListVoicesQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const skip = (page - 1) * limit;
  const search = query.search?.trim() || undefined;
  const gender = query.gender as VoiceGender | undefined;

  const [total, voices] = await Promise.all([
    voicesRepo.countVoices(search, gender),
    voicesRepo.findVoices({ skip, take: limit, search, gender }),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    summary: {
      totalVoices: total,
      returnedVoices: voices.length,
      search: search ?? null,
      gender: gender ?? null,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
    voices: voices.map(mapVoice),
  };
}

/**
 * Function Objective - getVoiceById
 * Summary: Lấy chi tiết một voice profile active.
 * Inputs: params id đã validate.
 * Returns: Voice detail an toàn cho client.
 */
export async function getVoiceById(params: GetVoiceParams) {
  const voice = await voicesRepo.findVoiceById(params.id);
  if (!voice) {
    throw Object.assign(new Error('Voice profile không tồn tại'), {
      code: 'VOICE_NOT_FOUND',
      status: 404,
    });
  }

  return {
    voice: mapVoice(voice),
  };
}

/**
 * Function Objective - getSceneVoices
 * Summary: Trả về quick picks và advanced voices phù hợp cho một scene.
 * Inputs: sceneId của scene active.
 * Returns: Scene summary, quick picks male/female/default, và danh sách advanced voices.
 */
export async function getSceneVoices(sceneId: string) {
  const [scene, preset, voices] = await Promise.all([
    voicesRepo.findSceneById(sceneId),
    voicesRepo.findSceneVoicePreset(sceneId),
    voicesRepo.findVoices({ skip: 0, take: 50 }),
  ]);

  if (!scene) {
    throw Object.assign(new Error('Kịch bản không tồn tại'), {
      code: 'SCENE_NOT_FOUND',
      status: 404,
    });
  }

  const quickPickVoices = uniqueVoices([
    preset?.defaultVoice,
    preset?.defaultMaleVoice,
    preset?.defaultFemaleVoice,
  ]);

  return {
    scene: {
      id: scene.id,
      title: scene.title,
      category: scene.category,
      characterName: scene.characterName,
      characterRole: scene.characterRole,
    },
    quickPicks: {
      default: preset?.defaultVoice ? mapVoice(preset.defaultVoice) : null,
      male: preset?.defaultMaleVoice ? mapVoice(preset.defaultMaleVoice) : null,
      female: preset?.defaultFemaleVoice ? mapVoice(preset.defaultFemaleVoice) : null,
    },
    advancedVoices: uniqueVoices([...quickPickVoices, ...voices]).map(mapVoice),
  };
}

/**
 * Function Objective - resolveVoiceSelection
 * Summary: Xác định voice profile cuối cùng cho scene trước khi tạo realtime session.
 * Inputs: sceneId và optional voiceProfileId user chọn.
 * Returns: Voice profile final đã được resolve từ explicit selection hoặc scene preset.
 */
export async function resolveVoiceSelection(sceneId: string, voiceProfileId?: string | null) {
  const [scene, preset, explicitVoice] = await Promise.all([
    voicesRepo.findSceneById(sceneId),
    voicesRepo.findSceneVoicePreset(sceneId),
    voiceProfileId ? voicesRepo.findVoiceById(voiceProfileId) : Promise.resolve(null),
  ]);

  if (!scene) {
    throw Object.assign(new Error('Kịch bản không tồn tại'), {
      code: 'SCENE_NOT_FOUND',
      status: 404,
    });
  }

  if (voiceProfileId && !explicitVoice) {
    throw Object.assign(new Error('Voice profile không tồn tại hoặc đã bị vô hiệu hóa'), {
      code: 'VOICE_NOT_FOUND',
      status: 404,
    });
  }

  const selectedVoice = explicitVoice || getPreferredQuickPick(preset);
  if (!selectedVoice) {
    throw Object.assign(new Error('Scene hiện chưa có voice preset khả dụng'), {
      code: 'VOICE_PRESET_NOT_FOUND',
      status: 409,
    });
  }

  return selectedVoice;
}

/**
 * Function Objective - resolveCustomPracticeVoiceSelection
 * Summary: Xác định voice profile cho custom practice từ explicit preset hoặc fallback theo gender.
 * Inputs: optional voiceProfileId và optional gender presentation của AI.
 * Returns: Voice profile final để gắn vào custom session.
 */
export async function resolveCustomPracticeVoiceSelection(
  voiceProfileId?: string | null,
  gender?: VoiceGender | null,
) {
  const explicitVoice = voiceProfileId ? await voicesRepo.findVoiceById(voiceProfileId) : null;

  if (voiceProfileId && !explicitVoice) {
    throw Object.assign(new Error('Voice profile không tồn tại hoặc đã bị vô hiệu hóa'), {
      code: 'VOICE_NOT_FOUND',
      status: 404,
    });
  }

  if (explicitVoice) {
    return explicitVoice;
  }

  const genderFallback =
    gender && gender !== VoiceGender.NEUTRAL
      ? await voicesRepo.findPreferredVoiceByGender(gender)
      : null;

  const selectedVoice = genderFallback || await voicesRepo.findAnyActiveVoice();
  if (!selectedVoice) {
    throw Object.assign(new Error('Hiện chưa có voice profile khả dụng cho custom practice'), {
      code: 'VOICE_PRESET_NOT_FOUND',
      status: 409,
    });
  }

  return selectedVoice;
}

/**
 * Function Objective - previewVoice
 * Summary: Sinh audio preview cho voice profile được chọn.
 * Inputs: voiceId và optional text override.
 * Behavior: Ưu tiên ElevenLabs preview nếu có providerVoiceId; fallback sang OpenAI TTS bằng realtimeVoiceId.
 * Returns: Buffer audio và metadata để controller stream binary cho client.
 */
export async function previewVoice(input: PreviewVoiceInput) {
  const voice = await voicesRepo.findVoiceById(input.voiceId);
  if (!voice) {
    throw Object.assign(new Error('Voice profile không tồn tại'), {
      code: 'VOICE_NOT_FOUND',
      status: 404,
    });
  }

  const text = input.text?.trim() || voice.sampleText || `Hello, I am ${voice.displayName}.`;

  if (voice.providerVoiceId) {
    try {
      const result = await synthesizeElevenLabsSpeech({
        text,
        voiceId: voice.providerVoiceId,
      });

      return {
        ...result,
        voice,
      };
    } catch (error) {
      if (!voice.realtimeVoiceId) {
        throw error;
      }
    }
  }

  if (!voice.realtimeVoiceId) {
    throw Object.assign(new Error('Voice profile chưa có realtime voice để fallback preview'), {
      code: 'VOICE_PROVIDER_NOT_CONFIGURED',
      status: 500,
    });
  }

  const fallback = await synthesizeOpenAISpeech({
    text,
    voice: voice.realtimeVoiceId,
    instructions: `Speak like the character profile: ${voice.displayName}. ${voice.description || ''}`.trim(),
  });

  return {
    ...fallback,
    voice,
  };
}
