import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import 'dotenv/config';

export const provider = process.env.LLM_PROVIDER || 'claude';

export function getLLMClient() {
  if (provider === 'claude') {
    return new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}
