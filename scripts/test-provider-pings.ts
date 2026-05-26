import 'dotenv/config';
import prisma from '../src/config/database';
import { embedText } from '../src/modules/ai-models/ai-models.service';
import { synthesizeElevenLabsSpeech } from '../src/config/tts';

type ProviderResult = {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  detail: string;
};

const results: ProviderResult[] = [];

function isConfigured(value: string | undefined) {
  if (!value?.trim()) return false;
  const lowered = value.toLowerCase();
  return !(
    lowered.includes('replace-with') ||
    lowered.includes('replace_with') ||
    lowered.startsWith('your_') ||
    lowered.startsWith('sk-replace')
  );
}

function record(name: string, status: ProviderResult['status'], detail: string) {
  results.push({ name, status, detail });
  console.log(`[${status}] ${name} - ${detail}`);
}

async function testGeminiEmbedding() {
  if (!isConfigured(process.env.GEMINI_API_KEY)) {
    record('Gemini embedding', 'SKIP', 'GEMINI_API_KEY is missing or placeholder');
    return;
  }

  const startedAt = Date.now();
  try {
    const embedding = await embedText({
      text: 'Scenio provider ping: recommend an airport check-in speaking scene.',
      mode: 'QUERY',
    });

    record(
      'Gemini embedding',
      'PASS',
      `provider=${embedding.provider}, model=${embedding.modelId}, dimension=${embedding.embeddingDimension}, latencyMs=${Date.now() - startedAt}, fallbackUsed=${embedding.fallbackUsed}`,
    );
  } catch (error: any) {
    record('Gemini embedding', 'FAIL', error?.message || String(error));
  }
}

async function testElevenLabsTts() {
  if (!isConfigured(process.env.ELEVENLABS_API_KEY)) {
    record('ElevenLabs TTS', 'SKIP', 'ELEVENLABS_API_KEY is missing or placeholder');
    return;
  }

  const startedAt = Date.now();
  try {
    const audio = await synthesizeElevenLabsSpeech({
      text: process.env.PROVIDER_PING_TTS_TEXT || 'Scenio voice ping.',
      voiceId: process.env.ELEVENLABS_VOICE_ID,
      modelId: process.env.ELEVENLABS_MODEL_ID,
      outputFormat: process.env.ELEVENLABS_OUTPUT_FORMAT,
    });

    record(
      'ElevenLabs TTS',
      'PASS',
      `provider=${audio.provider}, model=${audio.modelId}, voiceId=${audio.voiceId}, bytes=${audio.audio.length}, latencyMs=${Date.now() - startedAt}`,
    );
  } catch (error: any) {
    record('ElevenLabs TTS', 'FAIL', error?.message || String(error));
  }
}

async function testOpenAiConfigured() {
  if (!isConfigured(process.env.OPENAI_API_KEY)) {
    record('OpenAI', 'SKIP', 'OPENAI_API_KEY is missing or placeholder');
    return;
  }

  record('OpenAI', 'SKIP', 'Key is configured, but this ping script does not spend OpenAI credits by default');
}

async function testClaudeConfigured() {
  if (!isConfigured(process.env.CLAUDE_API_KEY)) {
    record('Anthropic Claude', 'SKIP', 'CLAUDE_API_KEY is missing or placeholder');
    return;
  }

  record('Anthropic Claude', 'SKIP', 'Key is configured, but this ping script does not spend Claude credits by default');
}

async function main() {
  console.log('Scenio provider/model ping');
  console.log('Keys are never printed. Only provider/model metadata and pass/fail are shown.');
  console.log('');

  await testGeminiEmbedding();
  await testElevenLabsTts();
  await testOpenAiConfigured();
  await testClaudeConfigured();

  const failed = results.filter((item) => item.status === 'FAIL');
  const passed = results.filter((item) => item.status === 'PASS');
  const skipped = results.filter((item) => item.status === 'SKIP');

  console.log('');
  console.log(`Summary: pass=${passed.length}, skip=${skipped.length}, fail=${failed.length}`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

