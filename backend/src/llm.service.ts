import OpenAI from 'openai';
import { getKnowledgeBase } from './db';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30_000, // 30 seconds
});

const FRIENDLY_ERROR = "I'm having trouble responding right now. Please try again in a moment.";

export type HistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
};

/**
 * Calls OpenAI to generate a support agent reply.
 * Always returns a string — errors are caught and surfaced as friendly messages.
 */
/**
 * Calls OpenAI to generate a support agent reply stream.
 * Returns the chat completions stream directly.
 */
export async function generateReply(
  history: HistoryMessage[],
  userMessage: string
) {
  const kb = getKnowledgeBase();
  const kbString = kb
    .map((item) => {
      try {
        const parsed = JSON.parse(item.value);
        return `${item.key.toUpperCase()}:\n${JSON.stringify(parsed, null, 2)}`;
      } catch {
        return `${item.key.toUpperCase()}: ${item.value}`;
      }
    })
    .join('\n\n');

  const systemPrompt = `You are a helpful support agent for "Shopdesk", a small e-commerce store.
Be friendly, clear, and concise. Only answer based on the information below.

${kbString}

If a customer asks something you don't know, say so honestly and offer to escalate to a human agent.
Do not make up information or guess.`;

  return client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 300,
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userMessage },
    ],
    stream: true,
  });
}
