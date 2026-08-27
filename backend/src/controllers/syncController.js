const crypto = require('crypto');
const axios = require('axios');
const config = require('../config');
const User = require('../models/User');
const Project = require('../models/Project');
const Issue = require('../models/Issue');
const Comment = require('../models/Comment');
const ActivityLog = require('../models/ActivityLog');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const asyncHandler = require('../middleware/asyncHandler');

const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const SEVERITIES = ['minor', 'major', 'critical'];
const STATUSES = ['open', 'in-progress', 'testing', 'resolved', 'closed'];

const normalise = (value, allowed, fallback) => {
    if (!value) return fallback;
    const clean = String(value).trim().toLowerCase();
    if (clean === 'done') return 'closed';
    return allowed.includes(clean) ? clean : fallback;
};

const str = (value, fallback = '') => (value ? String(value).trim() : fallback);

/**
 * Pulls the coursework dataset from the external API and upserts it.
 *
 * Credentials come from the environment only — the previous version shipped a
 * real student id and password as inline defaults.
 */
const syncDataset = asyncHandler(async (req, res) => {
    if (!config.dataset.enabled) {
        throw ApiError.badRequest(
            'Dataset sync is not configured. Set DATASET_API_URL, DATASET_STUDENT_ID and DATASET_PASSWORD.'
        );
    }

    const { apiUrl, studentId, password } = config.dataset;
    const set = req.body?.set || config.dataset.set;

    logger.info('Syncing dataset from external API', { set });

    let tokenResponse;
    try {
        tokenResponse = await axios.post(
            `${apiUrl}/public/token`,
            { studentId, set, password },
            { timeout: 30000 }
        );
    } catch (error) {
        throw ApiError.badRequest(
            error.response?.data?.message || `Dataset API token request failed: ${error.message}`
        );
    }

    if (!tokenResponse.data?.token) {
        throw ApiError.badRequest('Failed to obtain token from dataset API');
    }

    const { token, dataUrl } = tokenResponse.data;
    const fetchUrl = dataUrl
        ? dataUrl.startsWith('http')
            ? dataUrl
            : `${apiUrl}${dataUrl}`
        : `${apiUrl}/data`;

    let dataResponse;
    try {
        dataResponse = await axios.get(fetchUrl, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 30000,
        });
    } catch (error) {
        throw ApiError.badRequest(
            error.response?.data?.message || `Dataset fetch failed: ${error.message}`
        );
    }

    const dataset = dataResponse.data?.data || dataResponse.data;
    if (!dataset) {
        throw ApiError.badRequest('No data received from dataset API');
    }

    const usersList = dataset.users || [];
    const projectsList = dataset.projects || [];
    const issuesList = dataset.issues || [];
    const commentsList = dataset.comments || [];
    const totalFetched =
        usersList.length + projectsList.length + issuesList.length + commentsList.length;

    let inserted = 0;
    let duplicates = 0;
    let rejected = 0;

    const userMap = new Map();
    const projectMap = new Map();
    const issueMap = new Map();

    (await User.find({}, 'userId')).forEach((u) => userMap.set(u.userId, u._id));
    (await Project.find({}, 'projectId')).forEach((p) => projectMap.set(p.projectId, p._id));
    (await Issue.find({}, 'issueId')).forEach((i) => issueMap.set(i.issueId, i._id));

    for (const userData of usersList) {
        try {
            if (!userData.email || !userData.name || !userData.userId) {
                rejected += 1;
                continue;
            }

            const clean = {
                userId: str(userData.userId),
                name: str(userData.name),
                email: str(userData.email).toLowerCase(),
                role: normalise(userData.role, ['admin', 'manager', 'developer', 'tester'], 'developer'),
                department: str(userData.department, 'General'),
                status: normalise(userData.status, ['active', 'inactive'], 'active'),
            };

            const existing = await User.findOne({
                $or: [{ email: clean.email }, { userId: clean.userId }],
            });

            if (existing) {
                Object.assign(existing, {
                    name: clean.name,
                    role: clean.role,
                    department: clean.department,
                    status: clean.status,
                });
                await existing.save();
                userMap.set(clean.userId, existing._id);
                duplicates += 1;
            } else {
                // Imported accounts get an unguessable password. They cannot be
                // logged into until an administrator resets them — far safer
                // than the shared literal the previous version used.
                const created = await User.create({
                    ...clean,
                    password: crypto.randomBytes(24).toString('base64url'),
                });
                userMap.set(clean.userId, created._id);
                inserted += 1;
            }
        } catch (error) {
            logger.warn('Sync: user rejected', { error: error.message });
            rejected += 1;
        }
    }

    const firstAdmin = await User.findOne({ role: 'admin' }).select('_id');

    for (const projData of projectsList) {
        try {
            if (!projData.title || !projData.projectId) {
                rejected += 1;
                continue;
            }

            const clean = {
                projectId: str(projData.projectId),
                title: str(projData.title),
                status: normalise(
                    projData.status,
                    ['active', 'completed', 'on-hold', 'archived'],
                    'active'
                ),
                description: str(projData.description, 'No description provided'),
                category: str(projData.category, 'General'),
                startDate: projData.startDate ? new Date(projData.startDate) : new Date(),
            };

            const existing = await Project.findOne({ projectId: clean.projectId });
            if (existing) {
                Object.assign(existing, clean);
                await existing.save();
                projectMap.set(clean.projectId, existing._id);
                duplicates += 1;
            } else {
                const created = await Project.create({
                    ...clean,
                    owner: firstAdmin ? firstAdmin._id : null,
                });
                projectMap.set(clean.projectId, created._id);
                inserted += 1;
            }
        } catch (error) {
            logger.warn('Sync: project rejected', { error: error.message });
            rejected += 1;
        }
    }

    for (const issueData of issuesList) {
        try {
            if (!issueData.title || !issueData.issueId || !issueData.projectId) {
                rejected += 1;
                continue;
            }

            const projectOid = projectMap.get(issueData.projectId);
            if (!projectOid) {
                rejected += 1;
                continue;
            }

            const clean = {
                issueId: str(issueData.issueId),
                title: str(issueData.title),
                description: str(issueData.description, 'No description provided'),
                project: projectOid,
                assignedTo: userMap.get(issueData.assignedTo) || null,
                reportedBy: userMap.get(issueData.reportedBy) || null,
                priority: normalise(issueData.priority, PRIORITIES, 'medium'),
                severity: normalise(issueData.severity, SEVERITIES, 'minor'),
                status: normalise(issueData.status, STATUSES, 'open'),
            };

            const existing = await Issue.findOne({ issueId: clean.issueId });
            if (existing) {
                Object.assign(existing, clean);
                await existing.save();
                issueMap.set(clean.issueId, existing._id);
                duplicates += 1;
            } else {
                const created = await Issue.create(clean);
                issueMap.set(clean.issueId, created._id);
                inserted += 1;
            }
        } catch (error) {
            logger.warn('Sync: issue rejected', { error: error.message });
            rejected += 1;
        }
    }

    for (const commentData of commentsList) {
        try {
            if (!commentData.message || !commentData.commentId || !commentData.issueId) {
                rejected += 1;
                continue;
            }

            const issueOid = issueMap.get(commentData.issueId);
            if (!issueOid) {
                rejected += 1;
                continue;
            }

            const clean = {
                commentId: str(commentData.commentId),
                message: str(commentData.message),
                issue: issueOid,
                user: userMap.get(commentData.userId) || null,
                createdAt: commentData.createdAt ? new Date(commentData.createdAt) : new Date(),
            };

            const existing = await Comment.findOne({ commentId: clean.commentId });
            if (existing) {
                Object.assign(existing, clean);
                await existing.save();
                duplicates += 1;
            } else {
                await Comment.create(clean);
                inserted += 1;
            }
        } catch (error) {
            logger.warn('Sync: comment rejected', { error: error.message });
            rejected += 1;
        }
    }

    const actor = req.user || firstAdmin || (await User.findOne().select('_id'));
    if (actor) {
        await ActivityLog.create({
            action: 'SYNC_DATASET',
            details: `Dataset synchronized from external API. Fetched ${totalFetched} items (inserted: ${inserted}, updated: ${duplicates}, rejected: ${rejected}).`,
            user: actor._id,
        });
    }

    logger.info('Dataset sync complete', { totalFetched, inserted, duplicates, rejected });

    res.status(200).json({
        success: true,
        message: 'Dataset synchronized successfully',
        data: { totalFetched, inserted, duplicates, rejected },
    });
});

module.exports = { syncDataset };
