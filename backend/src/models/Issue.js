const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
    issueId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: 'No description provided' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    severity: { type: String, enum: ['minor', 'major', 'critical'], default: 'minor' },
    status: { type: String, enum: ['open', 'in-progress', 'testing', 'resolved', 'closed'], default: 'open' },
    dueDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Issue', issueSchema);
