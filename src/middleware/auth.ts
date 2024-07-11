import { Request, Response, NextFunction } from 'express';
import { CONFIG } from '../config/config';

export const authenticateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.header('X-API-Key');

  if (!apiKey || apiKey !== CONFIG.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }

  next();
};