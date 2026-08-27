const Issue = require('../models/Issue');
const Project = require('../models/Project');
const ActivityLog = require('../models/ActivityLog');
const asyncHandler = require('../middleware/asyncHandler');

const issues = asyncHandler(async (req, res) => {
    const [totalIssues, openIssues, inProgressIssues, testingIssues, resolvedIssues, closedIssues] =
        await Promise.all([
            Issue.countDocuments(),
            Issue.countDocuments({ status: 'open' }),
            Issue.countDocuments({ status: 'in-progress' }),
            Issue.countDocuments({ status: 'testing' }),
            Issue.countDocuments({ status: 'resolved' }),
            Issue.countDocuments({ status: 'closed' }),
        ]);

    res.status(200).json({
        success: true,
        data: {
            totalIssues,
            openIssues,
            inProgressIssues,
            testingIssues,
            resolvedIssues,
            closedIssues,
        },
    });
});

const projects = asyncHandler(async (req, res) => {
    const [projectWiseIssues, activeProjectsCount, closedProjectsCount] = await Promise.all([
        Issue.aggregate([
            { $group: { _id: '$project', count: { $sum: 1 } } },
            { $lookup: { from: 'projects', localField: '_id', foreignField: '_id', as: 'proj' } },
            { $unwind: '$proj' },
            { $project: { _id: 1, count: 1, title: '$proj.title', projectId: '$proj.projectId' } },
            { $sort: { count: -1 } },
        ]),
        Project.countDocuments({ status: 'active' }),
        Project.countDocuments({ status: { $in: ['completed', 'archived'] } }),
    ]);

    res.status(200).json({
        success: true,
        data: { projectWiseIssues, activeProjectsCount, closedProjectsCount },
    });
});

const developers = asyncHandler(async (req, res) => {
    const [developerResolvedCount, timeStats] = await Promise.all([
        Issue.aggregate([
            { $match: { status: { $in: ['resolved', 'closed'] }, assignedTo: { $ne: null } } },
            { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'usr' } },
            { $unwind: '$usr' },
            { $project: { _id: 1, count: 1, name: '$usr.name', email: '$usr.email' } },
            { $sort: { count: -1 } },
        ]),
        Issue.aggregate([
            { $match: { status: { $in: ['resolved', 'closed'] } } },
            { $project: { duration: { $subtract: ['$updatedAt', '$createdAt'] } } },
            { $group: { _id: null, avgTime: { $avg: '$duration' } } },
        ]),
    ]);

    res.status(200).json({
        success: true,
        data: {
            developerResolvedCount,
            averageResolutionTime: timeStats.length > 0 ? timeStats[0].avgTime : 0,
            highestResolvedDeveloper:
                developerResolvedCount.length > 0 ? developerResolvedCount[0].name : 'N/A',
        },
    });
});

const dashboard = asyncHandler(async (req, res) => {
    const [statusStats, priorityStats, projectStats, developerStats, activityLogs] =
        await Promise.all([
            Issue.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            Issue.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
            Issue.aggregate([
                { $group: { _id: '$project', count: { $sum: 1 } } },
                {
                    $lookup: {
                        from: 'projects',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'projectInfo',
                    },
                },
                { $unwind: '$projectInfo' },
                {
                    $project: {
                        _id: 1,
                        count: 1,
                        title: '$projectInfo.title',
                        projectId: '$projectInfo.projectId',
                    },
                },
            ]),
            Issue.aggregate([
                { $match: { status: { $in: ['resolved', 'closed'] }, assignedTo: { $ne: null } } },
                { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'userInfo',
                    },
                },
                { $unwind: '$userInfo' },
                {
                    $project: {
                        _id: 1,
                        count: 1,
                        name: '$userInfo.name',
                        email: '$userInfo.email',
                        role: '$userInfo.role',
                    },
                },
            ]),
            ActivityLog.find().populate('user', 'name role userId').sort({ timestamp: -1 }).limit(10),
        ]);

    res.status(200).json({
        success: true,
        message: 'Aggregation analytics compiled successfully',
        data: { statusStats, priorityStats, projectStats, developerStats, activityLogs },
    });
});

module.exports = { issues, projects, developers, dashboard };
