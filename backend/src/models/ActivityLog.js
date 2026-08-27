const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    action: { type: String, required: true },
    // Callers have always written `details`; without it declared here Mongoose
    // dropped the field on every insert.
    details: { type: String },
    previousStatus: { type: String },
    newStatus: { type: String },
    timestamp: { type: Date, default: Date.now },
    issue: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

activityLogSchema.index({ timestamp: -1 });
activityLogSchema.index({ issue: 1, timestamp: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
