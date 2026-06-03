const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Project = require('./models/Project');
const Issue = require('./models/Issue');
const Comment = require('./models/Comment');
const ActivityLog = require('./models/ActivityLog');
const syncRoutes = require('./routes/sync');

const app = express();
app.use(cors());
app.use(express.json());

const initUsers = async () => {
    const defaultUsers = [
        { name: "Admin User", email: "admin@test.com", password: "admin123", role: "admin", userId: "usr-admin" },
        { name: "Manager User", email: "manager@test.com", password: "manager123", role: "manager", userId: "usr-manager" },
        { name: "Developer User", email: "developer@test.com", password: "dev123", role: "developer", userId: "usr-developer" },
        { name: "Tester User", email: "tester@test.com", password: "tester123", role: "tester", userId: "usr-tester" }
    ];
    
    for (const user of defaultUsers) {
        const existing = await User.findOne({ email: user.email });
        if (!existing) {
            await User.create(user);
        }
    }
};

const authMiddleware = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: `Access denied. ${req.user.role} cannot perform this action` 
            });
        }
        next();
    };
};

app.post('/auth/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        
        if (!name || !email || !password || !role) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields: name, email, password, role' 
            });
        }
        
        const validRoles = ['admin', 'manager', 'developer', 'tester'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid role. Allowed roles: admin, manager, developer, tester' 
            });
        }
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ 
                success: false, 
                message: 'Email already registered' 
            });
        }
        
        const userId = 'usr-' + Date.now();
        const user = await User.create({
            userId,
            name,
            email,
            password,
            role
        });

        await ActivityLog.create({
            action: 'REGISTER_USER',
            details: `New user registered: ${user.name} (${user.role})`,
            user: user._id
        });
        
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                _id: user._id,
                userId: user.userId,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt
            }
        });
        
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password required' 
            });
        }
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }
        
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }
        
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        await ActivityLog.create({
            action: 'LOGIN_USER',
            details: `User logged in: ${user.name}`,
            user: user._id
        });
        
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                _id: user._id,
                userId: user.userId,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
        
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/auth/me', authMiddleware, async (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Authenticated user fetched successfully',
        data: {
            _id: req.user._id,
            userId: req.user.userId,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
            createdAt: req.user.createdAt
        }
    });
});

app.get('/projects', authMiddleware, async (req, res) => {
    try {
        const filter = {};
        if (req.query.status) {
            filter.status = req.query.status;
        }
        if (req.query.owner) {
            if (mongoose.Types.ObjectId.isValid(req.query.owner)) {
                filter.owner = req.query.owner;
            } else {
                const u = await User.findOne({ name: new RegExp(req.query.owner, 'i') });
                if (u) filter.owner = u._id;
            }
        }
        const projectsList = await Project.find(filter)
            .populate('owner', 'name email role department')
            .populate('members', 'name email role department');
        res.status(200).json({ success: true, message: 'Projects fetched successfully', data: projectsList });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/projects/:id', authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        let project = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            project = await Project.findById(id)
                .populate('owner', 'name email role department')
                .populate('members', 'name email role department');
        } else {
            project = await Project.findOne({ projectId: id })
                .populate('owner', 'name email role department')
                .populate('members', 'name email role department');
        }

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        res.status(200).json({ success: true, data: project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/projects', authMiddleware, authorize('admin', 'manager'), async (req, res) => {
    try {
        const { title, name, description, category, status, members } = req.body;
        const projectTitle = (title || name || '').trim();
        if (!projectTitle) {
            return res.status(400).json({ success: false, message: 'Project title is required' });
        }

        let membersOids = [];
        if (members && Array.isArray(members)) {
            for (const m of members) {
                if (mongoose.Types.ObjectId.isValid(m)) {
                    membersOids.push(m);
                } else {
                    const u = await User.findOne({ userId: m });
                    if (u) membersOids.push(u._id);
                }
            }
        }

        const projectId = 'PRJ-' + Date.now();
        const project = await Project.create({
            projectId,
            title: projectTitle,
            description: description || 'No description provided',
            category: category || 'General',
            status: status || 'active',
            owner: req.user._id,
            members: membersOids,
            startDate: new Date()
        });

        await ActivityLog.create({
            action: 'CREATE_PROJECT',
            details: `Created project: ${project.title} (${project.projectId})`,
            user: req.user._id
        });
        
        res.status(201).json({ success: true, message: 'Project created successfully', data: project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.patch('/projects/:id', authMiddleware, authorize('admin', 'manager'), async (req, res) => {
    try {
        const id = req.params.id;
        let project = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            project = await Project.findById(id);
        } else {
            project = await Project.findOne({ projectId: id });
        }

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const allowedUpdates = ['title', 'description', 'category', 'status', 'owner', 'members'];
        for (const field of allowedUpdates) {
            if (req.body[field] !== undefined) {
                if (field === 'members' && Array.isArray(req.body.members)) {
                    let membersOids = [];
                    for (const m of req.body.members) {
                        if (mongoose.Types.ObjectId.isValid(m)) {
                            membersOids.push(m);
                        } else {
                            const u = await User.findOne({ userId: m });
                            if (u) membersOids.push(u._id);
                        }
                    }
                    project.members = membersOids;
                } else if (field === 'owner' && req.body.owner) {
                    if (mongoose.Types.ObjectId.isValid(req.body.owner)) {
                        project.owner = req.body.owner;
                    } else {
                        const u = await User.findOne({ userId: req.body.owner });
                        if (u) project.owner = u._id;
                    }
                } else {
                    project[field] = req.body[field];
                }
            }
        }

        await project.save();
        res.status(200).json({ success: true, message: 'Project updated successfully', data: project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/projects/:id', authMiddleware, authorize('admin', 'manager'), async (req, res) => {
    try {
        const id = req.params.id;
        let project = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            project = await Project.findByIdAndDelete(id);
        } else {
            project = await Project.findOneAndDelete({ projectId: id });
        }

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        res.status(200).json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/users', authMiddleware, async (req, res) => {
    try {
        const usersList = await User.find({}, 'name email role department status userId');
        res.status(200).json({ success: true, message: 'Users fetched successfully', data: usersList });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/users/:id', authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        let user = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            user = await User.findById(id).select('-password');
        } else {
            user = await User.findOne({ userId: id }).select('-password');
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/issues', authMiddleware, async (req, res) => {
    try {
        const filter = {};
        if (req.query.project) {
            if (mongoose.Types.ObjectId.isValid(req.query.project)) {
                filter.project = req.query.project;
            } else {
                const p = await Project.findOne({ projectId: req.query.project });
                if (p) filter.project = p._id;
            }
        }
        if (req.query.status) filter.status = req.query.status;
        if (req.query.priority) filter.priority = req.query.priority;
        if (req.query.severity) filter.severity = req.query.severity;

        if (req.query.search) {
            const regex = new RegExp(req.query.search, 'i');
            filter.$or = [
                { title: regex },
                { description: regex }
            ];
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const skip = (page - 1) * limit;

        const total = await Issue.countDocuments(filter);
        const issuesList = await Issue.find(filter)
            .populate('project')
            .populate('assignedTo', 'name email role department userId')
            .populate('reportedBy', 'name email role department userId')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
            
        res.status(200).json({ 
            success: true, 
            message: 'Issues fetched successfully', 
            total,
            page,
            limit,
            data: issuesList 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/issues/:id', authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        let issue = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            issue = await Issue.findById(id)
                .populate('project')
                .populate('assignedTo', 'name email role department userId')
                .populate('reportedBy', 'name email role department userId');
        } else {
            issue = await Issue.findOne({ issueId: id })
                .populate('project')
                .populate('assignedTo', 'name email role department userId')
                .populate('reportedBy', 'name email role department userId');
        }

        if (!issue) {
            return res.status(404).json({ success: false, message: 'Issue not found' });
        }

        const comments = await Comment.find({ issue: issue._id })
            .populate('user', 'name email role department userId')
            .sort({ createdAt: 1 });

        res.status(200).json({
            success: true,
            data: {
                ...issue.toObject(),
                comments
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/issues', authMiddleware, authorize('admin', 'manager'), async (req, res) => {
    try {
        const { title, description, priority, severity, project, assignedTo, dueDate } = req.body;
        if (!title || !project) {
            return res.status(400).json({ success: false, message: 'Title and project are required' });
        }

        let projectOid = project;
        if (!mongoose.Types.ObjectId.isValid(project)) {
            const p = await Project.findOne({ projectId: project });
            if (!p) return res.status(400).json({ success: false, message: 'Project not found' });
            projectOid = p._id;
        }

        const duplicate = await Issue.findOne({ title: title.trim(), project: projectOid });
        if (duplicate) {
            return res.status(400).json({ success: false, message: 'An issue with this title already exists in this project.' });
        }

        let assignedToOid = null;
        if (assignedTo) {
            if (mongoose.Types.ObjectId.isValid(assignedTo)) {
                assignedToOid = assignedTo;
            } else {
                const u = await User.findOne({ userId: assignedTo });
                if (u) assignedToOid = u._id;
            }
        }

        const issueId = 'ISS-' + Date.now();
        const issue = await Issue.create({
            issueId,
            title: title.trim(),
            description: description || 'No description provided',
            project: projectOid,
            assignedTo: assignedToOid,
            reportedBy: req.user._id,
            priority: priority || 'medium',
            severity: severity || 'minor',
            status: 'open',
            dueDate: dueDate || null
        });

        await ActivityLog.create({
            action: 'CREATE_ISSUE',
            issue: issue._id,
            user: req.user._id
        });

        const populatedIssue = await Issue.findById(issue._id)
            .populate('project')
            .populate('assignedTo', 'name email role department userId')
            .populate('reportedBy', 'name email role department userId');

        res.status(201).json({ success: true, message: 'Issue created successfully', data: populatedIssue });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.patch('/issues/:id', authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        let issue = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            issue = await Issue.findById(id);
        } else {
            issue = await Issue.findOne({ issueId: id });
        }

        if (!issue) {
            return res.status(404).json({ success: false, message: 'Issue not found' });
        }

        if (issue.status === 'resolved' && req.body.status !== 'open' && Object.keys(req.body).length > 1) {
            return res.status(400).json({
                success: false,
                message: "Resolved issues cannot be edited directly. Reopen the issue to make changes."
            });
        }

        if (issue.status === 'closed' && req.body.assignedTo !== undefined && req.body.assignedTo !== (issue.assignedTo?.toString() || null)) {
            if (req.body.status !== 'open') {
                return res.status(400).json({ 
                    success: false, 
                    message: "Closed issues cannot be reassigned without reopening." 
                });
            }
        }

        if (req.user.role === 'tester' && req.body.status && ['closed', 'resolved'].includes(req.body.status)) {
            return res.status(403).json({ 
                success: false, 
                message: "Testers cannot close or resolve issues directly." 
            });
        }

        if (req.body.status === 'testing') {
            if (req.user.role === 'developer' && issue.assignedTo?.toString() !== req.user._id.toString()) {
                return res.status(403).json({ 
                    success: false, 
                    message: "Only the assigned developer can move an issue to testing." 
                });
            }
            if (req.user.role === 'tester') {
                return res.status(403).json({ 
                    success: false, 
                    message: "Only the assigned developer can move an issue to testing." 
                });
            }
        }

        if (req.body.title) {
            const duplicate = await Issue.findOne({ 
                title: req.body.title.trim(), 
                project: issue.project, 
                _id: { $ne: issue._id } 
            });
            if (duplicate) {
                return res.status(400).json({ success: false, message: "An issue with this title already exists in this project." });
            }
        }

        if (req.user.role === 'developer' && issue.assignedTo?.toString() !== req.user._id.toString()) {
            return res.status(403).json({ 
                success: false, 
                message: 'Developers can only update issues assigned to them' 
            });
        }
        
        if (req.user.role === 'tester') {
            return res.status(403).json({ 
                success: false, 
                message: 'Testers can only add comments, not update issues' 
            });
        }

        if (req.body.assignedTo !== undefined) {
            if (req.body.assignedTo === null || req.body.assignedTo === '') {
                req.body.assignedTo = null;
            } else if (!mongoose.Types.ObjectId.isValid(req.body.assignedTo)) {
                const u = await User.findOne({ userId: req.body.assignedTo });
                if (u) req.body.assignedTo = u._id;
            }
        }

        if (req.body.project !== undefined) {
            if (!mongoose.Types.ObjectId.isValid(req.body.project)) {
                const p = await Project.findOne({ projectId: req.body.project });
                if (p) req.body.project = p._id;
            }
        }

        const oldStatus = issue.status;
        const oldAssignee = issue.assignedTo;

        const allowedUpdates = ['title', 'description', 'priority', 'severity', 'status', 'assignedTo', 'dueDate'];
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                issue[field] = req.body[field];
            }
        });

        await issue.save();

        if (req.body.status && req.body.status !== oldStatus) {
            await ActivityLog.create({
                action: 'UPDATE_STATUS',
                previousStatus: oldStatus,
                newStatus: issue.status,
                issue: issue._id,
                user: req.user._id
            });
        } else {
            await ActivityLog.create({
                action: 'UPDATE_ISSUE',
                issue: issue._id,
                user: req.user._id
            });
        }

        const updatedIssue = await Issue.findById(issue._id)
            .populate('project')
            .populate('assignedTo', 'name email role department userId')
            .populate('reportedBy', 'name email role department userId');

        res.status(200).json({ success: true, message: 'Issue updated successfully', data: updatedIssue });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.patch('/issues/:id/assign', authMiddleware, authorize('admin', 'manager'), async (req, res) => {
    try {
        const id = req.params.id;
        let issue = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            issue = await Issue.findById(id);
        } else {
            issue = await Issue.findOne({ issueId: id });
        }

        if (!issue) {
            return res.status(404).json({ success: false, message: 'Issue not found' });
        }

        if (issue.status === 'closed') {
            return res.status(400).json({
                success: false,
                message: "Closed issues cannot be assigned. Reopen the issue first."
            });
        }

        const { assignedTo } = req.body;
        let assignedToOid = null;
        if (assignedTo) {
            if (mongoose.Types.ObjectId.isValid(assignedTo)) {
                assignedToOid = assignedTo;
            } else {
                const u = await User.findOne({ userId: assignedTo });
                if (!u) return res.status(400).json({ success: false, message: 'User not found' });
                assignedToOid = u._id;
            }
        }

        issue.assignedTo = assignedToOid;
        await issue.save();

        await ActivityLog.create({
            action: 'ASSIGN_ISSUE',
            issue: issue._id,
            user: req.user._id
        });

        const updatedIssue = await Issue.findById(issue._id)
            .populate('project')
            .populate('assignedTo', 'name email role department userId')
            .populate('reportedBy', 'name email role department userId');

        res.status(200).json({ success: true, message: 'Issue assigned successfully', data: updatedIssue });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.patch('/issues/:id/status', authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        let issue = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            issue = await Issue.findById(id);
        } else {
            issue = await Issue.findOne({ issueId: id });
        }

        if (!issue) {
            return res.status(404).json({ success: false, message: 'Issue not found' });
        }

        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ success: false, message: 'Status is required' });
        }

        const allowedStatuses = ['open', 'in-progress', 'testing', 'resolved', 'closed'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status value' });
        }

        if (issue.status === 'closed' && status !== 'open') {
            return res.status(400).json({
                success: false,
                message: "Closed issues cannot move back without reopen. Move to 'open' status first."
            });
        }

        if (req.user.role === 'tester' && ['closed', 'resolved'].includes(status)) {
            return res.status(403).json({
                success: false,
                message: "Testers cannot close or resolve issues directly."
            });
        }

        if (status === 'testing') {
            if (req.user.role === 'developer' && issue.assignedTo?.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: "Only the assigned developer can move an issue to testing."
                });
            }
            if (req.user.role === 'tester') {
                return res.status(403).json({
                    success: false,
                    message: "Only the assigned developer can move an issue to testing."
                });
            }
        }

        if (req.user.role === 'developer' && issue.assignedTo?.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Developers can only update status of issues assigned to them."
            });
        }

        const oldStatus = issue.status;
        issue.status = status;
        await issue.save();

        await ActivityLog.create({
            action: 'UPDATE_STATUS',
            previousStatus: oldStatus,
            newStatus: status,
            issue: issue._id,
            user: req.user._id
        });

        const updatedIssue = await Issue.findById(issue._id)
            .populate('project')
            .populate('assignedTo', 'name email role department userId')
            .populate('reportedBy', 'name email role department userId');

        res.status(200).json({ success: true, message: 'Issue status updated successfully', data: updatedIssue });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/issues/:id', authMiddleware, authorize('admin', 'manager'), async (req, res) => {
    try {
        const id = req.params.id;
        let issue = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            issue = await Issue.findByIdAndDelete(id);
        } else {
            issue = await Issue.findOneAndDelete({ issueId: id });
        }

        if (!issue) {
            return res.status(404).json({ success: false, message: 'Issue not found' });
        }
        res.status(200).json({ success: true, message: 'Issue deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/comments', authMiddleware, async (req, res) => {
    try {
        const commentsList = await Comment.find()
            .populate('user', 'name role department userId')
            .populate({
                path: 'issue',
                populate: { path: 'project', select: 'title projectId' }
            })
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, message: 'Comments fetched successfully', data: commentsList });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/comments/:id', authMiddleware, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id)
            .populate('user', 'name role department userId')
            .populate('issue');
        if (!comment) {
            return res.status(404).json({ success: false, message: 'Comment not found' });
        }
        res.status(200).json({ success: true, data: comment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/comments', authMiddleware, async (req, res) => {
    try {
        const { issueId, issue, message } = req.body;
        const targetIssueId = issueId || issue;
        if (!targetIssueId || !message) {
            return res.status(400).json({ success: false, message: 'Issue and message are required' });
        }

        let issueOid = targetIssueId;
        if (!mongoose.Types.ObjectId.isValid(targetIssueId)) {
            const is = await Issue.findOne({ issueId: targetIssueId });
            if (!is) return res.status(400).json({ success: false, message: 'Issue not found' });
            issueOid = is._id;
        }

        const commentId = 'COM-' + Date.now();
        const newComment = await Comment.create({
            commentId,
            message: message.trim(),
            issue: issueOid,
            user: req.user._id,
            createdAt: new Date()
        });

        await ActivityLog.create({
            action: 'ADD_COMMENT',
            issue: issueOid,
            user: req.user._id
        });

        const populatedComment = await Comment.findById(newComment._id)
            .populate('user', 'name email role department userId');

        res.status(201).json({ success: true, message: 'Comment created successfully', data: populatedComment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/issues/:id/comments', authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        let issue = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            issue = await Issue.findById(id);
        } else {
            issue = await Issue.findOne({ issueId: id });
        }

        if (!issue) {
            return res.status(404).json({ success: false, message: 'Issue not found' });
        }

        const { comment, message } = req.body;
        const commentText = (comment || message || '').trim();
        if (!commentText) {
            return res.status(400).json({ success: false, message: 'Comment message is required' });
        }

        const commentId = 'COM-' + Date.now();
        const newComment = await Comment.create({
            commentId,
            message: commentText,
            issue: issue._id,
            user: req.user._id,
            createdAt: new Date()
        });

        await ActivityLog.create({
            action: 'ADD_COMMENT',
            issue: issue._id,
            user: req.user._id
        });

        const populatedComment = await Comment.findById(newComment._id)
            .populate('user', 'name email role department userId');

        res.status(200).json({ success: true, message: 'Comment added successfully', data: populatedComment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/comments/:id', authMiddleware, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ success: false, message: 'Comment not found' });
        }

        if (req.user.role !== 'admin' && comment.user?.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'You are not authorized to delete this comment' });
        }

        await Comment.findByIdAndDelete(req.params.id);

        await ActivityLog.create({
            action: 'DELETE_COMMENT',
            user: req.user._id
        });

        res.status(200).json({ success: true, message: 'Comment deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/analytics/issues', authMiddleware, async (req, res) => {
    try {
        const totalIssues = await Issue.countDocuments();
        const openIssues = await Issue.countDocuments({ status: 'open' });
        const resolvedIssues = await Issue.countDocuments({ status: 'resolved' });
        const closedIssues = await Issue.countDocuments({ status: 'closed' });
        res.status(200).json({
            success: true,
            data: { totalIssues, openIssues, resolvedIssues, closedIssues }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/analytics/projects', authMiddleware, async (req, res) => {
    try {
        const projectWiseIssues = await Issue.aggregate([
            { $group: { _id: '$project', count: { $sum: 1 } } },
            { $lookup: { from: 'projects', localField: '_id', foreignField: '_id', as: 'proj' } },
            { $unwind: '$proj' },
            { $project: { _id: 1, count: 1, title: '$proj.title', projectId: '$proj.projectId' } }
        ]);
        const activeProjectsCount = await Project.countDocuments({ status: 'active' });
        const closedProjectsCount = await Project.countDocuments({ status: { $in: ['completed', 'archived'] } });
        res.status(200).json({
            success: true,
            data: { projectWiseIssues, activeProjectsCount, closedProjectsCount }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/analytics/developers', authMiddleware, async (req, res) => {
    try {
        const developerResolvedCount = await Issue.aggregate([
            { $match: { status: { $in: ['resolved', 'closed'] }, assignedTo: { $ne: null } } },
            { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'usr' } },
            { $unwind: '$usr' },
            { $project: { _id: 1, count: 1, name: '$usr.name', email: '$usr.email' } }
        ]);

        const timeStats = await Issue.aggregate([
            { $match: { status: { $in: ['resolved', 'closed'] } } },
            {
                $project: {
                    duration: { $subtract: ['$updatedAt', '$createdAt'] }
                }
            },
            {
                $group: {
                    _id: null,
                    avgTime: { $avg: '$duration' }
                }
            }
        ]);
        const averageResolutionTime = timeStats.length > 0 ? timeStats[0].avgTime : 0;

        let highestResolvedDeveloper = 'N/A';
        if (developerResolvedCount.length > 0) {
            const sorted = [...developerResolvedCount].sort((a, b) => b.count - a.count);
            highestResolvedDeveloper = sorted[0].name;
        }

        res.status(200).json({
            success: true,
            data: { developerResolvedCount, averageResolutionTime, highestResolvedDeveloper }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/analytics/dashboard', authMiddleware, async (req, res) => {
    try {
        const statusStats = await Issue.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const priorityStats = await Issue.aggregate([
            { $group: { _id: '$priority', count: { $sum: 1 } } }
        ]);

        const projectStats = await Issue.aggregate([
            { $group: { _id: '$project', count: { $sum: 1 } } },
            { $lookup: { from: 'projects', localField: '_id', foreignField: '_id', as: 'projectInfo' } },
            { $unwind: '$projectInfo' },
            { $project: { _id: 1, count: 1, title: '$projectInfo.title', projectId: '$projectInfo.projectId' } }
        ]);

        const developerStats = await Issue.aggregate([
            { $match: { status: { $in: ['resolved', 'closed'] }, assignedTo: { $ne: null } } },
            { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userInfo' } },
            { $unwind: '$userInfo' },
            { $project: { _id: 1, count: 1, name: '$userInfo.name', email: '$userInfo.email', role: '$userInfo.role' } }
        ]);

        const activityLogs = await ActivityLog.find()
            .populate('user', 'name role userId')
            .sort({ timestamp: -1 })
            .limit(10);

        res.status(200).json({
            success: true,
            message: 'Aggregation analytics compiled successfully',
            data: {
                statusStats,
                priorityStats,
                projectStats,
                developerStats,
                activityLogs
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/health', async (req, res) => {
    let dbStatus = 'disconnected';
    try {
        if (mongoose.connection.readyState === 1) {
            dbStatus = 'connected';
        }
    } catch(e) {}
    
    const count = await Issue.countDocuments().catch(() => 0);
    res.status(200).json({
        success: true,
        database: dbStatus,
        documentCount: count
    });
});

app.get('/', (req, res) => {
    res.json({ success: true, message: 'Issue Tracking API Running' });
});

app.use('/api/sync', syncRoutes);
app.use('/sync', syncRoutes);

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('MongoDB connected successfully');
        await initUsers();
        console.log('Default users initialized');
    })
    .catch(err => console.error('MongoDB connection error:', err.message));

module.exports = app;
