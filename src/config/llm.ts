import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import 'dotenv/config';

export const provider = process.env.LLM_PROVIDER || 'claude';

function getRequiredApiKey(envName: 'CLAUDE_API_KEY' | 'OPENAI_API_KEY') {
  const apiKey = process.env[envName]?.trim();
  const isPlaceholder =
    !apiKey ||
    apiKey.includes('replace-with-your-key') ||
    apiKey.includes('replace_with_your_key');

  if (isPlaceholder) {
    throw Object.assign(
      new Error(`Thiếu ${envName} hợp lệ để gọi provider ${provider}`),
      { code: 'AI_CONFIG_ERROR', status: 500 },
    );
  }

  return apiKey;
}

export function getLLMClient() {
  if (provider === 'claude') {
    return new Anthropic({ apiKey: getRequiredApiKey('CLAUDE_API_KEY') });
  }

  return new OpenAI({ apiKey: getRequiredApiKey('OPENAI_API_KEY') });
}
