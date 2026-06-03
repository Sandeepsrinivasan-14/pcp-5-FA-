const mongoose = require('mongoose');

const driveSchema = new mongoose.Schema({
    driveId: { type: String, required: true, unique: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    title: String,
    mode: { type: String, enum: ['online', 'offline', 'hybrid'] },
    location: String,
    registrationDeadline: Date,
    rounds: [String],
    status: { type: String, enum: ['open', 'closed', 'completed'], default: 'open' }
}, { timestamps: true });

module.exports = mongoose.model('Drive', driveSchema);
