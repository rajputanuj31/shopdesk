import {
  createConversation,
  conversationExists,
  insertMessage,
  getRecentMessages,
} from './db';
import { generateReply, HistoryMessage } from './llm.service';


export async function handleMessage(
  message: string,
  sessionId?: string
): Promise<{ reply: string; sessionId: string }> {
  // Resolve conversation — create a new one if sessionId is missing or unknown
  const convId =
    sessionId && conversationExists(sessionId)
      ? sessionId
      : createConversation();

  // Persist the incoming user message
  insertMessage(convId, 'user', message);

  // Fetch the last 10 messages for context (excludes the one we just inserted
  // so we pass it explicitly as userMessage to generateReply)
  const recent = getRecentMessages(convId, 10);
  const history: HistoryMessage[] = recent
    .slice(0, -1) // drop the last entry (the user message we just inserted)
    .map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

  // Call the LLM — always returns a string, never throws
  const reply = await generateReply(history, message);

  // Persist the AI reply
  insertMessage(convId, 'ai', reply);

  return { reply, sessionId: convId };
}
