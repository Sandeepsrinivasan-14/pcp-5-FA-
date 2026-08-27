const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
    {
        commentId: { type: String, required: true, unique: true, trim: true },
        message: { type: String, required: true, trim: true, maxlength: 5000 },
        issue: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
    },
    // createdAt is declared explicitly above so the dataset sync can preserve
    // historical timestamps; let Mongoose manage only updatedAt.
    { timestamps: { createdAt: false, updatedAt: true } }
);

commentSchema.index({ issue: 1, createdAt: 1 });
commentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);
