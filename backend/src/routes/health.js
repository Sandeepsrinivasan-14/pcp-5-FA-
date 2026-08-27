const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

router.get('/', async (req, res) => {
    const connected = mongoose.connection.readyState === 1;

    // Only query when the connection is up; otherwise Mongoose buffers the
    // command and the health check hangs until the buffer times out.
    let documentCount = 0;
    if (connected) {
        documentCount = await mongoose.connection.db
            .collection('issues')
            .countDocuments()
            .catch(() => 0);
    }

    res.status(connected ? 200 : 503).json({
        success: connected,
        status: connected ? 'ok' : 'degraded',
        database: connected ? 'connected' : 'disconnected',
        documentCount,
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
    });
});

module.exports = router;
