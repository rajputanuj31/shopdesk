import { Request, Response, NextFunction } from 'express';

const MAX_MESSAGE_LENGTH = 2000;

export function validateMessage(req: Request, res: Response, next: NextFunction): void {
  const { message } = req.body;

  if (typeof message !== 'string' || message.trim().length === 0) {
    res.status(400).json({ error: 'Message is required and must be a non-empty string.' });
    return;
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    console.warn(`[validate] Message truncated from ${message.length} to ${MAX_MESSAGE_LENGTH} chars`);
    req.body.message = message.slice(0, MAX_MESSAGE_LENGTH);
  } else {
    req.body.message = message.trim();
  }

  next();
}
