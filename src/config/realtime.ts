import 'dotenv/config';

const DEFAULT_REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime';
const DEFAULT_REALTIME_VOICE = process.env.OPENAI_REALTIME_VOICE || 'marin';
const DEFAULT_REALTIME_TEMPERATURE = Number(process.env.OPENAI_REALTIME_TEMPERATURE || '0.6');
const DEFAULT_TRANSCRIBE_MODEL = process.env.OPENAI_REALTIME_TRANSCRIBE_MODEL || 'gpt-4o-transcribe';
const DEFAULT_TRANSCRIBE_PROMPT = process.env.OPENAI_REALTIME_TRANSCRIBE_PROMPT
  || 'Transcribe English learner speech exactly. Preserve grammar mistakes, hesitations, and word choice. Do not correct or rewrite the learner.';
const DEFAULT_API_URL = process.env.OPENAI_REALTIME_API_URL || 'https://api.openai.com/v1/realtime/client_secrets';

function getRequiredOpenAIApiKey() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const isPlaceholder =
    !apiKey ||
    apiKey.includes('replace-with-your-key') ||
    apiKey.includes('replace_with_your_key') ||
    apiKey.startsWith('your_');

  if (isPlaceholder) {
    throw Object.assign(new Error('Thiếu OPENAI_API_KEY hợp lệ để tạo realtime client secret'), {
      code: 'AI_CONFIG_ERROR',
      status: 500,
    });
  }

  return apiKey;
}

export function getRealtimeDefaults() {
  return {
    model: DEFAULT_REALTIME_MODEL,
    voice: DEFAULT_REALTIME_VOICE,
    temperature: DEFAULT_REALTIME_TEMPERATURE,
    transcriptionModel: DEFAULT_TRANSCRIBE_MODEL,
  };
}

export async function createRealtimeClientSecret(input: {
  instructions: string;
  voice: string;
  model?: string;
  transcriptionModel?: string;
  transcriptionPrompt?: string;
}) {
  const apiKey = getRequiredOpenAIApiKey();
  const model = input.model?.trim() || DEFAULT_REALTIME_MODEL;
  const transcriptionModel = input.transcriptionModel?.trim() || DEFAULT_TRANSCRIBE_MODEL;
  const transcriptionPrompt = input.transcriptionPrompt?.trim() || DEFAULT_TRANSCRIBE_PROMPT;

  const response = await fetch(DEFAULT_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      expires_after: {
        anchor: 'created_at',
        seconds: 60,
      },
      session: {
        type: 'realtime',
        model,
        instructions: input.instructions,
        output_modalities: ['audio'],
        audio: {
          input: {
            format: {
              type: 'audio/pcm',
              rate: 24000,
            },
            noise_reduction: {
              type: 'near_field',
            },
            transcription: {
              model: transcriptionModel,
              language: 'en',
              prompt: transcriptionPrompt,
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.72,
              prefix_padding_ms: 240,
              silence_duration_ms: 980,
              create_response: false,
              interrupt_response: false,
            },
          },
          output: {
            format: {
              type: 'audio/pcm',
              rate: 24000,
            },
            voice: input.voice || DEFAULT_REALTIME_VOICE,
            speed: 1.0,
          },
        },
      },
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const providerMessage = payload?.error?.message
      ?? payload?.message
      ?? `OpenAI Realtime tra loi ${response.status}`;

    throw Object.assign(new Error(providerMessage), {
      code: 'AI_ENGINE_ERROR',
      status: 502,
      details: [
        { field: 'provider', message: 'OPENAI_REALTIME' },
        { field: 'provider.status', message: String(response.status) },
        { field: 'provider.message', message: providerMessage },
      ],
    });
  }

  const clientSecretValue = payload?.value ?? payload?.client_secret?.value ?? payload?.session?.client_secret?.value;
  const clientSecretExpiresAt = payload?.expires_at
    ?? payload?.client_secret?.expires_at
    ?? payload?.session?.client_secret?.expires_at
    ?? null;
  const providerSessionId = payload?.session?.id ?? null;

  if (!clientSecretValue) {
    throw Object.assign(new Error('OpenAI Realtime không trả về client secret hợp lệ'), {
      code: 'AI_ENGINE_ERROR',
      status: 502,
    });
  }

  return {
    clientSecret: {
      value: clientSecretValue,
      expiresAt: clientSecretExpiresAt,
    },
    session: payload?.session ?? null,
    providerSessionId,
    model,
    voice: input.voice || DEFAULT_REALTIME_VOICE,
  };
}
