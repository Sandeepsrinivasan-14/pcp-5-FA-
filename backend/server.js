const config = require('./src/config');
const logger = require('./src/utils/logger');

const start = async () => {
    try {
        config.validate();
    } catch (error) {
        // Configuration problems are the operator's to fix; print them plainly
        // rather than as a stack trace.
        process.stderr.write(`\n${error.message}\n\n`);
        process.exit(1);
    }

    const app = require('./src/app');
    const database = require('./src/config/database');
    const { runStartupSeed } = require('./src/services/seed');

    await database.connect();
    await runStartupSeed();

    const server = app.listen(config.port, () => {
        logger.info(`TrackIt API listening on port ${config.port}`, {
            env: config.env,
            servingFrontend: config.http.serveFrontend,
        });
    });

    const shutdown = async (signal) => {
        logger.info(`${signal} received — shutting down`);
        // Stop accepting connections, let in-flight requests finish, then close
        // the database. Killing the process outright can truncate a write.
        server.close(async () => {
            try {
                await database.disconnect();
            } finally {
                process.exit(0);
            }
        });

        setTimeout(() => {
            logger.error('Forced shutdown after 10s timeout');
            process.exit(1);
        }, 10000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
        logger.error('Unhandled promise rejection', { reason: String(reason) });
    });

    process.on('uncaughtException', (error) => {
        logger.error('Uncaught exception — exiting', { error: error.message, stack: error.stack });
        process.exit(1);
    });
};

start().catch((error) => {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
});
