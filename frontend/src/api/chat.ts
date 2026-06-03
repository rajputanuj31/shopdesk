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
}

export interface GetHistoryResponse {
  messages: Message[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function sendMessage(message: string, sessionId?: string): Promise<SendMessageResponse> {
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

  return response.json();
}

export async function getHistory(sessionId: string): Promise<GetHistoryResponse> {
  const response = await fetch(`${API_BASE_URL}/chat/history/${sessionId}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch chat history.');
  }

  return response.json();
}
