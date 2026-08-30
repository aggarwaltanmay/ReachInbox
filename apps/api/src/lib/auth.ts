import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken'; import { env } from '../config/env.js';
export type AuthRequest = Request & { user: { id: string; email: string; name: string } };
export function auth(req: Request, res: Response, next: NextFunction) { try { const token = req.headers.authorization?.replace('Bearer ', ''); if (!token) throw new Error('Missing token'); (req as AuthRequest).user = jwt.verify(token, env.JWT_SECRET) as AuthRequest['user']; next(); } catch { res.status(401).json({ error: 'Unauthorized' }); } }
export function issueToken(user: { id: string; email: string; name: string }) {
  // Never re-sign the decoded JWT object itself: it also contains iat/exp,
  // which conflicts with the new expiresIn option used for OAuth state.
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}
export function verifyToken<T>(token: string) { return jwt.verify(token, env.JWT_SECRET) as T; }
