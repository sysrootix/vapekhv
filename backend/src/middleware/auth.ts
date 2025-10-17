import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthRequest extends Request {
  userId?: string;
  telegramId?: number;
  user?: {
    id: string;
    telegramId: number;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: 'Требуется авторизация' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      telegramId: number;
    };

    req.userId = decoded.userId;
    req.telegramId = decoded.telegramId;
    req.user = {
      id: decoded.userId,
      telegramId: decoded.telegramId,
    };

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Недействительный токен' });
  }
};

export const generateToken = (userId: string, telegramId: number): string => {
  return jwt.sign(
    { userId, telegramId },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

