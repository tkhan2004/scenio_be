import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { Level } from '@prisma/client';
import { getLLMClient, provider } from '../../config/llm';
import { LevelTestHistoryItem, LevelTestInput } from '../../schemas/sessions';
import * as sessionsRepo from './sessions.repository';

const LEVEL_RESULT_PATTERN = /\[LEVEL_RESULT\]([\s\S]*?)\[\/LEVEL_RESULT\]/;
const LEVEL_VALUES: Level[] = [Level.A1, Level.A2, Level.B1, Level.B2];
const OPENAI_LEVEL_TEST_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const CLAUDE_LEVEL_TEST_MODEL = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';

type ProviderMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type LevelTestResult = {
  aiMessage: string;
  isComplete: boolean;
  level?: Level;
  rationale?: string;
};

/**
 * Helper - getLevelTestSystemPrompt
 * Summary: Tạo system prompt chuẩn cho bài test trình độ 5 lượt.
 * Notes: AI phải trả marker [LEVEL_RESULT] ở lượt hoàn thành.
 */
function getLevelTestSystemPrompt() {
  return `You are a friendly English conversation partner named Alex.
Your hidden task is to assess the user's English level (A1, A2, B1, or B2)
through natural conversation. Do not mention you are running a test.

CONVERSATION RULES:
- Start with a simple warm greeting and an easy question
- Ask exactly 5 questions total, gradually increasing complexity
- React naturally to the user's answers with curiosity and short follow-ups
- Keep your own sentences short and clear
- Do NOT correct the user's English during the conversation

QUESTION PROGRESSION:
- Turn 1: Very simple (name, where they are from, what they do)
- Turn 2: Simple present (hobbies, daily routine)
- Turn 3: Past tense (recent experience, last weekend)
- Turn 4: Opinion / preference (compare things, give reasons)
- Turn 5: Hypothetical or future plans

ASSESSMENT CRITERIA:
- A1: Very basic words only, many errors, short sentences
- A2: Simple sentences, common vocabulary, some errors
- B1: Can express ideas, some complex sentences, occasional errors
- B2: Fluent expression, good grammar, varied vocabulary

FINAL RESPONSE FORMAT:
After the 5th user response, end the conversation naturally, then on a NEW LINE append ONLY:
[LEVEL_RESULT]{"level":"B1","rationale":"Có thể diễn đạt ý tưởng rõ ràng, đôi khi còn lỗi nhỏ"}[/LEVEL_RESULT]

Do NOT append the marker before the final assessment.`;
}

/**
 * Helper - toProviderMessages
 * Summary: Chuyển history từ client sang format message của provider LLM.
 * Notes: Khi turnIndex = 0 và chưa có history, helper tự tạo opening prompt.
 */
function toProviderMessages(history: LevelTestHistoryItem[], message: string | null | undefined, turnIndex: number): ProviderMessage[] {
  const messages = history.map<ProviderMessage>((item) => ({
    role: item.role === 'USER' ? 'user' : 'assistant',
    content: item.content,
  }));

  if (message) {
    messages.push({ role: 'user', content: message });
    return messages;
  }

  if (turnIndex === 0 && history.length === 0) {
    return [{ role: 'user', content: 'Start the conversation naturally with a greeting and your first easy question.' }];
  }

  return messages;
}

/**
 * Helper - parseLevelResult
 * Summary: Parse marker [LEVEL_RESULT] từ phản hồi AI khi bài test hoàn tất.
 * Notes: Nếu JSON sai format sẽ throw AI_ENGINE_ERROR để controller trả lỗi chuẩn.
 */
function parseLevelResult(responseText: string) {
  const match = responseText.match(LEVEL_RESULT_PATTERN);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[1]) as { level?: string; rationale?: string };
    if (!parsed.level || !LEVEL_VALUES.includes(parsed.level as Level)) {
      throw new Error('Level test result không hợp lệ');
    }

    return {
      aiMessage: responseText.replace(match[0], '').trim(),
      level: parsed.level as Level,
      rationale: parsed.rationale?.trim() || 'Kết quả được suy ra từ hội thoại 5 lượt.',
    };
  } catch (error) {
    throw Object.assign(new Error('Không thể parse kết quả level test từ AI'), {
      code: 'AI_ENGINE_ERROR',
      status: 502,
    });
  }
}

/**
 * Helper - generateLevelTestReply
 * Summary: Gọi Claude hoặc OpenAI để sinh phản hồi cho level test.
 * Notes: Provider được chọn bởi config hiện tại trong src/config/llm.ts.
 */
async function generateLevelTestReply(messages: ProviderMessage[]) {
  const client = getLLMClient();
  const systemPrompt = getLevelTestSystemPrompt();

  try {
    if (provider === 'claude') {
      const anthropic = client as Anthropic;
      const response = await anthropic.messages.create({
        model: CLAUDE_LEVEL_TEST_MODEL,
        max_tokens: 400,
        temperature: 0.4,
        system: systemPrompt,
        messages,
      });

      const text = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
        .trim();

      if (!text) {
        throw new Error('Claude không trả về nội dung');
      }

      return text;
    }

    const openai = client as OpenAI;
    const response = await openai.chat.completions.create({
      model: OPENAI_LEVEL_TEST_MODEL,
      temperature: 0.4,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) {
      throw new Error('OpenAI không trả về nội dung');
    }

    return text;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && 'status' in error) {
      throw error;
    }

    throw Object.assign(new Error('Không thể gọi AI engine cho level test'), {
      code: 'AI_ENGINE_ERROR',
      status: 502,
      details: error instanceof Error
        ? [{ field: 'provider', message: error.message }]
        : null,
    });
  }
}

/**
 * Function Objective - runLevelTest
 * Summary: Xử lý một lượt level test cho user hiện tại.
 * Inputs: userId và payload level test đã validate.
 * Behavior: Kiểm tra trạng thái user -> gọi AI -> parse marker -> update level nếu hoàn tất.
 * Returns: AI message, cờ isComplete, và level/rationale nếu bài test đã xong.
 */
export async function runLevelTest(userId: string, input: LevelTestInput): Promise<LevelTestResult> {
  const user = await sessionsRepo.findUserById(userId);
  if (!user) {
    throw Object.assign(new Error('Người dùng không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  if (!user.needsLevelTest) {
    throw Object.assign(new Error('Người dùng đã hoàn thành level test'), {
      code: 'LEVEL_TEST_ALREADY_COMPLETED',
      status: 409,
    });
  }

  const reply = await generateLevelTestReply(
    toProviderMessages(input.history, input.message, input.turnIndex),
  );

  const parsed = parseLevelResult(reply);
  if (!parsed) {
    return {
      aiMessage: reply,
      isComplete: false,
    };
  }

  await sessionsRepo.completeLevelTest(userId, parsed.level);

  return {
    aiMessage: parsed.aiMessage,
    isComplete: true,
    level: parsed.level,
    rationale: parsed.rationale,
  };
}
