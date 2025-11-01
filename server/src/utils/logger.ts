/**
 * Structured Logging with Winston
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from '../config/env';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development (human-readable)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  defaultMeta: { service: 'radar-ai-server' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: config.isDevelopment ? consoleFormat : logFormat,
    }),
  ],
});

// Add file transports in production
if (config.isProduction) {
  // Error log file with rotation
  logger.add(
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
    })
  );

  // Combined log file with rotation
  logger.add(
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
    })
  );
}

// Create child loggers for different components
export const createLogger = (component: string) => {
  return logger.child({ component });
};

export { logger };
export default logger;
