const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    projectId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: 'No description provided' },
    category: { type: String, default: 'General' },
    status: { type: String, enum: ['active', 'completed', 'on-hold', 'archived'], default: 'active' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    startDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
