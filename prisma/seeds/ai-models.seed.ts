import { AiFeatureType, AiProvider, Prisma } from '@prisma/client';
import { prisma } from './helpers';

type SeedAiModel = {
  featureType: AiFeatureType;
  provider: AiProvider;
  modelId: string;
  displayName: string;
  description: string;
  inputModalities: string[];
  outputType: string;
  dimensionOptions: number[];
  defaultDimension: number | null;
  config: Prisma.InputJsonValue | null;
};

const textInputs = ['TEXT'];
const multimodalInputs = ['TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'PDF'];

const AI_MODELS: SeedAiModel[] = [
  {
    featureType: AiFeatureType.EMBEDDING,
    provider: AiProvider.GOOGLE,
    modelId: 'gemini-embedding-2',
    displayName: 'Gemini Embedding 2',
    description: 'Google multimodal embedding model for search, recommendation, and clustering.',
    inputModalities: ['TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'PDF'],
    outputType: 'EMBEDDING',
    dimensionOptions: [128, 768, 1536, 3072],
    defaultDimension: 1536,
    config: {
      queryPrefix: 'task: search result | query:',
      documentPrefix: 'title: {title} | text:',
      supportsTaskType: false,
    },
  },
  {
    featureType: AiFeatureType.EMBEDDING,
    provider: AiProvider.GOOGLE,
    modelId: 'gemini-embedding-001',
    displayName: 'Gemini Embedding 001',
    description: 'Google text embedding model with task type support.',
    inputModalities: textInputs,
    outputType: 'EMBEDDING',
    dimensionOptions: [128, 768, 1536, 3072],
    defaultDimension: 1536,
    config: {
      taskType: 'RETRIEVAL_DOCUMENT',
      supportsTaskType: true,
    },
  },
  {
    featureType: AiFeatureType.EMBEDDING,
    provider: AiProvider.OPENAI,
    modelId: 'text-embedding-3-large',
    displayName: 'OpenAI Text Embedding 3 Large',
    description: 'OpenAI high-quality embedding model for retrieval quality benchmarks.',
    inputModalities: textInputs,
    outputType: 'EMBEDDING',
    dimensionOptions: [256, 1024, 3072],
    defaultDimension: 3072,
    config: null,
  },
  {
    featureType: AiFeatureType.EMBEDDING,
    provider: AiProvider.OPENAI,
    modelId: 'text-embedding-3-small',
    displayName: 'OpenAI Text Embedding 3 Small',
    description: 'Cost-efficient OpenAI embedding fallback.',
    inputModalities: textInputs,
    outputType: 'EMBEDDING',
    dimensionOptions: [512, 1536],
    defaultDimension: 1536,
    config: null,
  },
  ...[
    ['claude-opus-4-7', 'Claude Opus 4.7', 'Most capable Claude model for complex reasoning.'],
    ['claude-sonnet-4-6', 'Claude Sonnet 4.6', 'Balanced Claude model for roleplay and evaluation.'],
    ['claude-haiku-4-5-20251001', 'Claude Haiku 4.5', 'Fast Claude model for low-latency fallback.'],
    ['claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet', 'Legacy Scenio default Claude model.'],
  ].flatMap(([modelId, displayName, description]) => [
    {
      featureType: AiFeatureType.ROLEPLAY_LLM,
      provider: AiProvider.ANTHROPIC,
      modelId,
      displayName,
      description,
      inputModalities: ['TEXT', 'IMAGE'],
      outputType: 'TEXT',
      dimensionOptions: [],
      defaultDimension: null,
      config: null,
    },
    {
      featureType: AiFeatureType.EVALUATOR_LLM,
      provider: AiProvider.ANTHROPIC,
      modelId,
      displayName: `${displayName} Evaluator`,
      description,
      inputModalities: ['TEXT', 'IMAGE'],
      outputType: 'JSON',
      dimensionOptions: [],
      defaultDimension: null,
      config: null,
    },
  ]),
  ...[
    ['gpt-5.5', 'GPT-5.5', 'OpenAI flagship model for complex reasoning.'],
    ['gpt-5.4', 'GPT-5.4', 'OpenAI strong production model.'],
    ['gpt-5.4-mini', 'GPT-5.4 Mini', 'Lower-latency OpenAI model for client features.'],
    ['gpt-4.1', 'GPT-4.1', 'Strong non-reasoning OpenAI fallback.'],
    ['gpt-4o-mini', 'GPT-4o Mini', 'Legacy low-cost OpenAI fallback.'],
  ].flatMap(([modelId, displayName, description]) => [
    {
      featureType: AiFeatureType.ROLEPLAY_LLM,
      provider: AiProvider.OPENAI,
      modelId,
      displayName,
      description,
      inputModalities: ['TEXT', 'IMAGE'],
      outputType: 'TEXT',
      dimensionOptions: [],
      defaultDimension: null,
      config: null,
    },
    {
      featureType: AiFeatureType.EVALUATOR_LLM,
      provider: AiProvider.OPENAI,
      modelId,
      displayName: `${displayName} Evaluator`,
      description,
      inputModalities: ['TEXT', 'IMAGE'],
      outputType: 'JSON',
      dimensionOptions: [],
      defaultDimension: null,
      config: null,
    },
  ]),
  ...[
    ['gemini-3-pro-preview', 'Gemini 3 Pro Preview', 'Google most intelligent multimodal preview model.'],
    ['gemini-3-flash-preview', 'Gemini 3 Flash Preview', 'Google balanced fast frontier model.'],
    ['gemini-2.5-flash', 'Gemini 2.5 Flash', 'Stable Gemini price-performance model.'],
    ['gemini-2.5-flash-lite', 'Gemini 2.5 Flash-Lite', 'Ultra-fast Gemini fallback model.'],
  ].flatMap(([modelId, displayName, description]) => [
    {
      featureType: AiFeatureType.ROLEPLAY_LLM,
      provider: AiProvider.GOOGLE,
      modelId,
      displayName,
      description,
      inputModalities: multimodalInputs,
      outputType: 'TEXT',
      dimensionOptions: [],
      defaultDimension: null,
      config: null,
    },
    {
      featureType: AiFeatureType.EVALUATOR_LLM,
      provider: AiProvider.GOOGLE,
      modelId,
      displayName: `${displayName} Evaluator`,
      description,
      inputModalities: multimodalInputs,
      outputType: 'JSON',
      dimensionOptions: [],
      defaultDimension: null,
      config: null,
    },
  ]),
  {
    featureType: AiFeatureType.REALTIME_VOICE,
    provider: AiProvider.OPENAI,
    modelId: 'gpt-realtime-2',
    displayName: 'OpenAI Realtime 2',
    description: 'OpenAI latest public realtime speech-to-speech model.',
    inputModalities: ['AUDIO', 'TEXT'],
    outputType: 'AUDIO_TEXT',
    dimensionOptions: [],
    defaultDimension: null,
    config: null,
  },
  {
    featureType: AiFeatureType.REALTIME_VOICE,
    provider: AiProvider.OPENAI,
    modelId: 'gpt-realtime-1.5',
    displayName: 'OpenAI Realtime 1.5',
    description: 'OpenAI realtime speech-to-speech model chosen for balanced cost and capability.',
    inputModalities: ['AUDIO', 'TEXT'],
    outputType: 'AUDIO_TEXT',
    dimensionOptions: [],
    defaultDimension: null,
    config: null,
  },
  {
    featureType: AiFeatureType.REALTIME_VOICE,
    provider: AiProvider.OPENAI,
    modelId: 'gpt-realtime',
    displayName: 'OpenAI Realtime',
    description: 'OpenAI current general-availability realtime speech-to-speech model.',
    inputModalities: ['AUDIO', 'TEXT'],
    outputType: 'AUDIO_TEXT',
    dimensionOptions: [],
    defaultDimension: null,
    config: null,
  },
  {
    featureType: AiFeatureType.REALTIME_VOICE,
    provider: AiProvider.OPENAI,
    modelId: 'gpt-realtime-mini',
    displayName: 'OpenAI Realtime Mini',
    description: 'Cost-efficient OpenAI realtime speech-to-speech model.',
    inputModalities: ['AUDIO', 'TEXT'],
    outputType: 'AUDIO_TEXT',
    dimensionOptions: [],
    defaultDimension: null,
    config: null,
  },
  {
    featureType: AiFeatureType.TTS,
    provider: AiProvider.ELEVENLABS,
    modelId: 'eleven_flash_v2_5',
    displayName: 'ElevenLabs Flash v2.5',
    description: 'Low-latency ElevenLabs text-to-speech model.',
    inputModalities: textInputs,
    outputType: 'AUDIO',
    dimensionOptions: [],
    defaultDimension: null,
    config: null,
  },
  ...[
    ['gpt-4o-mini-tts', 'OpenAI GPT-4o Mini TTS'],
    ['tts-1', 'OpenAI TTS-1'],
    ['tts-1-hd', 'OpenAI TTS-1 HD'],
  ].map(([modelId, displayName]) => ({
    featureType: AiFeatureType.TTS,
    provider: AiProvider.OPENAI,
    modelId,
    displayName,
    description: 'OpenAI speech generation model.',
    inputModalities: textInputs,
    outputType: 'AUDIO',
    dimensionOptions: [],
    defaultDimension: null,
    config: null,
  })),
  ...[
    ['gpt-4o-transcribe', 'OpenAI GPT-4o Transcribe'],
    ['gpt-4o-mini-transcribe', 'OpenAI GPT-4o Mini Transcribe'],
    ['whisper-1', 'OpenAI Whisper'],
  ].map(([modelId, displayName]) => ({
    featureType: AiFeatureType.STT,
    provider: AiProvider.OPENAI,
    modelId,
    displayName,
    description: 'OpenAI speech-to-text model.',
    inputModalities: ['AUDIO'],
    outputType: 'TEXT',
    dimensionOptions: [],
    defaultDimension: null,
    config: null,
  })),
];

const DEFAULT_SETTINGS = [
  {
    featureType: AiFeatureType.EMBEDDING,
    primary: [AiProvider.GOOGLE, 'gemini-embedding-2'] as const,
    fallbacks: [
      [AiProvider.OPENAI, 'text-embedding-3-small'] as const,
      [AiProvider.GOOGLE, 'gemini-embedding-001'] as const,
    ],
    outputDimension: 1536,
  },
  {
    featureType: AiFeatureType.ROLEPLAY_LLM,
    primary: [AiProvider.OPENAI, 'gpt-4o-mini'] as const,
    fallbacks: [
      [AiProvider.OPENAI, 'gpt-5.4-mini'] as const,
      [AiProvider.GOOGLE, 'gemini-2.5-flash'] as const,
      [AiProvider.ANTHROPIC, 'claude-3-5-sonnet-20241022'] as const,
    ],
    outputDimension: null,
  },
  {
    featureType: AiFeatureType.EVALUATOR_LLM,
    primary: [AiProvider.OPENAI, 'gpt-4o-mini'] as const,
    fallbacks: [
      [AiProvider.OPENAI, 'gpt-5.4-mini'] as const,
      [AiProvider.GOOGLE, 'gemini-2.5-flash'] as const,
      [AiProvider.ANTHROPIC, 'claude-3-5-sonnet-20241022'] as const,
    ],
    outputDimension: null,
  },
  {
    featureType: AiFeatureType.REALTIME_VOICE,
    primary: [AiProvider.OPENAI, 'gpt-realtime-1.5'] as const,
    fallbacks: [
      [AiProvider.OPENAI, 'gpt-realtime'] as const,
      [AiProvider.OPENAI, 'gpt-realtime-mini'] as const,
    ],
    outputDimension: null,
  },
  {
    featureType: AiFeatureType.TTS,
    primary: [AiProvider.OPENAI, 'gpt-4o-mini-tts'] as const,
    fallbacks: [
      [AiProvider.ELEVENLABS, 'eleven_flash_v2_5'] as const,
      [AiProvider.OPENAI, 'tts-1'] as const,
    ],
    outputDimension: null,
  },
  {
    featureType: AiFeatureType.STT,
    primary: [AiProvider.OPENAI, 'gpt-4o-transcribe'] as const,
    fallbacks: [
      [AiProvider.OPENAI, 'gpt-4o-mini-transcribe'] as const,
      [AiProvider.OPENAI, 'whisper-1'] as const,
    ],
    outputDimension: null,
  },
];

/**
 * Seed Objective - seedAiModels
 * Summary: Tạo catalog AI model và fallback chain mặc định cho từng feature.
 */
export async function seedAiModels() {
  const catalogByKey = new Map<string, { id: string }>();

  for (const model of AI_MODELS) {
    const saved = await prisma.aiModelCatalog.upsert({
      where: {
        featureType_provider_modelId: {
          featureType: model.featureType,
          provider: model.provider,
          modelId: model.modelId,
        },
      },
      update: {
        displayName: model.displayName,
        description: model.description,
        inputModalities: model.inputModalities,
        outputType: model.outputType,
        dimensionOptions: model.dimensionOptions,
        defaultDimension: model.defaultDimension,
        config: model.config === null ? Prisma.JsonNull : model.config,
        isActive: true,
        isSystem: true,
      },
      create: {
        ...model,
        config: model.config === null ? Prisma.JsonNull : model.config,
        isActive: true,
        isSystem: true,
      },
      select: { id: true },
    });

    catalogByKey.set(`${model.featureType}:${model.provider}:${model.modelId}`, saved);
  }

  for (const setting of DEFAULT_SETTINGS) {
    const [primaryProvider, primaryModelId] = setting.primary;
    const primary = catalogByKey.get(`${setting.featureType}:${primaryProvider}:${primaryModelId}`);
    if (!primary) continue;

    const fallbackModelIds = setting.fallbacks
      .map(([provider, modelId]) => catalogByKey.get(`${setting.featureType}:${provider}:${modelId}`)?.id)
      .filter((id): id is string => Boolean(id));

    await prisma.aiFeatureSetting.upsert({
      where: { featureType: setting.featureType },
      update: {
        activeModelId: primary.id,
        fallbackModelIds,
        outputDimension: setting.outputDimension,
      },
      create: {
        featureType: setting.featureType,
        activeModelId: primary.id,
        fallbackModelIds,
        outputDimension: setting.outputDimension,
      },
    });
  }

  return {
    models: AI_MODELS.length,
    settings: DEFAULT_SETTINGS.length,
  };
}
