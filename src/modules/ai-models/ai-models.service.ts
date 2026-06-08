import { AiFeatureType, AiProvider, Prisma } from '@prisma/client';
import * as aiModelsRepo from './ai-models.repository';
import { provider as llmProvider } from '../../config/llm';
import { getRealtimeDefaults } from '../../config/realtime';

const DEFAULT_EMBEDDING_TEXT = 'task: search result | query: recommend a roleplay scene for ordering coffee politely';
const DEFAULT_GEMINI_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || process.env.EMBEDDING_MODEL || 'gemini-embedding-2';
const DEFAULT_EMBEDDING_DIMENSION = Number(process.env.EMBEDDING_DIMENSIONS || '1536');
const GEMINI_API_BASE_URL = (process.env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
const DEFAULT_OPENAI_TEXT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const DEFAULT_CLAUDE_TEXT_MODEL = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
const DEFAULT_OPENAI_TTS_MODEL = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
const realtimeDefaults = getRealtimeDefaults();

type AiModelRecord = aiModelsRepo.AiModelRecord;
type EffectiveSettingRecord = {
  id: string;
  featureType: AiFeatureType;
  fallbackModelIds: string[];
  outputDimension: number | null;
  config: Prisma.JsonValue | null;
  updatedAt: Date;
  source: 'ADMIN' | 'SYSTEM_DEFAULT';
  activeModel: AiModelRecord | null;
};

type EmbedTextInput = {
  text: string;
  title?: string | null;
  mode?: 'QUERY' | 'DOCUMENT' | 'RAW';
  model?: AiModelRecord;
  outputDimension?: number | null;
};

function getRequiredEnv(name: 'GEMINI_API_KEY' | 'OPENAI_API_KEY' | 'CLAUDE_API_KEY' | 'ELEVENLABS_API_KEY') {
  const value = process.env[name]?.trim();
  const isPlaceholder =
    !value ||
    value.includes('replace-with-your-key') ||
    value.includes('replace_with_your_key') ||
    value.startsWith('your_') ||
    value.startsWith('sk-replace');

  if (isPlaceholder) {
    throw Object.assign(new Error(`Thiếu ${name} hợp lệ để connect provider`), {
      code: 'AI_CONFIG_ERROR',
      status: 500,
      details: [{ field: name, message: 'Missing or placeholder API key' }],
    });
  }

  return value;
}

function getProviderEnvName(provider: AiProvider) {
  switch (provider) {
    case AiProvider.GOOGLE:
      return 'GEMINI_API_KEY' as const;
    case AiProvider.OPENAI:
      return 'OPENAI_API_KEY' as const;
    case AiProvider.ANTHROPIC:
      return 'CLAUDE_API_KEY' as const;
    case AiProvider.ELEVENLABS:
      return 'ELEVENLABS_API_KEY' as const;
    default:
      return 'OPENAI_API_KEY' as const;
  }
}

function resolveOutputDimension(model: AiModelRecord, outputDimension?: number | null) {
  const value = outputDimension ?? model.defaultDimension ?? DEFAULT_EMBEDDING_DIMENSION;
  if (!value) return null;

  if (model.dimensionOptions.length > 0 && !model.dimensionOptions.includes(value)) {
    throw Object.assign(new Error('Output dimension không nằm trong danh sách model hỗ trợ'), {
      code: 'AI_MODEL_DIMENSION_INVALID',
      status: 400,
      details: [
        { field: 'outputDimension', message: String(value) },
        { field: 'allowed', message: model.dimensionOptions.join(',') },
      ],
    });
  }

  return value;
}

function prepareEmbeddingText(input: EmbedTextInput) {
  const text = input.text.trim();
  if (input.mode === 'RAW') return text;

  if (input.model?.provider === AiProvider.GOOGLE && input.model.modelId === 'gemini-embedding-2') {
    if (input.mode === 'DOCUMENT') {
      return `title: ${input.title?.trim() || 'none'} | text: ${text}`;
    }

    return `task: search result | query: ${text}`;
  }

  return text;
}

function mapModel(model: AiModelRecord, activeSetting?: EffectiveSettingRecord | null) {
  return {
    id: model.id,
    featureType: model.featureType,
    provider: model.provider,
    modelId: model.modelId,
    displayName: model.displayName,
    description: model.description,
    inputModalities: model.inputModalities,
    outputType: model.outputType,
    dimensionOptions: model.dimensionOptions,
    defaultDimension: model.defaultDimension,
    isActive: model.isActive,
    isSystem: model.isSystem,
    isSelected: activeSetting?.activeModel?.id === model.id,
    isFallback: activeSetting?.fallbackModelIds.includes(model.id) ?? false,
  };
}

function mapSetting(
  setting: EffectiveSettingRecord,
  modelById: Map<string, AiModelRecord> = new Map(),
) {
  return {
    id: setting.id,
    featureType: setting.featureType,
    source: setting.source,
    outputDimension: setting.outputDimension,
    updatedAt: setting.updatedAt,
    activeModel: setting.activeModel ? mapModel(setting.activeModel, setting) : null,
    fallbackModels: setting.fallbackModelIds
      .map((id) => modelById.get(id))
      .filter((model): model is AiModelRecord => Boolean(model))
      .map((model) => mapModel(model, setting)),
  };
}

function findCatalogModel(
  models: AiModelRecord[],
  featureType: AiFeatureType,
  provider: AiProvider,
  modelId: string,
) {
  return models.find((model) =>
    model.featureType === featureType &&
    model.provider === provider &&
    model.modelId === modelId,
  ) ?? null;
}

function resolveSyntheticSetting(
  featureType: AiFeatureType,
  models: AiModelRecord[],
  existingSetting: aiModelsRepo.AiFeatureSettingRecord | undefined,
): EffectiveSettingRecord {
  if (existingSetting) {
    return {
      ...existingSetting,
      source: 'ADMIN',
    };
  }

  const defaultsByFeature: Record<
    AiFeatureType,
    {
      provider: AiProvider;
      modelId: string;
      outputDimension?: number | null;
      fallbacks?: Array<{ provider: AiProvider; modelId: string }>;
    }
  > = {
    [AiFeatureType.EMBEDDING]: {
      provider: AiProvider.GOOGLE,
      modelId: DEFAULT_GEMINI_EMBEDDING_MODEL,
      outputDimension: DEFAULT_EMBEDDING_DIMENSION,
      fallbacks: [
        { provider: AiProvider.OPENAI, modelId: 'text-embedding-3-small' },
        { provider: AiProvider.GOOGLE, modelId: 'gemini-embedding-001' },
      ],
    },
    [AiFeatureType.ROLEPLAY_LLM]: {
      provider: llmProvider === 'claude' ? AiProvider.ANTHROPIC : AiProvider.OPENAI,
      modelId: llmProvider === 'claude' ? DEFAULT_CLAUDE_TEXT_MODEL : DEFAULT_OPENAI_TEXT_MODEL,
      fallbacks: [
        { provider: AiProvider.OPENAI, modelId: 'gpt-5.4-mini' },
        { provider: AiProvider.GOOGLE, modelId: 'gemini-2.5-flash' },
        { provider: AiProvider.ANTHROPIC, modelId: 'claude-3-5-sonnet-20241022' },
      ],
    },
    [AiFeatureType.EVALUATOR_LLM]: {
      provider: llmProvider === 'claude' ? AiProvider.ANTHROPIC : AiProvider.OPENAI,
      modelId: llmProvider === 'claude' ? DEFAULT_CLAUDE_TEXT_MODEL : DEFAULT_OPENAI_TEXT_MODEL,
      fallbacks: [
        { provider: AiProvider.OPENAI, modelId: 'gpt-5.4-mini' },
        { provider: AiProvider.GOOGLE, modelId: 'gemini-2.5-flash' },
        { provider: AiProvider.ANTHROPIC, modelId: 'claude-3-5-sonnet-20241022' },
      ],
    },
    [AiFeatureType.REALTIME_VOICE]: {
      provider: AiProvider.OPENAI,
      modelId: realtimeDefaults.model,
    },
    [AiFeatureType.TTS]: {
      provider: AiProvider.OPENAI,
      modelId: DEFAULT_OPENAI_TTS_MODEL,
      fallbacks: [
        { provider: AiProvider.ELEVENLABS, modelId: 'eleven_flash_v2_5' },
        { provider: AiProvider.OPENAI, modelId: 'tts-1' },
      ],
    },
    [AiFeatureType.STT]: {
      provider: AiProvider.OPENAI,
      modelId: realtimeDefaults.transcriptionModel,
      fallbacks: [
        { provider: AiProvider.OPENAI, modelId: 'gpt-4o-mini-transcribe' },
        { provider: AiProvider.OPENAI, modelId: 'whisper-1' },
      ],
    },
  };

  const defaultConfig = defaultsByFeature[featureType];
  const activeModel = findCatalogModel(models, featureType, defaultConfig.provider, defaultConfig.modelId);
  if (!activeModel) {
    return {
      id: `effective-${featureType.toLowerCase()}`,
      featureType,
      fallbackModelIds: [],
      outputDimension: defaultConfig.outputDimension ?? null,
      config: null,
      updatedAt: new Date(0),
      source: 'SYSTEM_DEFAULT',
      activeModel: null,
    };
  }

  const fallbackModelIds = (defaultConfig.fallbacks ?? [])
    .map((item) => findCatalogModel(models, featureType, item.provider, item.modelId)?.id ?? null)
    .filter((id): id is string => Boolean(id));

  return {
    id: `effective-${featureType.toLowerCase()}`,
    featureType,
    fallbackModelIds,
    outputDimension: defaultConfig.outputDimension ?? null,
    config: null,
    updatedAt: new Date(0),
    source: 'SYSTEM_DEFAULT',
    activeModel,
  };
}

function mapBenchmark(benchmark: aiModelsRepo.AiBenchmarkRecord) {
  return {
    id: benchmark.id,
    featureType: benchmark.featureType,
    provider: benchmark.provider,
    modelId: benchmark.providerModelId,
    outputDimension: benchmark.outputDimension,
    embeddingDimension: benchmark.embeddingDimension,
    latencyMs: benchmark.latencyMs,
    success: benchmark.success,
    errorMessage: benchmark.errorMessage,
    createdAt: benchmark.createdAt,
  };
}

async function callGeminiEmbedding(input: {
  modelId: string;
  text: string;
  outputDimension?: number | null;
}) {
  const apiKey = getRequiredEnv('GEMINI_API_KEY');
  const response = await fetch(`${GEMINI_API_BASE_URL}/models/${input.modelId}:embedContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      content: {
        parts: [{ text: input.text }],
      },
      output_dimensionality: input.outputDimension ?? undefined,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const providerMessage = payload?.error?.message
      ?? payload?.message
      ?? `Gemini Embedding tra loi ${response.status}`;

    throw Object.assign(new Error(providerMessage), {
      code: 'AI_ENGINE_ERROR',
      status: 502,
      details: [
        { field: 'provider', message: 'GOOGLE' },
        { field: 'provider.status', message: String(response.status) },
        { field: 'provider.message', message: providerMessage },
      ],
    });
  }

  const values = payload?.embedding?.values ?? payload?.embeddings?.[0]?.values;
  if (!Array.isArray(values)) {
    throw Object.assign(new Error('Gemini không trả về embedding hợp lệ'), {
      code: 'AI_ENGINE_ERROR',
      status: 502,
    });
  }

  return values as number[];
}

async function callOpenAiEmbedding(input: {
  modelId: string;
  text: string;
  outputDimension?: number | null;
}) {
  const apiKey = getRequiredEnv('OPENAI_API_KEY');
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: input.modelId,
      input: input.text,
      dimensions: input.outputDimension ?? undefined,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const providerMessage = payload?.error?.message
      ?? payload?.message
      ?? `OpenAI Embedding tra loi ${response.status}`;

    throw Object.assign(new Error(providerMessage), {
      code: 'AI_ENGINE_ERROR',
      status: 502,
      details: [
        { field: 'provider', message: 'OPENAI' },
        { field: 'provider.status', message: String(response.status) },
        { field: 'provider.message', message: providerMessage },
      ],
    });
  }

  const values = payload?.data?.[0]?.embedding;
  if (!Array.isArray(values)) {
    throw Object.assign(new Error('OpenAI không trả về embedding hợp lệ'), {
      code: 'AI_ENGINE_ERROR',
      status: 502,
    });
  }

  return values as number[];
}

async function runEmbeddingBenchmark(model: AiModelRecord, input: {
  sampleText?: string;
  outputDimension?: number | null;
}) {
  const outputDimension = resolveOutputDimension(model, input.outputDimension);
  const preparedText = prepareEmbeddingText({
    text: input.sampleText || DEFAULT_EMBEDDING_TEXT,
    mode: 'QUERY',
    model,
  });
  const startedAt = Date.now();

  const values = model.provider === AiProvider.GOOGLE
    ? await callGeminiEmbedding({ modelId: model.modelId, text: preparedText, outputDimension })
    : await callOpenAiEmbedding({ modelId: model.modelId, text: preparedText, outputDimension });

  return {
    latencyMs: Date.now() - startedAt,
    embeddingDimension: values.length,
    outputDimension,
  };
}

async function runTextBenchmark(model: AiModelRecord, sampleText: string) {
  const startedAt = Date.now();
  const prompt = sampleText || 'Reply with OK in one short sentence.';

  if (model.provider === AiProvider.ANTHROPIC) {
    const apiKey = getRequiredEnv('CLAUDE_API_KEY');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.modelId,
        max_tokens: 64,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error?.message ?? `Anthropic tra loi ${response.status}`);
    }
  } else if (model.provider === AiProvider.GOOGLE) {
    const apiKey = getRequiredEnv('GEMINI_API_KEY');
    const response = await fetch(`${GEMINI_API_BASE_URL}/models/${model.modelId}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 64,
        },
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error?.message ?? `Gemini tra loi ${response.status}`);
    }
  } else {
    const apiKey = getRequiredEnv('OPENAI_API_KEY');
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.modelId,
        input: prompt,
        max_output_tokens: 64,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error?.message ?? `OpenAI tra loi ${response.status}`);
    }
  }

  return {
    latencyMs: Date.now() - startedAt,
    embeddingDimension: null,
    outputDimension: null,
  };
}

/**
 * Function Objective - listAiModels
 * Summary: Lấy catalog model và active setting để admin render màn chọn provider/model.
 * Inputs: featureType optional.
 * Returns: Models cùng active setting hiện tại.
 */
export async function listAiModels(featureType?: AiFeatureType) {
  const [allModels, filteredModels, storedSettings] = await Promise.all([
    aiModelsRepo.findAiModels(),
    aiModelsRepo.findAiModels(featureType),
    aiModelsRepo.findAiFeatureSettings(),
  ]);
  const storedSettingByFeature = new Map(storedSettings.map((setting) => [setting.featureType, setting]));
  const effectiveSettings: EffectiveSettingRecord[] = Object.values(AiFeatureType).map((type) =>
    resolveSyntheticSetting(type, allModels, storedSettingByFeature.get(type)),
  );
  const settingByFeature = new Map<AiFeatureType, EffectiveSettingRecord>(
    effectiveSettings.map((setting) => [setting.featureType, setting]),
  );
  const modelById = new Map(allModels.map((model) => [model.id, model]));

  return {
    settings: effectiveSettings.map((setting) => mapSetting(setting, modelById)),
    models: filteredModels.map((model) => mapModel(model, settingByFeature.get(model.featureType))),
  };
}

/**
 * Function Objective - getFeatureModelChain
 * Summary: Trả về primary model và fallback models theo đúng thứ tự admin đã lưu.
 */
export async function getFeatureModelChain(featureType: AiFeatureType) {
  const setting = await aiModelsRepo.findActiveFeatureSetting(featureType);
  if (!setting?.activeModel) return [];

  const fallbackRecords = await aiModelsRepo.findAiModelsByIds(setting.fallbackModelIds);
  const fallbackById = new Map(fallbackRecords.map((model) => [model.id, model]));
  const fallbackModels = setting.fallbackModelIds
    .map((id) => fallbackById.get(id))
    .filter((model): model is AiModelRecord => Boolean(model));

  return [setting.activeModel, ...fallbackModels];
}

/**
 * Function Objective - getActiveEmbeddingConfig
 * Summary: Lấy embedding model đang active, fallback Gemini Embedding 2 khi DB chưa có setting.
 */
export async function getActiveEmbeddingConfig() {
  const setting = await aiModelsRepo.findActiveFeatureSetting(AiFeatureType.EMBEDDING);
  if (setting?.activeModel) {
    return {
      model: setting.activeModel,
      outputDimension: setting.outputDimension ?? setting.activeModel.defaultDimension ?? DEFAULT_EMBEDDING_DIMENSION,
    };
  }

  return {
    model: {
      id: 'env-gemini-embedding-2',
      featureType: AiFeatureType.EMBEDDING,
      provider: AiProvider.GOOGLE,
      modelId: DEFAULT_GEMINI_EMBEDDING_MODEL,
      displayName: 'Gemini Embedding 2',
      description: 'Environment fallback embedding model.',
      inputModalities: ['TEXT'],
      outputType: 'EMBEDDING',
      dimensionOptions: [768, 1536, 3072],
      defaultDimension: DEFAULT_EMBEDDING_DIMENSION,
      config: null,
      isActive: true,
      isSystem: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    outputDimension: DEFAULT_EMBEDDING_DIMENSION,
  };
}

/**
 * Function Objective - getActiveAiFeatureModel
 * Summary: Lấy active model theo feature để các runtime service có thể dùng setting từ admin.
 */
export async function getActiveAiFeatureModel(featureType: AiFeatureType) {
  const setting = await aiModelsRepo.findActiveFeatureSetting(featureType);
  if (!setting?.activeModel) return null;

  return {
    model: setting.activeModel,
    outputDimension: setting.outputDimension,
    config: setting.config,
  };
}

/**
 * Function Objective - getAiFeatureRuntimePlan
 * Summary: Lấy primary/fallback model chain kèm setting runtime cho feature.
 */
export async function getAiFeatureRuntimePlan(featureType: AiFeatureType) {
  const setting = await aiModelsRepo.findActiveFeatureSetting(featureType);
  if (!setting?.activeModel) {
    return {
      models: [] as AiModelRecord[],
      outputDimension: null as number | null,
      config: null as Prisma.JsonValue | null,
    };
  }

  const fallbackRecords = await aiModelsRepo.findAiModelsByIds(setting.fallbackModelIds);
  const fallbackById = new Map(fallbackRecords.map((model) => [model.id, model]));

  return {
    models: [
      setting.activeModel,
      ...setting.fallbackModelIds
        .map((id) => fallbackById.get(id))
        .filter((model): model is AiModelRecord => Boolean(model)),
    ],
    outputDimension: setting.outputDimension,
    config: setting.config,
  };
}

/**
 * Function Objective - embedText
 * Summary: Sinh embedding bằng active embedding provider để scene search/recommend có thể tái sử dụng.
 * Inputs: Text, mode query/document/raw, và optional title.
 * Returns: Vector embedding cùng metadata model.
 */
export async function embedText(input: EmbedTextInput) {
  const plan = input.model
    ? { models: [input.model], outputDimension: input.outputDimension ?? input.model.defaultDimension }
    : await getAiFeatureRuntimePlan(AiFeatureType.EMBEDDING);
  const models = plan.models.length > 0 ? plan.models : [(await getActiveEmbeddingConfig()).model];
  const errors: string[] = [];

  for (const model of models) {
    try {
      const outputDimension = resolveOutputDimension(model, plan.outputDimension ?? input.outputDimension);
      const preparedText = prepareEmbeddingText({ ...input, model });
      const values = model.provider === AiProvider.GOOGLE
        ? await callGeminiEmbedding({ modelId: model.modelId, text: preparedText, outputDimension })
        : await callOpenAiEmbedding({ modelId: model.modelId, text: preparedText, outputDimension });

      return {
        values,
        provider: model.provider,
        modelId: model.modelId,
        outputDimension,
        embeddingDimension: values.length,
        fallbackUsed: model.id !== models[0]?.id,
      };
    } catch (error: any) {
      errors.push(`${model.provider}/${model.modelId}: ${error?.message ?? 'unknown error'}`);
    }
  }

  throw Object.assign(new Error('Không thể sinh embedding từ primary hoặc fallback models'), {
    code: 'AI_ENGINE_ERROR',
    status: 502,
    details: errors.map((message) => ({ field: 'fallback', message })),
  });
}

/**
 * Function Objective - benchmarkAiModel
 * Summary: Chạy benchmark connect cho model, hiện hỗ trợ embedding provider thật.
 * Inputs: modelCatalogId, sample text, output dimension.
 * Behavior: Gọi provider -> đo latency/dimension -> lưu benchmark thành công hoặc thất bại.
 * Returns: Benchmark record cho admin so sánh.
 */
export async function benchmarkAiModel(modelCatalogId: string, input: {
  sampleText?: string;
  outputDimension?: number | null;
}) {
  const model = await aiModelsRepo.findAiModelById(modelCatalogId);
  if (!model || !model.isActive) {
    throw Object.assign(new Error('Không tìm thấy model đang active'), {
      code: 'AI_MODEL_NOT_FOUND',
      status: 404,
    });
  }

  const sampleText = input.sampleText?.trim() || DEFAULT_EMBEDDING_TEXT;
  const startedAt = Date.now();

  try {
    const result = model.featureType === AiFeatureType.EMBEDDING
      ? await runEmbeddingBenchmark(model, { sampleText, outputDimension: input.outputDimension })
      : model.featureType === AiFeatureType.ROLEPLAY_LLM || model.featureType === AiFeatureType.EVALUATOR_LLM
        ? await runTextBenchmark(model, sampleText)
      : {
          latencyMs: Date.now() - startedAt,
          embeddingDimension: null,
          outputDimension: null,
        };

    if (model.featureType !== AiFeatureType.EMBEDDING) {
      getRequiredEnv(getProviderEnvName(model.provider));
    }

    const benchmark = await aiModelsRepo.createBenchmark({
      modelCatalogId: model.id,
      featureType: model.featureType,
      provider: model.provider,
      providerModelId: model.modelId,
      sampleText,
      outputDimension: result.outputDimension,
      embeddingDimension: result.embeddingDimension,
      latencyMs: result.latencyMs,
      success: true,
      errorMessage: null,
    });

    return {
      model: mapModel(model),
      benchmark: mapBenchmark(benchmark),
    };
  } catch (error: any) {
    const benchmark = await aiModelsRepo.createBenchmark({
      modelCatalogId: model.id,
      featureType: model.featureType,
      provider: model.provider,
      providerModelId: model.modelId,
      sampleText,
      outputDimension: input.outputDimension ?? null,
      embeddingDimension: null,
      latencyMs: Date.now() - startedAt,
      success: false,
      errorMessage: error?.message ?? 'Benchmark failed',
    });

    return {
      model: mapModel(model),
      benchmark: mapBenchmark(benchmark),
    };
  }
}

/**
 * Function Objective - connectAiModel
 * Summary: Connect model cho một feature bằng cách benchmark nhanh rồi lưu active setting nếu thành công.
 * Inputs: modelCatalogId, outputDimension, config.
 * Behavior: Benchmark provider -> nếu success thì upsert active setting.
 * Returns: Active setting mới và benchmark connect.
 */
export async function connectAiModel(modelCatalogId: string, input: {
  outputDimension?: number | null;
  fallbackModelIds?: string[];
  config?: Prisma.InputJsonValue;
  benchmarkText?: string;
}) {
  const model = await aiModelsRepo.findAiModelById(modelCatalogId);
  if (!model || !model.isActive) {
    throw Object.assign(new Error('Không tìm thấy model đang active'), {
      code: 'AI_MODEL_NOT_FOUND',
      status: 404,
    });
  }
  const fallbackModelIds = input.fallbackModelIds ?? [];
  if (fallbackModelIds.includes(model.id)) {
    throw Object.assign(new Error('Fallback chain không được chứa lại primary model'), {
      code: 'AI_MODEL_FALLBACK_INVALID',
      status: 400,
    });
  }

  const fallbackModels = await aiModelsRepo.findAiModelsByIds(fallbackModelIds);
  if (fallbackModels.length !== fallbackModelIds.length || fallbackModels.some((item) => item.featureType !== model.featureType)) {
    throw Object.assign(new Error('Fallback models phải tồn tại, active, và cùng featureType với primary model'), {
      code: 'AI_MODEL_FALLBACK_INVALID',
      status: 400,
    });
  }

  const benchmarkResult = await benchmarkAiModel(model.id, {
    sampleText: input.benchmarkText,
    outputDimension: input.outputDimension ?? model.defaultDimension,
  });

  if (!benchmarkResult.benchmark.success) {
    throw Object.assign(new Error('Không thể connect model vì benchmark thất bại'), {
      code: 'AI_MODEL_CONNECT_FAILED',
      status: 502,
      details: [
        { field: 'benchmarkId', message: benchmarkResult.benchmark.id },
        { field: 'provider', message: model.provider },
        { field: 'modelId', message: model.modelId },
        { field: 'error', message: benchmarkResult.benchmark.errorMessage ?? 'Unknown provider error' },
      ],
    });
  }

  const setting = await aiModelsRepo.upsertFeatureSetting({
    featureType: model.featureType,
    activeModelId: model.id,
    fallbackModelIds,
    outputDimension: benchmarkResult.benchmark.outputDimension ?? input.outputDimension ?? model.defaultDimension,
    config: input.config,
  });

  return {
    setting: mapSetting({
      ...setting,
      source: 'ADMIN',
    }),
    benchmark: benchmarkResult.benchmark,
  };
}
