import {
  createConversation,
  conversationExists,
  insertMessage,
  getRecentMessages,
} from './db';
import { generateReply, HistoryMessage } from './llm.service';

export function generateFollowUps(reply: string, userMessage: string): string[] {
  const text = reply.toLowerCase();
  const suggestions: string[] = [];

  if (text.includes('shipping') || text.includes('ship') || text.includes('delivery')) {
    suggestions.push('Do you ship to Canada?');
    suggestions.push('Is there free shipping?');
  }
  if (text.includes('return') || text.includes('refund') || text.includes('exchange')) {
    suggestions.push('Can I return a sale item?');
    suggestions.push('How long do refunds take?');
  }
  if (text.includes('hour') || text.includes('support') || text.includes('time') || text.includes('monday') || text.includes('hours')) {
    suggestions.push('What are your support hours?');
    suggestions.push('How do I contact a human?');
  }
  if (text.includes('payment') || text.includes('pay') || text.includes('visa') || text.includes('card') || text.includes('paypal')) {
    suggestions.push('What payment methods do you accept?');
  }

  // Default suggestions if no keywords match
  if (suggestions.length === 0) {
    suggestions.push('What is your shipping policy?');
    suggestions.push('What is your return policy?');
    suggestions.push('What payment methods do you accept?');
  }

  // Filter out any suggestions that match or are contained in the user's latest query
  const cleanUserMsg = userMessage.toLowerCase().trim().replace(/[?.,!]/g, '');
  const filtered = suggestions.filter((s) => {
    const cleanSuggestion = s.toLowerCase().trim().replace(/[?.,!]/g, '');
    return !cleanUserMsg.includes(cleanSuggestion) && !cleanSuggestion.includes(cleanUserMsg);
  });

  // If filtering leaves us with empty suggestions, return some alternative default ones that do not match the user message
  if (filtered.length === 0) {
    const defaultSuggestions = [
      'What is your shipping policy?',
      'What is your return policy?',
      'What payment methods do you accept?',
    ];
    const cleanDefaults = defaultSuggestions.filter((s) => {
      const cleanSuggestion = s.toLowerCase().trim().replace(/[?.,!]/g, '');
      return !cleanUserMsg.includes(cleanSuggestion) && !cleanSuggestion.includes(cleanUserMsg);
    });
    return cleanDefaults.slice(0, 3);
  }

  // Return unique suggestions, capped at 3
  return Array.from(new Set(filtered)).slice(0, 3);
}

/**
 * Orchestrates user message handling and writes streaming LLM output in real time.
 */
export async function handleMessage(
  message: string,
  sessionId: string | undefined,
  onChunk: (chunk: string) => void
): Promise<{ sessionId: string; suggestions: string[] }> {
  const convId =
    sessionId && conversationExists(sessionId)
      ? sessionId
      : createConversation();

  insertMessage(convId, 'user', message);

  const recent = getRecentMessages(convId, 10);
  const history: HistoryMessage[] = recent
    .slice(0, -1)
    .map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

  const stream = await generateReply(history, message);
  let fullReply = '';

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) {
      fullReply += content;
      onChunk(content);
    }
  }

  insertMessage(convId, 'ai', fullReply);

  const suggestions = generateFollowUps(fullReply, message);

  return { sessionId: convId, suggestions };
}
