const { app, request, createUser, createProject, auth } = require('./helpers');
const Issue = require('../src/models/Issue');
const ids = require('../src/utils/ids');

describe('Analytics', () => {
    let admin;
    let developer;
    let project;

    beforeEach(async () => {
        admin = await createUser({ role: 'admin' });
        developer = await createUser({ role: 'developer', name: 'Dana Dev' });
        project = await createProject(admin.user._id, { title: 'Analytics project' });

        await Issue.create([
            { issueId: ids.issueId(), title: 'A', project: project._id, status: 'open', priority: 'high' },
            { issueId: ids.issueId(), title: 'B', project: project._id, status: 'resolved', assignedTo: developer.user._id },
            { issueId: ids.issueId(), title: 'C', project: project._id, status: 'closed', assignedTo: developer.user._id },
        ]);
    });

    it('summarises issue counts by status', async () => {
        const res = await request(app).get('/api/analytics/issues').set(auth(admin.token));

        expect(res.status).toBe(200);
        expect(res.body.data.totalIssues).toBe(3);
        expect(res.body.data.openIssues).toBe(1);
        expect(res.body.data.resolvedIssues).toBe(1);
        expect(res.body.data.closedIssues).toBe(1);
    });

    it('reports issue counts per project', async () => {
        const res = await request(app).get('/api/analytics/projects').set(auth(admin.token));

        expect(res.status).toBe(200);
        expect(res.body.data.activeProjectsCount).toBe(1);
        expect(res.body.data.projectWiseIssues[0].count).toBe(3);
        expect(res.body.data.projectWiseIssues[0].title).toBe('Analytics project');
    });

    it('identifies the developer who resolved the most issues', async () => {
        const res = await request(app).get('/api/analytics/developers').set(auth(admin.token));

        expect(res.status).toBe(200);
        expect(res.body.data.highestResolvedDeveloper).toBe('Dana Dev');
        expect(res.body.data.developerResolvedCount[0].count).toBe(2);
    });

    it('returns N/A when nobody has resolved anything', async () => {
        await Issue.deleteMany({});

        const res = await request(app).get('/api/analytics/developers').set(auth(admin.token));

        expect(res.body.data.highestResolvedDeveloper).toBe('N/A');
        expect(res.body.data.averageResolutionTime).toBe(0);
    });

    it('compiles the dashboard aggregation', async () => {
        const res = await request(app).get('/api/analytics/dashboard').set(auth(admin.token));

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('statusStats');
        expect(res.body.data).toHaveProperty('priorityStats');
        expect(res.body.data).toHaveProperty('projectStats');
        expect(res.body.data).toHaveProperty('developerStats');
        expect(Array.isArray(res.body.data.activityLogs)).toBe(true);
    });

    it('requires authentication', async () => {
        const res = await request(app).get('/api/analytics/dashboard');
        expect(res.status).toBe(401);
    });
});
