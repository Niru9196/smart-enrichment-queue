import { describe, expect, it } from 'vitest';
import { createLogger, type LogLevel, type LoggerOptions } from './logger.js';

function capture(opts: LoggerOptions = {}) {
  const lines: { level: LogLevel; entry: Record<string, unknown> }[] = [];
  const logger = createLogger(
    {},
    {
      level: 'debug',
      ...opts,
      sink: (level, line) =>
        lines.push({ level, entry: JSON.parse(line) as Record<string, unknown> }),
    },
  );
  return { logger, lines };
}

describe('logger', () => {
  it('writes one JSON line with core fields that callers cannot overwrite', () => {
    const { logger, lines } = capture();
    logger.info('request', { status: 200, level: 'fake', msg: 'fake', time: 'fake' });

    expect(lines).toHaveLength(1);
    expect(lines[0]?.level).toBe('info');
    expect(lines[0]?.entry).toMatchObject({ level: 'info', msg: 'request', status: 200 });
    expect(lines[0]?.entry.time).not.toBe('fake');
  });

  it('drops entries below the configured level', () => {
    const { logger, lines } = capture({ level: 'warn' });
    logger.debug('a');
    logger.info('b');
    logger.warn('c');
    logger.error('d');
    expect(lines.map((l) => l.entry.msg)).toEqual(['c', 'd']);
  });

  it('redacts sensitive keys at any depth and masks emails in text', () => {
    const { logger, lines } = capture();
    logger.info('login', {
      apiKey: 'k',
      headers: { Authorization: 'Bearer x', 'set-cookie': 'c' },
      user: { user_email: 'a@b.co', maxTokens: 5 },
      note: 'contact jane.doe@example.com today',
    });

    expect(lines[0]?.entry).toMatchObject({
      apiKey: '[REDACTED]',
      headers: { Authorization: '[REDACTED]', 'set-cookie': '[REDACTED]' },
      user: { user_email: '[REDACTED]', maxTokens: 5 },
      note: 'contact [email] today',
    });
  });

  it('serializes errors, bigints, circular references and long values safely', () => {
    const { logger, lines } = capture();
    const circular: Record<string, unknown> = { name: 'loop' };
    circular.self = circular;
    const shared = { id: 1 };
    const error = new Error('failed for bob@example.com', { cause: new Error('root') });

    logger.error('boom', {
      error,
      big: 10n,
      circular,
      pair: [shared, shared],
      list: Array.from({ length: 60 }, (_, i) => i),
      text: 'x'.repeat(2_100),
    });

    const entry = lines[0]?.entry ?? {};
    expect(entry.error).toMatchObject({
      name: 'Error',
      message: 'failed for [email]',
      cause: { message: 'root' },
    });
    expect(entry.big).toBe('10');
    expect(entry.circular).toEqual({ name: 'loop', self: '[Circular]' });
    expect(entry.pair).toEqual([{ id: 1 }, { id: 1 }]);
    expect(entry.list).toHaveLength(51);
    expect(String(entry.text)).toMatch(/…\[\+100 chars\]$/);
  });

  it('carries sanitized child bindings into every entry', () => {
    const { logger, lines } = capture();
    logger.child({ requestId: 'r1', token: 't' }).info('done');
    expect(lines[0]?.entry).toMatchObject({ requestId: 'r1', token: '[REDACTED]' });
  });

  it('never throws when the sink fails', () => {
    const logger = createLogger(
      {},
      {
        sink: () => {
          throw new Error('disk full');
        },
      },
    );
    expect(() => logger.error('still fine')).not.toThrow();
  });
});
