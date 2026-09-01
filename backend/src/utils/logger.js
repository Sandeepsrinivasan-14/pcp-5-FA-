/**
 * Minimal structured logger. Emits JSON in production so log aggregators can
 * parse it, and human-readable lines everywhere else. Silent under test.
 */
const config = require('../config');

const write = (level, message, meta) => {
    if (config.isTest) return;

    if (config.isProduction) {
        process.stdout.write(
            `${JSON.stringify({
                level,
                message,
                time: new Date().toISOString(),
                ...(meta ? { meta } : {}),
            })}\n`
        );
        return;
    }

    const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}`;
    process.stdout.write(meta ? `${line} ${JSON.stringify(meta)}\n` : `${line}\n`);
};

module.exports = {
    info: (message, meta) => write('info', message, meta),
    warn: (message, meta) => write('warn', message, meta),
    error: (message, meta) => write('error', message, meta),
};
