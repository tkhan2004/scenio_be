import { Scene, SceneVoicePreset, VoiceGender, VoiceProfile, VoiceProvider } from '@prisma/client';
import { SeedEntityMap, prisma } from './helpers';

type VoiceSeedDefinition = {
  key: string;
  displayName: string;
  description: string;
  gender: VoiceGender;
  locale: string;
  accent: string;
  providerVoiceId: string;
  realtimeVoiceId: string;
  styleTags: string[];
  sampleText: string;
  latencyTier: string;
};

type VoicePresetSeedResult = {
  voices: SeedEntityMap<VoiceProfile>;
  sceneVoicePresets: SeedEntityMap<SceneVoicePreset>;
};

function getVoiceIds() {
  const defaultVoiceId = process.env.ELEVENLABS_VOICE_ID?.trim() || 'JBFqnCBsd6RMkjVDRZzb';
  const maleVoiceId = process.env.ELEVENLABS_MALE_VOICE_ID?.trim() || 'pNInz6obpgDQGcFmaJgB';
  const femaleVoiceId = process.env.ELEVENLABS_FEMALE_VOICE_ID?.trim() || defaultVoiceId;

  return {
    defaultVoiceId,
    maleVoiceId,
    femaleVoiceId,
  };
}

async function upsertVoiceProfile(definition: VoiceSeedDefinition) {
  const existing = await prisma.voiceProfile.findFirst({
    where: { displayName: definition.displayName },
    select: { id: true },
  });

  const data = {
    displayName: definition.displayName,
    description: definition.description,
    gender: definition.gender,
    locale: definition.locale,
    accent: definition.accent,
    provider: VoiceProvider.ELEVENLABS,
    providerVoiceId: definition.providerVoiceId,
    realtimeProvider: VoiceProvider.OPENAI,
    realtimeVoiceId: definition.realtimeVoiceId,
    styleTags: definition.styleTags,
    sampleText: definition.sampleText,
    latencyTier: definition.latencyTier,
    isActive: true,
  };

  if (existing) {
    return prisma.voiceProfile.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.voiceProfile.create({ data });
}

async function upsertSceneVoicePreset(sceneId: string, data: {
  defaultVoiceId?: string | null;
  defaultMaleVoiceId?: string | null;
  defaultFemaleVoiceId?: string | null;
}) {
  const existing = await prisma.sceneVoicePreset.findUnique({
    where: { sceneId },
    select: { id: true },
  });

  if (existing) {
    return prisma.sceneVoicePreset.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.sceneVoicePreset.create({
    data: {
      sceneId,
      ...data,
    },
  });
}

export async function seedVoices(scenes: SeedEntityMap<Scene>): Promise<VoicePresetSeedResult> {
  const { defaultVoiceId, maleVoiceId, femaleVoiceId } = getVoiceIds();

  const definitions: VoiceSeedDefinition[] = [
    {
      key: 'annaWarm',
      displayName: 'Anna - Warm Receptionist',
      description: 'Female voice for welcoming hospitality and front-desk scenes.',
      gender: VoiceGender.FEMALE,
      locale: 'en-US',
      accent: 'American',
      providerVoiceId: femaleVoiceId,
      realtimeVoiceId: 'marin',
      styleTags: ['warm', 'helpful', 'hospitality'],
      sampleText: 'Welcome to Scenio. I am here to help you feel comfortable speaking English.',
      latencyTier: 'fast',
    },
    {
      key: 'kenPolite',
      displayName: 'Ken - Polite Airport Staff',
      description: 'Male voice for airport, check-in, and travel support scenes.',
      gender: VoiceGender.MALE,
      locale: 'en-US',
      accent: 'American',
      providerVoiceId: maleVoiceId,
      realtimeVoiceId: 'cedar',
      styleTags: ['professional', 'travel', 'clear'],
      sampleText: 'Good afternoon. I can help you with your flight and check-in questions.',
      latencyTier: 'fast',
    },
    {
      key: 'miaCheerful',
      displayName: 'Mia - Cheerful Cafe Clerk',
      description: 'Bright female voice for daily and cafe conversation scenes.',
      gender: VoiceGender.FEMALE,
      locale: 'en-US',
      accent: 'American',
      providerVoiceId: femaleVoiceId,
      realtimeVoiceId: 'verse',
      styleTags: ['cheerful', 'daily', 'casual'],
      sampleText: 'Hi there. What would you like to order today?',
      latencyTier: 'fast',
    },
    {
      key: 'omarCalm',
      displayName: 'Omar - Calm Travel Guide',
      description: 'Calm male voice for taxi, travel, and navigation contexts.',
      gender: VoiceGender.MALE,
      locale: 'en-US',
      accent: 'American',
      providerVoiceId: maleVoiceId,
      realtimeVoiceId: 'alloy',
      styleTags: ['calm', 'travel', 'practical'],
      sampleText: 'No problem. Tell me your destination and I will help you get there.',
      latencyTier: 'fast',
    },
    {
      key: 'ninaSocial',
      displayName: 'Nina - Friendly Networking Partner',
      description: 'Natural female voice for social and networking conversations.',
      gender: VoiceGender.FEMALE,
      locale: 'en-US',
      accent: 'American',
      providerVoiceId: defaultVoiceId,
      realtimeVoiceId: 'shimmer',
      styleTags: ['social', 'friendly', 'networking'],
      sampleText: 'Nice to meet you. I would love to hear more about what you do.',
      latencyTier: 'balanced',
    },
    {
      key: 'ethanLeader',
      displayName: 'Ethan - Direct Team Lead',
      description: 'Confident male voice for work and standup style discussions.',
      gender: VoiceGender.MALE,
      locale: 'en-US',
      accent: 'American',
      providerVoiceId: maleVoiceId,
      realtimeVoiceId: 'onyx',
      styleTags: ['work', 'direct', 'structured'],
      sampleText: 'Let us keep this update concise. What did you finish and what is blocking you?',
      latencyTier: 'balanced',
    },
  ];

  const voices: SeedEntityMap<VoiceProfile> = {};
  for (const definition of definitions) {
    voices[definition.key] = await upsertVoiceProfile(definition);
  }

  const sceneVoicePresets: SeedEntityMap<SceneVoicePreset> = {};

  sceneVoicePresets.coffeeShop = await upsertSceneVoicePreset(scenes.coffeeShop.id, {
    defaultVoiceId: voices.miaCheerful.id,
    defaultMaleVoiceId: voices.omarCalm.id,
    defaultFemaleVoiceId: voices.miaCheerful.id,
  });

  sceneVoicePresets.airportCheckIn = await upsertSceneVoicePreset(scenes.airportCheckIn.id, {
    defaultVoiceId: voices.kenPolite.id,
    defaultMaleVoiceId: voices.kenPolite.id,
    defaultFemaleVoiceId: voices.annaWarm.id,
  });

  sceneVoicePresets.hotelCheckIn = await upsertSceneVoicePreset(scenes.hotelCheckIn.id, {
    defaultVoiceId: voices.annaWarm.id,
    defaultMaleVoiceId: voices.kenPolite.id,
    defaultFemaleVoiceId: voices.annaWarm.id,
  });

  sceneVoicePresets.jobInterview = await upsertSceneVoicePreset(scenes.jobInterview.id, {
    defaultVoiceId: voices.ethanLeader.id,
    defaultMaleVoiceId: voices.ethanLeader.id,
    defaultFemaleVoiceId: voices.ninaSocial.id,
  });

  sceneVoicePresets.weekendPlans = await upsertSceneVoicePreset(scenes.weekendPlans.id, {
    defaultVoiceId: voices.ninaSocial.id,
    defaultMaleVoiceId: voices.omarCalm.id,
    defaultFemaleVoiceId: voices.ninaSocial.id,
  });

  sceneVoicePresets.teamStandup = await upsertSceneVoicePreset(scenes.teamStandup.id, {
    defaultVoiceId: voices.ethanLeader.id,
    defaultMaleVoiceId: voices.ethanLeader.id,
    defaultFemaleVoiceId: voices.ninaSocial.id,
  });

  sceneVoicePresets.restaurantOrder = await upsertSceneVoicePreset(scenes.restaurantOrder.id, {
    defaultVoiceId: voices.miaCheerful.id,
    defaultMaleVoiceId: voices.kenPolite.id,
    defaultFemaleVoiceId: voices.miaCheerful.id,
  });

  sceneVoicePresets.taxiRide = await upsertSceneVoicePreset(scenes.taxiRide.id, {
    defaultVoiceId: voices.omarCalm.id,
    defaultMaleVoiceId: voices.omarCalm.id,
    defaultFemaleVoiceId: voices.annaWarm.id,
  });

  sceneVoicePresets.networkingEvent = await upsertSceneVoicePreset(scenes.networkingEvent.id, {
    defaultVoiceId: voices.ninaSocial.id,
    defaultMaleVoiceId: voices.ethanLeader.id,
    defaultFemaleVoiceId: voices.ninaSocial.id,
  });

  sceneVoicePresets.pharmacyVisit = await upsertSceneVoicePreset(scenes.pharmacyVisit.id, {
    defaultVoiceId: voices.annaWarm.id,
    defaultMaleVoiceId: voices.kenPolite.id,
    defaultFemaleVoiceId: voices.annaWarm.id,
  });

  return {
    voices,
    sceneVoicePresets,
  };
}
