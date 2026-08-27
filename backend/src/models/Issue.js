const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema(
    {
        issueId: { type: String, required: true, unique: true, trim: true },
        title: { type: String, required: true, trim: true, maxlength: 200 },
        description: { type: String, default: 'No description provided', maxlength: 10000 },
        project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium',
        },
        severity: { type: String, enum: ['minor', 'major', 'critical'], default: 'minor' },
        status: {
            type: String,
            enum: ['open', 'in-progress', 'testing', 'resolved', 'closed'],
            default: 'open',
        },
        dueDate: { type: Date, default: null },
    },
    { timestamps: true }
);

// The API rejects duplicate titles within a project; enforce it in the database
// too so a race between two concurrent creates cannot slip past the check.
issueSchema.index({ project: 1, title: 1 }, { unique: true });
issueSchema.index({ status: 1 });
issueSchema.index({ assignedTo: 1 });
issueSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Issue', issueSchema);
