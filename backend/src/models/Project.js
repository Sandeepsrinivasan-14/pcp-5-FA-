const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
    {
        projectId: { type: String, required: true, unique: true, trim: true },
        title: { type: String, required: true, trim: true, maxlength: 200 },
        description: { type: String, default: 'No description provided', maxlength: 5000 },
        category: { type: String, default: 'General', trim: true },
        status: {
            type: String,
            enum: ['active', 'completed', 'on-hold', 'archived'],
            default: 'active',
        },
        owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        startDate: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

projectSchema.index({ status: 1 });
projectSchema.index({ owner: 1 });

module.exports = mongoose.model('Project', projectSchema);
