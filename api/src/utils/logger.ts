type Level = "info" | "warn" | "error" | "debug";

function emit(level: Level, scope: string, msg: string, meta?: unknown) {
  const ts = new Date().toISOString();
  const line = `${ts} [${level.toUpperCase()}] (${scope}) ${msg}`;
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  if (meta !== undefined) fn(line, meta);
  else fn(line);
}

export function createLogger(scope: string) {
  return {
    info: (msg: string, meta?: unknown) => emit("info", scope, msg, meta),
    warn: (msg: string, meta?: unknown) => emit("warn", scope, msg, meta),
    error: (msg: string, meta?: unknown) => emit("error", scope, msg, meta),
    debug: (msg: string, meta?: unknown) => emit("debug", scope, msg, meta),
  };
}

export const logger = createLogger("app");
