const Comment = require('../models/Comment');
const Issue = require('../models/Issue');
const ActivityLog = require('../models/ActivityLog');
const ApiError = require('../utils/ApiError');
const ids = require('../utils/ids');
const asyncHandler = require('../middleware/asyncHandler');
const { findByAnyId, resolveRef } = require('../utils/query');

const PERSON_FIELDS = 'name email role department userId';

const addComment = async (issueOid, message, user) => {
    const comment = await Comment.create({
        commentId: ids.commentId(),
        message: message.trim(),
        issue: issueOid,
        user: user._id,
        createdAt: new Date(),
    });

    await ActivityLog.create({
        action: 'ADD_COMMENT',
        details: `Comment added by ${user.name}`,
        issue: issueOid,
        user: user._id,
    });

    return Comment.findById(comment._id).populate('user', PERSON_FIELDS);
};

const list = asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.issue) {
        filter.issue = await resolveRef(Issue, req.query.issue, 'issueId');
    }

    const comments = await Comment.find(filter)
        .populate('user', PERSON_FIELDS)
        .populate({ path: 'issue', populate: { path: 'project', select: 'title projectId' } })
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        message: 'Comments fetched successfully',
        data: comments,
    });
});

const getOne = asyncHandler(async (req, res) => {
    const comment = await findByAnyId(Comment, req.params.id, 'commentId', [
        { path: 'user', select: PERSON_FIELDS },
        { path: 'issue' },
    ]);

    if (!comment) {
        throw ApiError.notFound('Comment not found');
    }
    res.status(200).json({ success: true, data: comment });
});

const create = asyncHandler(async (req, res) => {
    const { issueId, issue, message } = req.body;

    const issueOid = await resolveRef(Issue, issueId || issue, 'issueId');
    if (!issueOid) {
        throw ApiError.badRequest('Issue not found');
    }

    res.status(201).json({
        success: true,
        message: 'Comment created successfully',
        data: await addComment(issueOid, message, req.user),
    });
});

const createForIssue = asyncHandler(async (req, res) => {
    const issue = await findByAnyId(Issue, req.params.id, 'issueId');
    if (!issue) {
        throw ApiError.notFound('Issue not found');
    }

    const text = (req.body.comment || req.body.message || '').trim();

    res.status(200).json({
        success: true,
        message: 'Comment added successfully',
        data: await addComment(issue._id, text, req.user),
    });
});

const remove = asyncHandler(async (req, res) => {
    const comment = await findByAnyId(Comment, req.params.id, 'commentId');
    if (!comment) {
        throw ApiError.notFound('Comment not found');
    }

    const isAuthor = comment.user?.toString() === req.user._id.toString();
    if (req.user.role !== 'admin' && !isAuthor) {
        throw ApiError.forbidden('You are not authorized to delete this comment');
    }

    await comment.deleteOne();

    await ActivityLog.create({
        action: 'DELETE_COMMENT',
        details: `Comment ${comment.commentId} deleted`,
        user: req.user._id,
    });

    res.status(200).json({ success: true, message: 'Comment deleted successfully' });
});

module.exports = { list, getOne, create, createForIssue, remove };
