const Issue = require('../models/Issue');
const Project = require('../models/Project');
const User = require('../models/User');
const Comment = require('../models/Comment');
const ActivityLog = require('../models/ActivityLog');
const ApiError = require('../utils/ApiError');
const ids = require('../utils/ids');
const asyncHandler = require('../middleware/asyncHandler');
const { findByAnyId, resolveRef, caseInsensitive, paginate } = require('../utils/query');

const PERSON_FIELDS = 'name email role department userId';

const populated = (id) =>
    Issue.findById(id)
        .populate('project')
        .populate('assignedTo', PERSON_FIELDS)
        .populate('reportedBy', PERSON_FIELDS);

const isAssignee = (issue, user) => issue.assignedTo?.toString() === user._id.toString();

/**
 * Workflow rules shared by PATCH /issues/:id and PATCH /issues/:id/status.
 * Throws when the transition is not permitted for this user.
 */
const assertStatusTransition = (issue, nextStatus, user) => {
    if (issue.status === 'closed' && nextStatus !== 'open') {
        throw ApiError.badRequest(
            "Closed issues cannot move back without reopen. Move to 'open' status first."
        );
    }

    if (user.role === 'tester' && ['closed', 'resolved'].includes(nextStatus)) {
        throw ApiError.forbidden('Testers cannot close or resolve issues directly.');
    }

    if (nextStatus === 'testing') {
        if (user.role === 'tester' || (user.role === 'developer' && !isAssignee(issue, user))) {
            throw ApiError.forbidden('Only the assigned developer can move an issue to testing.');
        }
    }
};

const assertNoDuplicateTitle = async (title, projectId, excludeId) => {
    const duplicate = await Issue.findOne({
        title: title.trim(),
        project: projectId,
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });
    if (duplicate) {
        throw ApiError.badRequest('An issue with this title already exists in this project.');
    }
};

const list = asyncHandler(async (req, res) => {
    const filter = {};

    if (req.query.project) {
        const project = await resolveRef(Project, req.query.project, 'projectId');
        // An unmatched project filter must return nothing, not everything.
        filter.project = project || null;
    }
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.severity) filter.severity = req.query.severity;
    if (req.query.assignedTo) {
        filter.assignedTo = await resolveRef(User, req.query.assignedTo, 'userId');
    }

    if (req.query.search) {
        const regex = caseInsensitive(req.query.search);
        filter.$or = [{ title: regex }, { description: regex }];
    }

    const { page, limit, skip } = paginate(req.query);

    const [total, issues] = await Promise.all([
        Issue.countDocuments(filter),
        Issue.find(filter)
            .populate('project')
            .populate('assignedTo', PERSON_FIELDS)
            .populate('reportedBy', PERSON_FIELDS)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 }),
    ]);

    res.status(200).json({
        success: true,
        message: 'Issues fetched successfully',
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        data: issues,
    });
});

const getOne = asyncHandler(async (req, res) => {
    const issue = await findByAnyId(Issue, req.params.id, 'issueId', [
        { path: 'project' },
        { path: 'assignedTo', select: PERSON_FIELDS },
        { path: 'reportedBy', select: PERSON_FIELDS },
    ]);

    if (!issue) {
        throw ApiError.notFound('Issue not found');
    }

    const comments = await Comment.find({ issue: issue._id })
        .populate('user', PERSON_FIELDS)
        .sort({ createdAt: 1 });

    res.status(200).json({
        success: true,
        data: { ...issue.toObject(), comments },
    });
});

const create = asyncHandler(async (req, res) => {
    const { title, description, priority, severity, project, assignedTo, dueDate } = req.body;

    const projectOid = await resolveRef(Project, project, 'projectId');
    if (!projectOid) {
        throw ApiError.badRequest('Project not found');
    }

    await assertNoDuplicateTitle(title, projectOid);

    const issue = await Issue.create({
        issueId: ids.issueId(),
        title: title.trim(),
        description: description || 'No description provided',
        project: projectOid,
        assignedTo: assignedTo ? await resolveRef(User, assignedTo, 'userId') : null,
        reportedBy: req.user._id,
        priority: priority || 'medium',
        severity: severity || 'minor',
        status: 'open',
        dueDate: dueDate || null,
    });

    await ActivityLog.create({
        action: 'CREATE_ISSUE',
        details: `Created issue: ${issue.title} (${issue.issueId})`,
        issue: issue._id,
        user: req.user._id,
    });

    res.status(201).json({
        success: true,
        message: 'Issue created successfully',
        data: await populated(issue._id),
    });
});

const update = asyncHandler(async (req, res) => {
    const issue = await findByAnyId(Issue, req.params.id, 'issueId');
    if (!issue) {
        throw ApiError.notFound('Issue not found');
    }

    if (issue.status === 'resolved' && req.body.status !== 'open' && Object.keys(req.body).length > 1) {
        throw ApiError.badRequest(
            'Resolved issues cannot be edited directly. Reopen the issue to make changes.'
        );
    }

    if (
        issue.status === 'closed' &&
        req.body.assignedTo !== undefined &&
        req.body.assignedTo !== (issue.assignedTo?.toString() || null) &&
        req.body.status !== 'open'
    ) {
        throw ApiError.badRequest('Closed issues cannot be reassigned without reopening.');
    }

    if (req.body.status) {
        assertStatusTransition(issue, req.body.status, req.user);
    }

    if (req.body.title) {
        await assertNoDuplicateTitle(req.body.title, issue.project, issue._id);
    }

    if (req.user.role === 'developer' && !isAssignee(issue, req.user)) {
        throw ApiError.forbidden('Developers can only update issues assigned to them');
    }

    if (req.user.role === 'tester') {
        throw ApiError.forbidden('Testers can only add comments, not update issues');
    }

    if (req.body.assignedTo !== undefined) {
        req.body.assignedTo = req.body.assignedTo
            ? await resolveRef(User, req.body.assignedTo, 'userId')
            : null;
    }

    if (req.body.project !== undefined) {
        const projectOid = await resolveRef(Project, req.body.project, 'projectId');
        if (!projectOid) {
            throw ApiError.badRequest('Project not found');
        }
        req.body.project = projectOid;
    }

    const oldStatus = issue.status;

    for (const field of ['title', 'description', 'priority', 'severity', 'status', 'assignedTo', 'dueDate', 'project']) {
        if (req.body[field] !== undefined) issue[field] = req.body[field];
    }

    await issue.save();

    const statusChanged = req.body.status && req.body.status !== oldStatus;
    await ActivityLog.create({
        action: statusChanged ? 'UPDATE_STATUS' : 'UPDATE_ISSUE',
        details: statusChanged
            ? `Issue ${issue.issueId}: ${oldStatus} → ${issue.status}`
            : `Updated issue: ${issue.title} (${issue.issueId})`,
        ...(statusChanged ? { previousStatus: oldStatus, newStatus: issue.status } : {}),
        issue: issue._id,
        user: req.user._id,
    });

    res.status(200).json({
        success: true,
        message: 'Issue updated successfully',
        data: await populated(issue._id),
    });
});

const assign = asyncHandler(async (req, res) => {
    const issue = await findByAnyId(Issue, req.params.id, 'issueId');
    if (!issue) {
        throw ApiError.notFound('Issue not found');
    }

    if (issue.status === 'closed') {
        throw ApiError.badRequest('Closed issues cannot be assigned. Reopen the issue first.');
    }

    const { assignedTo } = req.body;
    let assignedToOid = null;

    if (assignedTo) {
        assignedToOid = await resolveRef(User, assignedTo, 'userId');
        if (!assignedToOid) {
            throw ApiError.badRequest('User not found');
        }
    }

    issue.assignedTo = assignedToOid;
    await issue.save();

    await ActivityLog.create({
        action: 'ASSIGN_ISSUE',
        details: `Issue ${issue.issueId} assignment updated`,
        issue: issue._id,
        user: req.user._id,
    });

    res.status(200).json({
        success: true,
        message: 'Issue assigned successfully',
        data: await populated(issue._id),
    });
});

const updateStatus = asyncHandler(async (req, res) => {
    const issue = await findByAnyId(Issue, req.params.id, 'issueId');
    if (!issue) {
        throw ApiError.notFound('Issue not found');
    }

    const { status } = req.body;

    assertStatusTransition(issue, status, req.user);

    if (req.user.role === 'developer' && !isAssignee(issue, req.user)) {
        throw ApiError.forbidden('Developers can only update status of issues assigned to them.');
    }

    const oldStatus = issue.status;
    issue.status = status;
    await issue.save();

    await ActivityLog.create({
        action: 'UPDATE_STATUS',
        details: `Issue ${issue.issueId}: ${oldStatus} → ${status}`,
        previousStatus: oldStatus,
        newStatus: status,
        issue: issue._id,
        user: req.user._id,
    });

    res.status(200).json({
        success: true,
        message: 'Issue status updated successfully',
        data: await populated(issue._id),
    });
});

const remove = asyncHandler(async (req, res) => {
    const issue = await findByAnyId(Issue, req.params.id, 'issueId');
    if (!issue) {
        throw ApiError.notFound('Issue not found');
    }

    // Comments belong to the issue; leaving them behind orphans them forever.
    await Comment.deleteMany({ issue: issue._id });
    await issue.deleteOne();

    await ActivityLog.create({
        action: 'DELETE_ISSUE',
        details: `Deleted issue: ${issue.title} (${issue.issueId})`,
        user: req.user._id,
    });

    res.status(200).json({ success: true, message: 'Issue deleted successfully' });
});

module.exports = { list, getOne, create, update, assign, updateStatus, remove };
