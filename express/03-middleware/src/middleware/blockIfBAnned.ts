import { type Request, type Response, type NextFunction } from 'express';

// A middleware that ENDS the cycle instead of continuing.
// next() is deliberately not called on the blocked path.
export const blockIfBanned = (req: Request, res: Response, next: NextFunction) => {
  if (req.query.banned === 'true') {
    res.status(403).json({ error: 'You are banned' });
    return;
  }
  next();
};