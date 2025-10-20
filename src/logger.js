import pino from 'pino';

const isTestRun =
  process.env.NODE_ENV === 'test' ||
  typeof process.env.NODE_TEST_CONTEXT === 'string';

/**
 * Shared application logger. Defaults to info, but quiets down during tests
 * unless LOG_LEVEL overrides it. Log levels are emitted as human-readable words.
 */
const logger = pino({
  level: process.env.LOG_LEVEL ?? (isTestRun ? 'silent' : 'info'),
  formatters: {
    level(label) {
      return { level: label };
    },
  },
});

export default logger;
export const childLogger = (bindings) => logger.child(bindings);
