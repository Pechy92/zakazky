import { Request } from 'express';
import rateLimit from 'express-rate-limit';

const parsePositiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const shouldSkipApiRateLimit = (
  req: Pick<Request, 'method' | 'originalUrl'>
) => {
  if (req.method === 'OPTIONS') {
    return true;
  }

  return req.originalUrl.split('?')[0] === '/api/auth/login';
};

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parsePositiveInteger(process.env.API_RATE_LIMIT_MAX, 1000),
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipApiRateLimit,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Příliš mnoho požadavků, zkuste to prosím za chvíli.',
    });
  },
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parsePositiveInteger(process.env.LOGIN_RATE_LIMIT_MAX, 5),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  skipSuccessfulRequests: true,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Příliš mnoho neúspěšných pokusů o přihlášení, zkuste to prosím za 15 minut.',
    });
  },
});
