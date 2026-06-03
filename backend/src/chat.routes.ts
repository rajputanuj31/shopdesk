import { Router, Request, Response } from 'express';
import { validateMessage } from './validate';
import { handleMessage } from './chat.service';
import { conversationExists, getFullHistory } from './db';

const router = Router();

// POST /chat/message
// Body: { message: string, sessionId?: string }
// Returns: { reply: string, sessionId: string }
router.post('/message', validateMessage, async (req: Request, res: Response) => {
  try {
    const { message, sessionId } = req.body as { message: string; sessionId?: string };
    const result = await handleMessage(message, sessionId);
    res.json(result);
  } catch (err) {
    console.error('[route] POST /chat/message error:', err);
    res.status(500).json({ error: 'Failed to process message. Please try again.' });
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
