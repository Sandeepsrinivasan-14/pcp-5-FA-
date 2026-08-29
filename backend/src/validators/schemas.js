const { z } = require('zod');

const ROLES = ['admin', 'manager', 'developer', 'tester'];
const ISSUE_STATUSES = ['open', 'in-progress', 'testing', 'resolved', 'closed'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const SEVERITIES = ['minor', 'major', 'critical'];
const PROJECT_STATUSES = ['active', 'completed', 'on-hold', 'archived'];

const trimmed = (max) => z.string().trim().min(1).max(max);
const optionalRef = z.union([z.string().trim(), z.null()]).optional();

const registerSchema = z.object({
    name: trimmed(120),
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    // Optional: honoured only when an administrator makes the request.
    // A self-registering caller always receives the configured default role.
    role: z
        .enum(ROLES, {
            message: 'Invalid role. Allowed roles: admin, manager, developer, tester',
        })
        .optional(),
    department: z.string().trim().max(120).optional(),
});

const loginSchema = z.object({
    email: z.string().trim().toLowerCase().min(1, 'Email and password required'),
    password: z.string().min(1, 'Email and password required'),
});

const createProjectSchema = z
    .object({
        title: z.string().trim().max(200).optional(),
        name: z.string().trim().max(200).optional(),
        description: z.string().trim().max(5000).optional(),
        category: z.string().trim().max(120).optional(),
        status: z.enum(PROJECT_STATUSES).optional(),
        members: z.array(z.string().trim()).optional(),
    })
    .refine((data) => Boolean(data.title || data.name), {
        message: 'Project title is required',
        path: ['title'],
    });

const updateProjectSchema = z.object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    category: z.string().trim().max(120).optional(),
    status: z.enum(PROJECT_STATUSES).optional(),
    owner: z.string().trim().optional(),
    members: z.array(z.string().trim()).optional(),
});

const createIssueSchema = z.object({
    title: trimmed(200),
    description: z.string().trim().max(10000).optional(),
    project: trimmed(200),
    assignedTo: optionalRef,
    priority: z.enum(PRIORITIES).optional(),
    severity: z.enum(SEVERITIES).optional(),
    dueDate: z.union([z.string().trim(), z.null()]).optional(),
});

const updateIssueSchema = z.object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(10000).optional(),
    priority: z.enum(PRIORITIES).optional(),
    severity: z.enum(SEVERITIES).optional(),
    status: z.enum(ISSUE_STATUSES, { message: 'Invalid status value' }).optional(),
    assignedTo: optionalRef,
    project: z.string().trim().optional(),
    dueDate: z.union([z.string().trim(), z.null()]).optional(),
});

const assignIssueSchema = z.object({
    assignedTo: optionalRef,
});

const updateStatusSchema = z.object({
    status: z.enum(ISSUE_STATUSES, { message: 'Invalid status value' }),
});

const createCommentSchema = z
    .object({
        issueId: z.string().trim().optional(),
        issue: z.string().trim().optional(),
        message: trimmed(5000),
    })
    .refine((data) => Boolean(data.issueId || data.issue), {
        message: 'Issue and message are required',
        path: ['issueId'],
    });

const issueCommentSchema = z
    .object({
        comment: z.string().trim().max(5000).optional(),
        message: z.string().trim().max(5000).optional(),
    })
    .refine((data) => Boolean((data.comment || data.message || '').trim()), {
        message: 'Comment message is required',
        path: ['message'],
    });

const syncSchema = z.object({
    set: z.string().trim().optional(),
});

module.exports = {
    ROLES,
    ISSUE_STATUSES,
    PRIORITIES,
    SEVERITIES,
    PROJECT_STATUSES,
    registerSchema,
    loginSchema,
    createProjectSchema,
    updateProjectSchema,
    createIssueSchema,
    updateIssueSchema,
    assignIssueSchema,
    updateStatusSchema,
    createCommentSchema,
    issueCommentSchema,
    syncSchema,
};
