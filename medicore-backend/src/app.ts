
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/environment';
import { prisma } from './config/database';
import { apiLimiter } from './middleware/rate-limit';
import { errorHandler } from './middleware/error-handler';
import { router } from './routes';

export const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(apiLimiter);

// API liveness check
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
  });
});

// Database readiness check
app.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      status: 'ready',
      database: 'connected',
    });
  } catch {
    return res.status(503).json({
      status: 'not_ready',
      database: 'unavailable',
    });
  }
});

app.use('/api/v1', router);

app.use((_req, res) =>
  res.status(404).json({
    success: false,
    message: 'Route not found',
  })
);

app.use(errorHandler);

// Vercel Express entry point
export default app;
