import { ChatProxyInput, ElevenLabsSpeechInput } from '../../schemas/lab';

type OpenAICompatibleMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type ProviderPayload = Record<string, any> | null;

type ParsedStreamPayload = {
  reply: string;
  model: string | null;
  usage: Record<string, any> | null;
};

const DEFAULT_ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';
const DEFAULT_ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5';
const DEFAULT_ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
const DEFAULT_ELEVENLABS_OUTPUT_FORMAT = process.env.ELEVENLABS_OUTPUT_FORMAT || 'mp3_44100_128';

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => extractTextContent(item))
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  if (content && typeof content === 'object') {
    const candidate = content as Record<string, any>;

    if (typeof candidate.text === 'string') {
      return candidate.text.trim();
    }

    if (typeof candidate.output_text === 'string') {
      return candidate.output_text.trim();
    }

    if ('content' in candidate) {
      const nested = extractTextContent(candidate.content);
      if (nested) return nested;
    }

    if ('parts' in candidate) {
      const nested = extractTextContent(candidate.parts);
      if (nested) return nested;
    }

    if ('message' in candidate) {
      const nested = extractTextContent(candidate.message);
      if (nested) return nested;
    }

    if ('delta' in candidate) {
      const nested = extractTextContent(candidate.delta);
      if (nested) return nested;
    }
  }

  return '';
}

function extractAssistantText(payload: ProviderPayload, rawText: string) {
  if (!payload) {
    return rawText.trim();
  }

  const candidates = [
    payload.choices?.[0]?.message?.content,
    payload.choices?.[0]?.message,
    payload.choices?.[0]?.delta?.content,
    payload.choices?.[0]?.delta,
    payload.choices?.[0]?.text,
    payload.output_text,
    payload.output,
    payload.candidates?.[0]?.content,
    payload.candidates?.[0]?.content?.parts,
    payload.candidates?.[0]?.text,
    payload.data?.choices?.[0]?.message?.content,
    payload.data?.choices?.[0]?.message,
    payload.data?.choices?.[0]?.text,
    payload.data?.candidates?.[0]?.content,
    payload.message,
    payload.content,
  ];

  for (const candidate of candidates) {
    const text = extractTextContent(candidate);
    if (text) {
      return text;
    }
  }

  return rawText.trim();
}

function parseStreamingChunks(rawText: string): ParsedStreamPayload | null {
  if (!rawText.includes('data:')) {
    return null;
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let reply = '';
  let model: string | null = null;
  let usage: Record<string, any> | null = null;
  let foundChunk = false;

  for (const line of lines) {
    if (!line.startsWith('data:')) {
      continue;
    }

    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') {
      continue;
    }

    try {
      const chunk = JSON.parse(data) as Record<string, any>;
      foundChunk = true;

      if (typeof chunk.model === 'string') {
        model = chunk.model;
      }

      if (chunk.usage && typeof chunk.usage === 'object') {
        usage = chunk.usage;
      }

      const deltaContent = extractTextContent(chunk.choices?.[0]?.delta?.content);
      if (deltaContent) {
        reply += deltaContent;
        continue;
      }

      const messageContent = extractTextContent(chunk.choices?.[0]?.message?.content);
      if (messageContent) {
        reply += messageContent;
      }
    } catch {
      // Ignore malformed chunk lines and keep scanning.
    }
  }

  if (!foundChunk) {
    return null;
  }

  return {
    reply: reply.trim(),
    model,
    usage,
  };
}

function getPayloadPreview(payload: ProviderPayload, rawText: string) {
  const source = payload ? JSON.stringify(payload) : rawText;
  return source.slice(0, 800);
}

function getMimeType(outputFormat: string) {
  if (outputFormat.startsWith('mp3')) return 'audio/mpeg';
  if (outputFormat.startsWith('pcm')) return 'audio/wav';
  if (outputFormat.startsWith('wav')) return 'audio/wav';
  if (outputFormat.startsWith('ulaw')) return 'audio/basic';
  return 'application/octet-stream';
}

function getElevenLabsBaseUrl() {
  return normalizeBaseUrl(process.env.ELEVENLABS_BASE_URL || DEFAULT_ELEVENLABS_BASE_URL);
}

function getElevenLabsApiKey() {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    throw Object.assign(new Error('Thiếu cấu hình ELEVENLABS_API_KEY trong .env'), {
      code: 'LAB_TTS_NOT_CONFIGURED',
      status: 500,
    });
  }

  return apiKey;
}

/**
 * Function Objective - proxyChatCompletion
 * Summary: Proxy mot chat completion request toi provider OpenAI-compatible de page lab tranh dinh CORS.
 * Inputs: userId xac thuc va payload gom baseUrl, apiKey, model, prompt, messages.
 * Behavior: Chuan hoa URL -> goi /chat/completions -> parse assistant reply -> tra payload gon cho UI.
 * Returns: Reply text, raw usage, va model thuc te provider tra ve.
 */
export async function proxyChatCompletion(userId: string, input: ChatProxyInput) {
  const baseUrl = normalizeBaseUrl(input.apiBaseUrl);
  const messages: OpenAICompatibleMessage[] = input.systemPrompt
    ? [{ role: 'system', content: input.systemPrompt }, ...input.messages]
    : input.messages;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
      'X-Scenio-Lab-User': userId,
    },
    body: JSON.stringify({
      model: input.model,
      messages,
      temperature: input.temperature,
      max_tokens: input.maxTokens,
      stream: false,
    }),
  });

  const rawText = await response.text();
  const streamPayload = parseStreamingChunks(rawText);
  let payload: ProviderPayload = null;

  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const providerMessage = payload?.error?.message
      ?? payload?.message
      ?? rawText.trim()
      ?? `Provider tra loi ${response.status}`;

    throw Object.assign(new Error(providerMessage), {
      code: 'LAB_LLM_ERROR',
      status: 502,
      details: [
        { field: 'provider.status', message: String(response.status) },
        { field: 'provider.message', message: providerMessage },
      ],
    });
  }

  const assistantContent = streamPayload?.reply || extractAssistantText(payload, rawText);
  if (!assistantContent) {
    throw Object.assign(new Error('Provider khong tra ve assistant message hop le'), {
      code: 'LAB_LLM_ERROR',
      status: 502,
      details: [
        { field: 'provider.preview', message: getPayloadPreview(payload, rawText) || 'empty-response' },
      ],
    });
  }

  return {
    reply: assistantContent,
    providerModel: streamPayload?.model ?? payload?.model ?? payload?.data?.model ?? input.model,
    usage: streamPayload?.usage ?? payload?.usage ?? payload?.data?.usage ?? null,
  };
}

/**
 * Function Objective - getElevenLabsLabConfig
 * Summary: Tra ve thong tin cau hinh va preset voice de static lab co the test nhanh.
 * Returns: enabled, model, default voice, va cac preset simple male/female/custom.
 */
export function getElevenLabsLabConfig() {
  const configured = Boolean(process.env.ELEVENLABS_API_KEY?.trim());
  const defaultVoiceId = process.env.ELEVENLABS_VOICE_ID?.trim() || DEFAULT_ELEVENLABS_VOICE_ID;
  const femaleVoiceId = process.env.ELEVENLABS_FEMALE_VOICE_ID?.trim() || '';
  const maleVoiceId = process.env.ELEVENLABS_MALE_VOICE_ID?.trim() || 'pNInz6obpgDQGcFmaJgB';

  const presets = [
    {
      id: 'default',
      label: 'Default env voice',
      voiceId: defaultVoiceId,
      gender: 'custom',
    },
    {
      id: 'male',
      label: 'Male preset',
      voiceId: maleVoiceId,
      gender: 'male',
    },
    {
      id: 'female',
      label: femaleVoiceId ? 'Female preset' : 'Female preset (set in .env)',
      voiceId: femaleVoiceId,
      gender: 'female',
    },
  ];

  return {
    enabled: configured,
    canListVoices: false,
    defaultVoiceId,
    defaultModelId: DEFAULT_ELEVENLABS_MODEL_ID,
    presets,
  };
}

/**
 * Function Objective - synthesizeElevenLabsSpeech
 * Summary: Goi ElevenLabs TTS voi voice da chon de page lab phat am thanh that.
 * Inputs: text va optional voice/model/outputFormat.
 * Returns: Buffer audio va metadata de controller stream binary cho browser.
 */
export async function synthesizeElevenLabsSpeech(input: ElevenLabsSpeechInput) {
  const apiKey = getElevenLabsApiKey();
  const baseUrl = getElevenLabsBaseUrl();
  const voiceId = input.voiceId?.trim() || process.env.ELEVENLABS_VOICE_ID?.trim() || DEFAULT_ELEVENLABS_VOICE_ID;
  const modelId = input.modelId?.trim() || DEFAULT_ELEVENLABS_MODEL_ID;
  const outputFormat = input.outputFormat?.trim() || DEFAULT_ELEVENLABS_OUTPUT_FORMAT;

  const response = await fetch(`${baseUrl}/text-to-speech/${voiceId}?output_format=${encodeURIComponent(outputFormat)}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: input.text,
      model_id: modelId,
      voice_settings: {
        stability: 0.35,
        similarity_boost: 0.8,
        style: 0.15,
        use_speaker_boost: true,
        speed: 1.0,
      },
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const providerMessage = payload?.detail?.message
      ?? payload?.message
      ?? `ElevenLabs tra loi ${response.status}`;

    throw Object.assign(new Error(providerMessage), {
      code: 'LAB_TTS_ERROR',
      status: 502,
      details: [
        { field: 'provider.status', message: String(response.status) },
        { field: 'provider.message', message: providerMessage },
      ],
    });
  }

  return {
    audio: Buffer.from(await response.arrayBuffer()),
    mimeType: getMimeType(outputFormat),
    voiceId,
    modelId,
    outputFormat,
  };
}
