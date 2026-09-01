const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Project = require('../src/models/Project');
const ids = require('../src/utils/ids');

const PASSWORD = 'TestPassword123!';

/**
 * Creates a user and returns it alongside a bearer token, so tests can act as
 * any role without going through registration each time.
 */
const createUser = async (overrides = {}) => {
    const role = overrides.role || 'developer';
    const user = await User.create({
        userId: overrides.userId || ids.userId(),
        name: overrides.name || `${role} user`,
        email: overrides.email || `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}@test.com`,
        password: overrides.password || PASSWORD,
        role,
        ...(overrides.status ? { status: overrides.status } : {}),
        ...(overrides.department ? { department: overrides.department } : {}),
    });

    const response = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: overrides.password || PASSWORD });

    return { user, token: response.body.data?.token, password: overrides.password || PASSWORD };
};

const createProject = async (ownerId, overrides = {}) =>
    Project.create({
        projectId: overrides.projectId || ids.projectId(),
        title: overrides.title || 'Test Project',
        description: overrides.description || 'A project used by tests',
        owner: ownerId,
        status: overrides.status || 'active',
        ...(overrides.members ? { members: overrides.members } : {}),
    });

const auth = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { app, request, createUser, createProject, auth, PASSWORD };
