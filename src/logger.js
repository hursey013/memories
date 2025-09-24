import pino from 'pino';

const baseLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'production'
      ? undefined
      : {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
          },
        },
});

export const logger = baseLogger;
export const childLogger = (bindings) => baseLogger.child(bindings);
