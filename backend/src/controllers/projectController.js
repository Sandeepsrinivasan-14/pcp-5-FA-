const Project = require('../models/Project');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const ApiError = require('../utils/ApiError');
const ids = require('../utils/ids');
const asyncHandler = require('../middleware/asyncHandler');
const { findByAnyId, resolveRef, caseInsensitive } = require('../utils/query');

const OWNER_FIELDS = 'name email role department userId';

const withPeople = [
    { path: 'owner', select: OWNER_FIELDS },
    { path: 'members', select: OWNER_FIELDS },
];

const resolveMembers = async (members = []) => {
    const resolved = await Promise.all(members.map((m) => resolveRef(User, m, 'userId')));
    return resolved.filter(Boolean);
};

const list = asyncHandler(async (req, res) => {
    const filter = {};

    if (req.query.status) {
        filter.status = req.query.status;
    }

    if (req.query.owner) {
        const owner = await resolveRef(User, req.query.owner, 'userId');
        if (owner) {
            filter.owner = owner;
        } else {
            const byName = await User.findOne({ name: caseInsensitive(req.query.owner) });
            if (byName) filter.owner = byName._id;
        }
    }

    const projects = await Project.find(filter)
        .populate('owner', OWNER_FIELDS)
        .populate('members', OWNER_FIELDS)
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        message: 'Projects fetched successfully',
        data: projects,
    });
});

const getOne = asyncHandler(async (req, res) => {
    const project = await findByAnyId(Project, req.params.id, 'projectId', withPeople);
    if (!project) {
        throw ApiError.notFound('Project not found');
    }
    res.status(200).json({ success: true, data: project });
});

const create = asyncHandler(async (req, res) => {
    const { title, name, description, category, status, members } = req.body;
    const projectTitle = (title || name || '').trim();

    const project = await Project.create({
        projectId: ids.projectId(),
        title: projectTitle,
        description: description || 'No description provided',
        category: category || 'General',
        status: status || 'active',
        owner: req.user._id,
        members: await resolveMembers(members),
        startDate: new Date(),
    });

    await ActivityLog.create({
        action: 'CREATE_PROJECT',
        details: `Created project: ${project.title} (${project.projectId})`,
        user: req.user._id,
    });

    res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: project,
    });
});

const update = asyncHandler(async (req, res) => {
    const project = await findByAnyId(Project, req.params.id, 'projectId');
    if (!project) {
        throw ApiError.notFound('Project not found');
    }

    const { members, owner, ...rest } = req.body;

    for (const field of ['title', 'description', 'category', 'status']) {
        if (rest[field] !== undefined) project[field] = rest[field];
    }

    if (members !== undefined) {
        project.members = await resolveMembers(members);
    }

    if (owner !== undefined) {
        const resolved = await resolveRef(User, owner, 'userId');
        if (!resolved) {
            throw ApiError.badRequest('Owner not found');
        }
        project.owner = resolved;
    }

    await project.save();

    await ActivityLog.create({
        action: 'UPDATE_PROJECT',
        details: `Updated project: ${project.title} (${project.projectId})`,
        user: req.user._id,
    });

    res.status(200).json({
        success: true,
        message: 'Project updated successfully',
        data: project,
    });
});

const remove = asyncHandler(async (req, res) => {
    const project = await findByAnyId(Project, req.params.id, 'projectId');
    if (!project) {
        throw ApiError.notFound('Project not found');
    }

    await project.deleteOne();

    await ActivityLog.create({
        action: 'DELETE_PROJECT',
        details: `Deleted project: ${project.title} (${project.projectId})`,
        user: req.user._id,
    });

    res.status(200).json({ success: true, message: 'Project deleted successfully' });
});

module.exports = { list, getOne, create, update, remove };
