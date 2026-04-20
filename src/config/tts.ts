import 'dotenv/config';

const DEFAULT_ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';
const DEFAULT_ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5';
const DEFAULT_ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
const DEFAULT_ELEVENLABS_OUTPUT_FORMAT = process.env.ELEVENLABS_OUTPUT_FORMAT || 'mp3_44100_128';
const DEFAULT_OPENAI_TTS_MODEL = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
const DEFAULT_OPENAI_TTS_FORMAT = process.env.OPENAI_TTS_FORMAT || 'mp3';

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function getRequiredEnv(name: 'ELEVENLABS_API_KEY' | 'OPENAI_API_KEY') {
  const value = process.env[name]?.trim();
  const isPlaceholder =
    !value ||
    value.includes('replace-with-your-key') ||
    value.includes('replace_with_your_key') ||
    value.startsWith('your_');

  if (isPlaceholder) {
    throw Object.assign(new Error(`Thiếu cấu hình ${name} hợp lệ trong .env`), {
      code: 'VOICE_PROVIDER_NOT_CONFIGURED',
      status: 500,
    });
  }

  return value;
}

export function getMimeType(outputFormat: string) {
  if (outputFormat.startsWith('mp3')) return 'audio/mpeg';
  if (outputFormat.startsWith('wav')) return 'audio/wav';
  if (outputFormat.startsWith('pcm')) return 'audio/wav';
  if (outputFormat.startsWith('ogg')) return 'audio/ogg';
  return 'application/octet-stream';
}

export async function synthesizeElevenLabsSpeech(input: {
  text: string;
  voiceId?: string | null;
  modelId?: string | null;
  outputFormat?: string | null;
}) {
  const apiKey = getRequiredEnv('ELEVENLABS_API_KEY');
  const baseUrl = normalizeBaseUrl(process.env.ELEVENLABS_BASE_URL || DEFAULT_ELEVENLABS_BASE_URL);
  const voiceId = input.voiceId?.trim() || DEFAULT_ELEVENLABS_VOICE_ID;
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
      code: 'VOICE_PROVIDER_ERROR',
      status: 502,
      details: [
        { field: 'provider', message: 'ELEVENLABS' },
        { field: 'provider.status', message: String(response.status) },
        { field: 'provider.message', message: providerMessage },
      ],
    });
  }

  return {
    audio: Buffer.from(await response.arrayBuffer()),
    mimeType: getMimeType(outputFormat),
    provider: 'ELEVENLABS' as const,
    voiceId,
    modelId,
    outputFormat,
  };
}

export async function synthesizeOpenAISpeech(input: {
  text: string;
  voice: string;
  model?: string | null;
  format?: string | null;
  instructions?: string | null;
}) {
  const apiKey = getRequiredEnv('OPENAI_API_KEY');
  const format = input.format?.trim() || DEFAULT_OPENAI_TTS_FORMAT;
  const model = input.model?.trim() || DEFAULT_OPENAI_TTS_MODEL;

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      voice: input.voice,
      response_format: format,
      input: input.text,
      instructions: input.instructions ?? undefined,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const providerMessage = payload?.error?.message
      ?? payload?.message
      ?? `OpenAI TTS tra loi ${response.status}`;

    throw Object.assign(new Error(providerMessage), {
      code: 'VOICE_PROVIDER_ERROR',
      status: 502,
      details: [
        { field: 'provider', message: 'OPENAI' },
        { field: 'provider.status', message: String(response.status) },
        { field: 'provider.message', message: providerMessage },
      ],
    });
  }

  return {
    audio: Buffer.from(await response.arrayBuffer()),
    mimeType: getMimeType(format),
    provider: 'OPENAI' as const,
    voiceId: input.voice,
    modelId: model,
    outputFormat: format,
  };
}
