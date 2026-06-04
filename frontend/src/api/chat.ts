export interface Message {
  id: string;
  conversation_id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  isError?: boolean; // UI-only helper flag
}

export interface SendMessageResponse {
  reply: string;
  sessionId: string;
  suggestions?: string[];
}

export interface GetHistoryResponse {
  messages: Message[];
  suggestions?: string[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Sends a chat message and streams the AI's response chunk-by-chunk.
 */
export async function sendMessage(
  message: string,
  sessionId: string | undefined,
  onChunk: (chunk: string) => void,
  onDone: (data: { sessionId: string; suggestions: string[] }) => void,
  onError: (err: Error) => void
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, sessionId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to send message.');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('ReadableStream not supported by your browser.');
    }

    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Save incomplete line to buffer

      for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine.startsWith('data: ')) continue;

        try {
          const parsed = JSON.parse(cleanLine.slice(6));
          if (parsed.error) {
            throw new Error(parsed.error);
          }
          if (parsed.chunk) {
            onChunk(parsed.chunk);
          }
          if (parsed.done) {
            onDone({ sessionId: parsed.sessionId, suggestions: parsed.suggestions || [] });
          }
        } catch (e) {
          console.error('Failed to parse stream line:', cleanLine, e);
        }
      }
    }
  } catch (err: any) {
    onError(err instanceof Error ? err : new Error(err.message || 'Streaming failed'));
  }
}

export async function getHistory(sessionId: string): Promise<GetHistoryResponse> {
  const response = await fetch(`${API_BASE_URL}/chat/history/${sessionId}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch chat history.');
  }

  return response.json();
}
