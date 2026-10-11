import { env, type Env } from '../config/env.js';

export type LogLevel = Env['LOG_LEVEL'];
export type Fields = Record<string, unknown>;

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface Logger {
  debug(msg: string, fields?: Fields): void;
  info(msg: string, fields?: Fields): void;
  warn(msg: string, fields?: Fields): void;
  error(msg: string, fields?: Fields): void;
  child(bindings: Fields): Logger;
}

export type Sink = (level: LogLevel, line: string) => void;

export interface LoggerOptions {
  sink?: Sink;
  level?: LogLevel;
}

/* ----------------------------- limits ----------------------------- */

const MAX_DEPTH = 4;
const MAX_STRING = 2_000;
const MAX_STACK = 8_000;
const MAX_ARRAY = 50;

/* --------------------------- redaction ---------------------------- */

// Matched against the key lowercased with non-alphanumerics removed,
// so `api-key`, `API_KEY` and `apiKey` all normalize to `apikey`.
const EXACT_KEYS = new Set([
  'authorization',
  'cookie',
  'setcookie',
  'contact',
  'databaseurl',
  'directurl',
]);
const SUFFIX_KEYS = ['password', 'passwd', 'secret', 'token', 'apikey', 'email', 'phone'];

// `accessToken`, `user_email` -> redacted. `emailsFound`, `maxTokens` -> kept.
function isSensitiveKey(key: string): boolean {
  const k = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  return EXACT_KEYS.has(k) || SUFFIX_KEYS.some((s) => k.endsWith(s));
}

// Heuristic backstop for PII inside free text (error messages, scraped strings).
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

function cleanString(s: string, max = MAX_STRING): string {
  const scrubbed = s.replace(EMAIL, '[email]');
  return scrubbed.length > max
    ? `${scrubbed.slice(0, max)}…[+${scrubbed.length - max} chars]`
    : scrubbed;
}

/* --------------------------- sanitizing --------------------------- */

// `ancestors` holds only the current path, so shared (non-circular) references are not
// mislabelled as [Circular].
type Ancestors = WeakSet<object>;

function sanitizeFields(fields: object, depth: number, ancestors: Ancestors): Fields {
  const out: Fields = {};
  for (const [key, nested] of Object.entries(fields)) {
    out[key] = isSensitiveKey(key) ? '[REDACTED]' : sanitize(nested, depth + 1, ancestors);
  }
  return out;
}

function sanitize(value: unknown, depth = 0, ancestors: Ancestors = new WeakSet()): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'string') return cleanString(value);
  if (value === null || typeof value !== 'object') return value;

  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
    return `[Binary ${value.byteLength} bytes]`;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '[Invalid Date]' : value.toISOString();
  }

  if (depth >= MAX_DEPTH) return '[Truncated]';
  if (ancestors.has(value)) return '[Circular]';

  ancestors.add(value);
  try {
    if (value instanceof Error) {
      return {
        ...sanitizeFields(value, depth, ancestors), // own props such as code or status
        name: value.name,
        message: cleanString(value.message),
        stack: value.stack ? cleanString(value.stack, MAX_STACK) : undefined,
        cause: value.cause === undefined ? undefined : sanitize(value.cause, depth + 1, ancestors),
      };
    }

    if (value instanceof Map) return sanitize([...value.entries()], depth + 1, ancestors);
    if (value instanceof Set) return sanitize([...value], depth + 1, ancestors);

    if (Array.isArray(value)) {
      const items = value.slice(0, MAX_ARRAY).map((v) => sanitize(v, depth + 1, ancestors));
      return value.length > MAX_ARRAY ? [...items, `[+${value.length - MAX_ARRAY} more]`] : items;
    }

    return sanitizeFields(value, depth, ancestors);
  } finally {
    ancestors.delete(value);
  }
}

/* ----------------------------- logger ----------------------------- */

const defaultSink: Sink = (level, line) => {
  if (level === 'debug') console.debug(line);
  else if (level === 'info') console.info(line);
  else if (level === 'warn') console.warn(line);
  else console.error(line);
};

function build(bindings: Fields, sink: Sink, threshold: number): Logger {
  const write = (level: LogLevel, msg: string, fields: Fields = {}): void => {
    if (LEVELS[level] < threshold) return;

    const time = new Date().toISOString();
    let line: string;

    try {
      const extra: Fields = { ...bindings, ...sanitizeFields(fields, 0, new WeakSet()) };
      // Core fields always win over caller fields of the same name.
      delete extra.level;
      delete extra.time;
      delete extra.msg;
      line = JSON.stringify({ level, time, msg: cleanString(msg), ...extra });
    } catch {
      line = JSON.stringify({
        level,
        time,
        msg: cleanString(msg),
        logError: 'serialization_failed',
      });
    }

    try {
      sink(level, line);
    } catch {
      // A failing sink must never crash application code.
    }
  };

  return {
    debug: (msg, fields) => write('debug', msg, fields),
    info: (msg, fields) => write('info', msg, fields),
    warn: (msg, fields) => write('warn', msg, fields),
    error: (msg, fields) => write('error', msg, fields),
    // Parent bindings are already sanitized; only the new ones need it.
    child: (extra) =>
      build({ ...bindings, ...sanitizeFields(extra, 0, new WeakSet()) }, sink, threshold),
  };
}

/** Structured JSON logger. Sensitive keys are redacted and emails in strings are masked. */
export function createLogger(bindings: Fields = {}, opts: LoggerOptions = {}): Logger {
  return build(
    sanitizeFields(bindings, 0, new WeakSet()),
    opts.sink ?? defaultSink,
    LEVELS[opts.level ?? 'info'],
  );
}

/* ------------------------- default instance ------------------------ */

// Tests only print errors; LOG_LEVEL is validated in config/env.ts.
export const logger = createLogger(
  {},
  { level: env.NODE_ENV === 'test' ? 'error' : env.LOG_LEVEL },
);

/** Backwards-compatible entry point for existing call sites: log('info', 'msg', { ... }). */
export function log(level: LogLevel, msg: string, fields: Fields = {}): void {
  logger[level](msg, fields);
}
