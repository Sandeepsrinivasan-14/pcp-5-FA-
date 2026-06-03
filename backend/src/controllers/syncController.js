const axios = require('axios');
const User = require('../models/User');
const Project = require('../models/Project');
const Issue = require('../models/Issue');
const Comment = require('../models/Comment');
const ActivityLog = require('../models/ActivityLog');

const mapPriority = (p) => {
  if (!p) return 'medium';
  const clean = p.trim().toLowerCase();
  if (clean === 'critical') return 'critical';
  if (['low', 'medium', 'high', 'critical'].includes(clean)) return clean;
  return 'medium';
};

const mapSeverity = (s) => {
  if (!s) return 'minor';
  const clean = s.trim().toLowerCase();
  if (['minor', 'major', 'critical'].includes(clean)) return clean;
  return 'minor';
};

const mapStatus = (st) => {
  if (!st) return 'open';
  const clean = st.trim().toLowerCase();
  if (clean === 'done') return 'closed';
  if (['open', 'in-progress', 'testing', 'resolved', 'closed'].includes(clean)) return clean;
  return 'open';
};

exports.syncDataset = async (req, res, next) => {
  try {
    const apiUrl = process.env.DATASET_API_URL || 'https://t4e-testserver.onrender.com/api';
    const studentId = process.env.STUDENT_ID || 'SANDEEP SRINIVASAN S';
    const password = process.env.STUDENT_PASSWORD || '203264';
    const set = req.body.set || process.env.DATASET_SET || 'setB';

    console.log('Syncing dataset from external API...');
    const tokenResponse = await axios.post(`${apiUrl}/public/token`, {
      studentId,
      set,
      password,
    });

    if (!tokenResponse.data || !tokenResponse.data.token) {
      return res.status(400).json({
        success: false,
        message: 'Failed to obtain token from dataset API'
      });
    }

    const { token, dataUrl } = tokenResponse.data;
    const fetchUrl = dataUrl
      ? (dataUrl.startsWith('http') ? dataUrl : `${apiUrl}${dataUrl}`)
      : `${apiUrl}/data`;

    const dataResponse = await axios.get(fetchUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const apiPayload = dataResponse.data;
    const dataset = apiPayload.data || apiPayload;

    if (!dataset) {
      return res.status(400).json({
        success: false,
        message: 'No data received from dataset API',
      });
    }

    const usersList = dataset.users || [];
    const projectsList = dataset.projects || [];
    const issuesList = dataset.issues || [];
    const commentsList = dataset.comments || [];

    const totalFetched = usersList.length + projectsList.length + issuesList.length + commentsList.length;

    let inserted = 0;
    let duplicates = 0;
    let rejected = 0;

    const userMap = new Map();
    const projectMap = new Map();
    const issueMap = new Map();

    const existingUsers = await User.find({});
    existingUsers.forEach((u) => userMap.set(u.userId, u._id));

    const existingProjects = await Project.find({});
    existingProjects.forEach((p) => projectMap.set(p.projectId, p._id));

    const existingIssues = await Issue.find({});
    existingIssues.forEach((i) => issueMap.set(i.issueId, i._id));

    for (const userData of usersList) {
      try {
        if (!userData.email || !userData.name || !userData.userId) {
          rejected++;
          continue;
        }

        const cleanUserData = {
          userId: userData.userId.trim(),
          name: userData.name.trim(),
          email: userData.email.trim().toLowerCase(),
          role: userData.role ? userData.role.trim().toLowerCase() : 'developer',
          department: userData.department ? userData.department.trim() : 'General',
          status: userData.status ? userData.status.trim().toLowerCase() : 'active',
        };

        const existingUser = await User.findOne({
          $or: [{ email: cleanUserData.email }, { userId: cleanUserData.userId }],
        });

        if (existingUser) {
          existingUser.name = cleanUserData.name;
          existingUser.role = cleanUserData.role;
          existingUser.department = cleanUserData.department;
          existingUser.status = cleanUserData.status;
          await existingUser.save();

          userMap.set(cleanUserData.userId, existingUser._id);
          duplicates++;
        } else {
          const newUser = await User.create({
            ...cleanUserData,
            password: 'defaultPass123',
          });
          userMap.set(cleanUserData.userId, newUser._id);
          inserted++;
        }
      } catch (err) {
        console.error(err.message);
        rejected++;
      }
    }

    for (const projData of projectsList) {
      try {
        if (!projData.title || !projData.projectId) {
          rejected++;
          continue;
        }

        const cleanProjData = {
          projectId: projData.projectId.trim(),
          title: projData.title.trim(),
          status: projData.status ? projData.status.trim().toLowerCase() : 'active',
          description: projData.description ? projData.description.trim() : 'No description provided',
          category: projData.category ? projData.category.trim() : 'General',
          startDate: projData.startDate ? new Date(projData.startDate) : new Date(),
        };

        const existingProj = await Project.findOne({ projectId: cleanProjData.projectId });

        if (existingProj) {
          existingProj.title = cleanProjData.title;
          existingProj.status = cleanProjData.status;
          existingProj.description = cleanProjData.description;
          existingProj.category = cleanProjData.category;
          existingProj.startDate = cleanProjData.startDate;
          await existingProj.save();

          projectMap.set(cleanProjData.projectId, existingProj._id);
          duplicates++;
        } else {
          const firstAdmin = await User.findOne({ role: 'admin' });
          const newProj = await Project.create({
            ...cleanProjData,
            owner: firstAdmin ? firstAdmin._id : null,
          });
          projectMap.set(cleanProjData.projectId, newProj._id);
          inserted++;
        }
      } catch (err) {
        console.error(err.message);
        rejected++;
      }
    }

    for (const issueData of issuesList) {
      try {
        if (!issueData.title || !issueData.issueId || !issueData.projectId) {
          rejected++;
          continue;
        }

        const projectOid = projectMap.get(issueData.projectId);
        if (!projectOid) {
          rejected++;
          continue;
        }

        const assignedToOid = userMap.get(issueData.assignedTo) || null;
        const reportedByOid = userMap.get(issueData.reportedBy) || null;

        const cleanIssueData = {
          issueId: issueData.issueId.trim(),
          title: issueData.title.trim(),
          description: issueData.description ? issueData.description.trim() : 'No description provided',
          project: projectOid,
          assignedTo: assignedToOid,
          reportedBy: reportedByOid,
          priority: mapPriority(issueData.priority),
          severity: mapSeverity(issueData.severity),
          status: mapStatus(issueData.status),
        };

        const existingIssue = await Issue.findOne({ issueId: cleanIssueData.issueId });

        if (existingIssue) {
          existingIssue.title = cleanIssueData.title;
          existingIssue.description = cleanIssueData.description;
          existingIssue.project = cleanIssueData.project;
          existingIssue.assignedTo = cleanIssueData.assignedTo;
          existingIssue.reportedBy = cleanIssueData.reportedBy;
          existingIssue.priority = cleanIssueData.priority;
          existingIssue.severity = cleanIssueData.severity;
          existingIssue.status = cleanIssueData.status;
          await existingIssue.save();

          issueMap.set(cleanIssueData.issueId, existingIssue._id);
          duplicates++;
        } else {
          const newIssue = await Issue.create(cleanIssueData);
          issueMap.set(cleanIssueData.issueId, newIssue._id);
          inserted++;
        }
      } catch (err) {
        console.error(err.message);
        rejected++;
      }
    }

    for (const commentData of commentsList) {
      try {
        if (!commentData.message || !commentData.commentId || !commentData.issueId) {
          rejected++;
          continue;
        }

        const issueOid = issueMap.get(commentData.issueId);
        if (!issueOid) {
          rejected++;
          continue;
        }

        const userOid = userMap.get(commentData.userId) || null;

        const cleanCommentData = {
          commentId: commentData.commentId.trim(),
          message: commentData.message.trim(),
          issue: issueOid,
          user: userOid,
          createdAt: commentData.createdAt ? new Date(commentData.createdAt) : new Date(),
        };

        const existingComment = await Comment.findOne({ commentId: cleanCommentData.commentId });

        if (existingComment) {
          existingComment.message = cleanCommentData.message;
          existingComment.issue = cleanCommentData.issue;
          existingComment.user = cleanCommentData.user;
          existingComment.createdAt = cleanCommentData.createdAt;
          await existingComment.save();
          duplicates++;
        } else {
          await Comment.create(cleanCommentData);
          inserted++;
        }
      } catch (err) {
        console.error(err.message);
        rejected++;
      }
    }

    const systemUser = await User.findOne({ role: 'admin' }) || await User.findOne({});
    if (systemUser) {
      await ActivityLog.create({
        action: 'SYNC_DATASET',
        details: `Dataset synchronized successfully from external API. Synced ${totalFetched} items (inserted: ${inserted}, updated: ${duplicates}, rejected: ${rejected}).`,
        user: systemUser._id
      });
    }

    res.status(200).json({
      success: true,
      message: 'Dataset synchronized successfully',
      data: {
        totalFetched,
        inserted,
        duplicates,
        rejected,
      },
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.response?.data?.message || err.message
    });
  }
};
