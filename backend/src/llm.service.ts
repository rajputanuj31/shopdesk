import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30_000, // 30 seconds
});

const SYSTEM_PROMPT = `You are a helpful support agent for "Shopdesk", a small e-commerce store.
Be friendly, clear, and concise. Only answer based on the information below.

SHIPPING: We ship within the USA and Canada.
  - Standard shipping: 5–7 business days ($5.99)
  - Express shipping: 2–3 business days ($14.99)
  - Free standard shipping on orders over $75.

RETURNS: 30-day hassle-free returns on unworn items with original tags.
  - Refunds processed within 5 business days of receiving the return.
  - Sale items are final sale and cannot be returned.

SUPPORT HOURS: Monday–Friday, 9am–6pm EST.
  - We aim to respond to all queries within 24 hours.

PAYMENT: We accept Visa, Mastercard, Amex, PayPal, and Shop Pay.

If a customer asks something you don't know, say so honestly and offer to escalate to a human agent.
Do not make up information or guess.`;

const FRIENDLY_ERROR = "I'm having trouble responding right now. Please try again in a moment.";

export type HistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
};

/**
 * Calls OpenAI to generate a support agent reply.
 * Always returns a string — errors are caught and surfaced as friendly messages.
 */
export async function generateReply(
  history: HistoryMessage[],
  userMessage: string
): Promise<string> {
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 300,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history,
        { role: 'user', content: userMessage },
      ],
    });

    return response.choices[0]?.message?.content?.trim() ?? FRIENDLY_ERROR;
  } catch (err: unknown) {
    if (err instanceof OpenAI.APIError) {
      if (err.status === 429) {
        return "I'm getting a lot of requests right now. Please try again in a moment.";
      }
      if (err.status === 401) {
        console.error('[llm] Authentication failed — check OPENAI_API_KEY');
        return "Our support agent is temporarily unavailable. Please try again shortly.";
      }
      console.error(`[llm] OpenAI API error ${err.status}:`, err.message);
      return FRIENDLY_ERROR;
    }

    console.error('[llm] Unexpected error:', err instanceof Error ? err.message : err);
    return FRIENDLY_ERROR;
  }
}
