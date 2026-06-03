import { Router, Request, Response } from 'express';
import { validateMessage } from './validate';

const router = Router();

// POST /chat/message
// Accepts { message: string, sessionId?: string }
// Returns { reply: string, sessionId: string }
router.post('/message', validateMessage, async (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented yet' });
});

// GET /chat/history/:sessionId
// Returns { messages: Message[] }
router.get('/history/:sessionId', async (req: Request, res: Response) => {
  const sessionId = String(req.params.sessionId);

  if (!sessionId || sessionId.trim().length === 0) {
    res.status(400).json({ error: 'sessionId is required.' });
    return;
  }

  res.status(501).json({ error: 'Not implemented yet' });
});

export default router;
