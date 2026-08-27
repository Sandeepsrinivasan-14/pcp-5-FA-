const crypto = require('crypto');

/**
 * Human-readable identifiers (PRJ-…, ISS-…, COM-…, usr-…).
 *
 * The original implementation used `Date.now()` alone, which collides whenever
 * two documents are created inside the same millisecond — quite reachable
 * during the bulk dataset sync. The random suffix removes that.
 */
const generateId = (prefix) => `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

module.exports = {
    projectId: () => generateId('PRJ'),
    issueId: () => generateId('ISS'),
    commentId: () => generateId('COM'),
    userId: () => generateId('usr'),
};
