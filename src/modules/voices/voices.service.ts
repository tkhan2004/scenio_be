import { VoiceGender } from '@prisma/client';
import { synthesizeElevenLabsSpeech, synthesizeOpenAISpeech } from '../../config/tts';
import {
  GetVoiceParams,
  ListVoicesQuery,
  PreviewVoiceInput,
} from '../../schemas/voices';
import * as voicesRepo from './voices.repository';

type VoiceProfileRecord = voicesRepo.VoiceProfileRecord;

type ScenePresetSlot = 'default' | 'female' | 'male' | null;

export type VoiceSelectionPolicy = {
  source:
    | 'EXPLICIT_SELECTION'
    | 'SCENE_DEFAULT_PRESET'
    | 'SCENE_FEMALE_PRESET'
    | 'SCENE_MALE_PRESET'
    | 'CUSTOM_RULE_BASED'
    | 'GLOBAL_FALLBACK';
  usedFallback: boolean;
  scenePresetSlot: ScenePresetSlot;
  requested: {
    voiceProfileId: string | null;
    gender: VoiceGender | null;
    accentPreference: string | null;
    voiceTone: string | null;
  };
  matched: {
    gender: VoiceGender | null;
    accent: string | null;
    tone: string | null;
  };
};

export type ResolvedVoiceSelection = {
  voice: VoiceProfileRecord;
  policy: VoiceSelectionPolicy;
};

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
 * Helper - normalizeLookupToken
 * Summary: Chuẩn hóa token text để so khớp accent/style linh hoạt hơn.
 */
function normalizeLookupToken(value: string | null | undefined) {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function getAccentAliases(value: string) {
  const normalized = normalizeLookupToken(value);
  const aliases = new Set([normalized]);

  if (['us', 'usa', 'american', 'en us'].includes(normalized)) {
    aliases.add('american');
    aliases.add('us');
    aliases.add('en us');
  }

  if (['uk', 'british', 'en gb'].includes(normalized)) {
    aliases.add('british');
    aliases.add('uk');
    aliases.add('en gb');
  }

  if (['au', 'australian', 'en au'].includes(normalized)) {
    aliases.add('australian');
    aliases.add('au');
    aliases.add('en au');
  }

  return Array.from(aliases);
}

function matchesAccent(voice: VoiceProfileRecord, accentPreference?: string | null) {
  const requested = normalizeLookupToken(accentPreference);
  if (!requested) return false;

  const haystacks = [
    normalizeLookupToken(voice.accent),
    normalizeLookupToken(voice.locale),
    normalizeLookupToken(voice.displayName),
    normalizeLookupToken(voice.description),
  ].filter(Boolean);

  return getAccentAliases(requested).some((alias) => haystacks.some((haystack) => haystack.includes(alias)));
}

function matchesTone(voice: VoiceProfileRecord, voiceTone?: string | null) {
  const requested = normalizeLookupToken(voiceTone);
  if (!requested) return false;

  const styleTags = (voice.styleTags || []).map(normalizeLookupToken);
  if (styleTags.some((tag) => tag.includes(requested) || requested.includes(tag))) {
    return true;
  }

  const searchable = [
    normalizeLookupToken(voice.displayName),
    normalizeLookupToken(voice.description),
  ].filter(Boolean);

  return searchable.some((field) => field.includes(requested));
}

/**
 * Helper - getScenePresetSelection
 * Summary: Trả về quick-pick voice và slot preset tương ứng của scene.
 */
function getScenePresetSelection(preset: voicesRepo.SceneVoicePresetRecord | null) {
  if (preset?.defaultVoice) {
    return { voice: preset.defaultVoice, slot: 'default' as const };
  }

  if (preset?.defaultFemaleVoice) {
    return { voice: preset.defaultFemaleVoice, slot: 'female' as const };
  }

  if (preset?.defaultMaleVoice) {
    return { voice: preset.defaultMaleVoice, slot: 'male' as const };
  }

  return { voice: null, slot: null };
}

function buildSelectionPolicy(input: {
  source: VoiceSelectionPolicy['source'];
  usedFallback: boolean;
  scenePresetSlot?: ScenePresetSlot;
  requestedVoiceProfileId?: string | null;
  requestedGender?: VoiceGender | null;
  requestedAccentPreference?: string | null;
  requestedVoiceTone?: string | null;
  matchedGender?: VoiceGender | null;
  matchedAccent?: string | null;
  matchedTone?: string | null;
}): VoiceSelectionPolicy {
  return {
    source: input.source,
    usedFallback: input.usedFallback,
    scenePresetSlot: input.scenePresetSlot ?? null,
    requested: {
      voiceProfileId: input.requestedVoiceProfileId ?? null,
      gender: input.requestedGender ?? null,
      accentPreference: input.requestedAccentPreference?.trim() || null,
      voiceTone: input.requestedVoiceTone?.trim() || null,
    },
    matched: {
      gender: input.matchedGender ?? null,
      accent: input.matchedAccent ?? null,
      tone: input.matchedTone ?? null,
    },
  };
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

  if (explicitVoice) {
    return {
      voice: explicitVoice,
      policy: buildSelectionPolicy({
        source: 'EXPLICIT_SELECTION',
        usedFallback: false,
        requestedVoiceProfileId: voiceProfileId,
        matchedGender: explicitVoice.gender,
        matchedAccent: explicitVoice.accent,
      }),
    } satisfies ResolvedVoiceSelection;
  }

  const presetSelection = getScenePresetSelection(preset);
  if (presetSelection.voice) {
    return {
      voice: presetSelection.voice,
      policy: buildSelectionPolicy({
        source:
          presetSelection.slot === 'default'
            ? 'SCENE_DEFAULT_PRESET'
            : presetSelection.slot === 'female'
              ? 'SCENE_FEMALE_PRESET'
              : 'SCENE_MALE_PRESET',
        usedFallback: false,
        scenePresetSlot: presetSelection.slot,
        matchedGender: presetSelection.voice.gender,
        matchedAccent: presetSelection.voice.accent,
      }),
    } satisfies ResolvedVoiceSelection;
  }

  const fallbackVoice = await voicesRepo.findAnyActiveVoice();
  if (fallbackVoice) {
    return {
      voice: fallbackVoice,
      policy: buildSelectionPolicy({
        source: 'GLOBAL_FALLBACK',
        usedFallback: true,
        requestedVoiceProfileId: voiceProfileId,
        matchedGender: fallbackVoice.gender,
        matchedAccent: fallbackVoice.accent,
      }),
    } satisfies ResolvedVoiceSelection;
  }

  throw Object.assign(new Error('Scene hiện chưa có voice preset khả dụng'), {
    code: 'VOICE_PRESET_NOT_FOUND',
    status: 409,
  });
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
  accentPreference?: string | null,
  voiceTone?: string | null,
) {
  const explicitVoice = voiceProfileId ? await voicesRepo.findVoiceById(voiceProfileId) : null;
  const requestedGender = gender && gender !== VoiceGender.NEUTRAL ? gender : null;

  if (voiceProfileId && !explicitVoice) {
    throw Object.assign(new Error('Voice profile không tồn tại hoặc đã bị vô hiệu hóa'), {
      code: 'VOICE_NOT_FOUND',
      status: 404,
    });
  }

  const explicitMatchesRequestedGender = !requestedGender || !explicitVoice || explicitVoice.gender === requestedGender;

  if (explicitVoice && explicitMatchesRequestedGender) {
    return {
      voice: explicitVoice,
      policy: buildSelectionPolicy({
        source: 'EXPLICIT_SELECTION',
        usedFallback: false,
        requestedVoiceProfileId: voiceProfileId,
        requestedGender,
        requestedAccentPreference: accentPreference,
        requestedVoiceTone: voiceTone,
        matchedGender: explicitVoice.gender,
        matchedAccent: explicitVoice.accent,
        matchedTone: matchesTone(explicitVoice, voiceTone) ? voiceTone?.trim() || null : null,
      }),
    } satisfies ResolvedVoiceSelection;
  }

  const allVoices = await voicesRepo.findAllActiveVoices();
  if (allVoices.length === 0) {
    throw Object.assign(new Error('Hiện chưa có voice profile khả dụng cho custom practice'), {
      code: 'VOICE_PRESET_NOT_FOUND',
      status: 409,
    });
  }

  const genderMatchedVoices = requestedGender
    ? allVoices.filter((voice) => voice.gender === requestedGender)
    : allVoices;
  const candidateVoices = genderMatchedVoices.length > 0 ? genderMatchedVoices : allVoices;
  const scoredVoices = candidateVoices
    .map((voice) => {
      const matchedGender = requestedGender ? voice.gender === requestedGender : false;
      const matchedAccent = matchesAccent(voice, accentPreference);
      const matchedTone = matchesTone(voice, voiceTone);
      const score = (matchedAccent ? 25 : 0) + (matchedTone ? 20 : 0);

      return {
        voice,
        score,
        matchedGender,
        matchedAccent,
        matchedTone,
      };
    })
    .sort((a, b) => b.score - a.score || a.voice.displayName.localeCompare(b.voice.displayName));

  const bestMatch = scoredVoices[0];
  if (bestMatch && (bestMatch.score > 0 || Boolean(requestedGender))) {
    return {
      voice: bestMatch.voice,
      policy: buildSelectionPolicy({
        source: 'CUSTOM_RULE_BASED',
        usedFallback: false,
        requestedVoiceProfileId: voiceProfileId,
        requestedGender,
        requestedAccentPreference: accentPreference,
        requestedVoiceTone: voiceTone,
        matchedGender: bestMatch.matchedGender ? bestMatch.voice.gender : null,
        matchedAccent: bestMatch.matchedAccent ? bestMatch.voice.accent : null,
        matchedTone: bestMatch.matchedTone ? voiceTone?.trim() || null : null,
      }),
    } satisfies ResolvedVoiceSelection;
  }

  const fallbackVoice = candidateVoices[0];
  return {
    voice: fallbackVoice,
    policy: buildSelectionPolicy({
      source: 'GLOBAL_FALLBACK',
      usedFallback: requestedGender ? genderMatchedVoices.length === 0 : true,
      requestedVoiceProfileId: voiceProfileId,
      requestedGender,
      requestedAccentPreference: accentPreference,
      requestedVoiceTone: voiceTone,
      matchedGender: requestedGender && fallbackVoice.gender === requestedGender ? fallbackVoice.gender : null,
      matchedAccent: fallbackVoice.accent,
    }),
  } satisfies ResolvedVoiceSelection;
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
