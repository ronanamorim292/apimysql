import winston from 'winston';
import prisma from '../database/client';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

export const logToDb = async (
  action: string,
  message: string,
  tenantId: string,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
) => {
  try {
    await prisma.log.create({
      data: {
        action,
        message,
        tenantId,
        userId,
        ipAddress,
        userAgent,
      },
    });
  } catch (error: any) {
    logger.error('Failed to write log to database', { error: error.message });
  }
};

export default logger;
