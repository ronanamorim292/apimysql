import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { AuthRequest } from './auth';

// Login brute-force protection
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 5000, // Limit each IP to 5000 login requests (Desabilitado pro Lovable bater)
  message: { error: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API Rate limiting isolated per tenant (or IP if unauthenticated)
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 100000, // limit each tenant / IP to 100k requests per window (Desligado p/ testes)
  keyGenerator: (req: Request) => {
    // Cast explicitly to AuthRequest to pull user data safely if mapped
    const authReq = req as AuthRequest;
    return authReq.user?.tenantId || req.ip || 'unknown';
  },
  message: { error: 'Too many requests for this tenant/IP, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
