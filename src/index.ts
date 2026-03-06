import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes';
import logger from './utils/logger';
import prisma from './database/client';

dotenv.config();

const app = express();
const PORT = process.env.APP_PORT || 3000;

// Security Middlewares
app.use(helmet());

// Environment based CORS configuration
const allowedOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`Incoming Request: ${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Advanced Health Check
app.get('/', (req: Request, res: Response) => {
  res.status(200).send('SaaS API Node/Express is running securely. Please access /health to check database connection.');
});

app.get('/health', async (req: Request, res: Response) => {
  const health: any = { status: 'UP', timestamp: new Date(), db: 'DOWN' };
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.db = 'UP';
    res.status(200).json(health);
  } catch (error) {
    health.db = 'DOWN';
    res.status(503).json(health);
  }
});

// API Routes Mounted
app.use('/api', apiRoutes);

// Centralized Error Handling
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack, ip: req.ip });
  const status = err.status || 500;
  res.status(status).json({
    error: {
      message: err.message || 'Internal Server Error',
    },
  });
});

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  console.log(`Server is running on port ${PORT}`);
});
