const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    action: { type: String, required: true },
    previousStatus: { type: String },
    newStatus: { type: String },
    timestamp: { type: Date, default: Date.now },
    issue: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
