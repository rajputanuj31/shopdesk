import { Router, Request, Response } from 'express';
import { validateMessage } from './validate';
import { handleMessage } from './chat.service';
import { conversationExists, getFullHistory } from './db';

const router = Router();

// POST /chat/message
// Body: { message: string, sessionId?: string }
// Returns: Server-Sent Events (text/event-stream)
router.post('/message', validateMessage, async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Content-Encoding', 'none');

  const { message, sessionId } = req.body as { message: string; sessionId?: string };

  try {
    const result = await handleMessage(message, sessionId, (chunk) => {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    });

    res.write(`data: ${JSON.stringify({ sessionId: result.sessionId, suggestions: result.suggestions, done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error('[route] POST /chat/message stream error:', err);
    res.write(`data: ${JSON.stringify({ error: 'Failed to process message. Please try again.' })}\n\n`);
    res.end();
  }
});

// GET /chat/history/:sessionId
// Returns: { messages: Message[] }
router.get('/history/:sessionId', async (req: Request, res: Response) => {
  try {
    const sessionId = String(req.params.sessionId);

    if (!conversationExists(sessionId)) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }

    const messages = getFullHistory(sessionId);
    res.json({ messages });
  } catch (err) {
    console.error('[route] GET /chat/history error:', err);
    res.status(500).json({ error: 'Failed to fetch history. Please try again.' });
  }
});

export default router;
