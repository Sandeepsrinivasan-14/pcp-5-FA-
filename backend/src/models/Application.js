const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    applicationId: { type: String, required: true, unique: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    drive: { type: mongoose.Schema.Types.ObjectId, ref: 'Drive', required: true },
    currentRound: String,
    status: { type: String, enum: ['applied', 'shortlisted', 'selected', 'rejected'], default: 'applied' },
    appliedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Application', applicationSchema);
