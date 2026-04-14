import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io/v1';
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5';
const ELEVENLABS_TEXT = process.env.ELEVENLABS_TEXT || 'Hello, this is a quick ElevenLabs voice test from Scenio.';
const ELEVENLABS_OUTPUT_PATH = process.env.ELEVENLABS_OUTPUT_PATH || 'tmp/elevenlabs-test.mp3';

function getHeaders() {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('Missing ELEVENLABS_API_KEY in .env');
  }

  return {
    'xi-api-key': ELEVENLABS_API_KEY,
    'Content-Type': 'application/json',
  };
}

async function listVoices() {
  const response = await fetch(`${ELEVENLABS_BASE_URL}/voices`, {
    method: 'GET',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY!,
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.detail?.message || payload?.message || `ElevenLabs voices error ${response.status}`);
  }

  const voices = Array.isArray(payload?.voices) ? payload.voices : [];
  if (voices.length === 0) {
    console.log('No voices returned.');
    return;
  }

  console.log('Available voices:');
  for (const voice of voices.slice(0, 20)) {
    const gender = voice?.labels?.gender || '-';
    const accent = voice?.labels?.accent || '-';
    const age = voice?.labels?.age || '-';
    console.log(`- ${voice.name} | id=${voice.voice_id} | gender=${gender} | accent=${accent} | age=${age}`);
  }
}

async function createSpeech() {
  const outputPath = path.resolve(process.cwd(), ELEVENLABS_OUTPUT_PATH);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const response = await fetch(
    `${ELEVENLABS_BASE_URL}/text-to-speech/${ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        text: ELEVENLABS_TEXT,
        model_id: ELEVENLABS_MODEL_ID,
        voice_settings: {
          stability: 0.35,
          similarity_boost: 0.8,
          style: 0.15,
          use_speaker_boost: true,
          speed: 1.0,
        },
      }),
    },
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail?.message || payload?.message || `ElevenLabs TTS error ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);

  console.log(`Audio saved to: ${outputPath}`);
  console.log(`Voice ID: ${ELEVENLABS_VOICE_ID}`);
  console.log(`Model ID: ${ELEVENLABS_MODEL_ID}`);
}

async function main() {
  const command = process.argv[2] || 'speak';

  if (!ELEVENLABS_API_KEY) {
    throw new Error('Missing ELEVENLABS_API_KEY in .env');
  }

  if (command === 'list') {
    await listVoices();
    return;
  }

  await createSpeech();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
