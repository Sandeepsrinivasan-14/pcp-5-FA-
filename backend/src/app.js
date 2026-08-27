const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const config = require('./config');
const routes = require('./routes');
const healthRoutes = require('./routes/health');
const logger = require('./utils/logger');
const { apiLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

if (config.http.trustProxy) {
    // Required for correct client IPs behind Railway/Render/nginx, which the
    // rate limiter needs to distinguish callers.
    app.set('trust proxy', 1);
}

app.disable('x-powered-by');

app.use(
    helmet({
        // The SPA build inlines its bootstrap script, so the default CSP would
        // block it. Everything else stays on.
        contentSecurityPolicy: config.http.serveFrontend ? false : undefined,
        crossOriginEmbedderPolicy: false,
    })
);

const allowAllOrigins = config.http.corsOrigins.includes('*');
app.use(
    cors({
        origin: allowAllOrigins
            ? true
            : (origin, callback) => {
                  // Same-origin and non-browser callers (curl, health probes)
                  // send no Origin header at all.
                  if (!origin || config.http.corsOrigins.includes(origin)) {
                      return callback(null, true);
                  }
                  return callback(new Error(`Origin ${origin} is not allowed by CORS`));
              },
        credentials: true,
    })
);

app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

if (!config.isTest) {
    app.use(
        morgan(config.isProduction ? 'combined' : 'dev', {
            stream: { write: (message) => logger.info(message.trim()) },
            skip: (req) => req.path === '/health' || req.path === '/api/health',
        })
    );
}

app.use('/api', apiLimiter);
app.use('/api', routes);

// The original API served everything from the bare root. Keep those paths so
// existing clients keep working — but not when this process also serves the
// SPA, whose browser routes (/issues, /projects, …) would collide.
if (config.http.legacyRootRoutes) {
    app.use(apiLimiter);
    app.use('/', routes);
} else {
    // Platform health probes conventionally hit /health, so keep that one
    // exposed even when the SPA owns the rest of the root namespace.
    app.use('/health', healthRoutes);
}

if (config.http.serveFrontend) {
    const buildPath = config.http.frontendBuildPath;
    const indexHtml = path.join(buildPath, 'index.html');

    if (fs.existsSync(indexHtml)) {
        app.use(
            express.static(buildPath, {
                // Hashed asset filenames are safe to cache hard; index.html
                // must not be, or clients pin to a stale bundle.
                setHeaders: (res, filePath) => {
                    if (filePath.endsWith('index.html')) {
                        res.setHeader('Cache-Control', 'no-cache');
                    } else {
                        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
                    }
                },
            })
        );

        // Client-side routing: any non-API GET falls through to the SPA.
        app.get(/^\/(?!api\/).*/, (req, res, next) => {
            if (req.method !== 'GET') return next();
            return res.sendFile(indexHtml);
        });
    } else {
        logger.warn(
            `SERVE_FRONTEND is enabled but no build was found at ${buildPath}. Run "npm run build" first.`
        );
    }
} else {
    app.get('/', (req, res) => {
        res.json({
            success: true,
            message: 'TrackIt API is running',
            docs: '/api/health',
            version: require('../package.json').version,
        });
    });
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
