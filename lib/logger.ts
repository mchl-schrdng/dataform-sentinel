import pino from "pino";

const level = process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug");

export const logger = pino({
  level,
  // Cloud Logging compatible JSON
  formatters: {
    level(label) {
      return { severity: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  messageKey: "message",
  base: undefined,
});

export type Logger = typeof logger;
