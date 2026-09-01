const { app, request, createUser, createProject, auth } = require('./helpers');
const Issue = require('../src/models/Issue');
const Comment = require('../src/models/Comment');
const ids = require('../src/utils/ids');

describe('Issues', () => {
    let admin;
    let manager;
    let developer;
    let tester;
    let project;

    beforeEach(async () => {
        admin = await createUser({ role: 'admin' });
        manager = await createUser({ role: 'manager' });
        developer = await createUser({ role: 'developer' });
        tester = await createUser({ role: 'tester' });
        project = await createProject(admin.user._id);
    });

    const makeIssue = (overrides = {}) =>
        Issue.create({
            issueId: overrides.issueId || ids.issueId(),
            title: overrides.title || `Issue ${Math.random().toString(16).slice(2)}`,
            project: overrides.project || project._id,
            reportedBy: admin.user._id,
            ...overrides,
        });

    describe('creation', () => {
        it('lets a manager create an issue', async () => {
            const res = await request(app)
                .post('/api/issues')
                .set(auth(manager.token))
                .send({ title: 'Login button is broken', project: project.projectId });

            expect(res.status).toBe(201);
            expect(res.body.data.issueId).toMatch(/^ISS-/);
            expect(res.body.data.status).toBe('open');
            expect(res.body.data.project.projectId).toBe(project.projectId);
        });

        it('accepts a project referenced by _id as well as projectId', async () => {
            const res = await request(app)
                .post('/api/issues')
                .set(auth(admin.token))
                .send({ title: 'By object id', project: project._id.toString() });

            expect(res.status).toBe(201);
        });

        it('forbids a developer from creating issues', async () => {
            const res = await request(app)
                .post('/api/issues')
                .set(auth(developer.token))
                .send({ title: 'Nope', project: project.projectId });

            expect(res.status).toBe(403);
        });

        it('forbids a tester from creating issues', async () => {
            const res = await request(app)
                .post('/api/issues')
                .set(auth(tester.token))
                .send({ title: 'Nope', project: project.projectId });

            expect(res.status).toBe(403);
        });

        it('rejects a duplicate title within the same project', async () => {
            await makeIssue({ title: 'Duplicate me' });

            const res = await request(app)
                .post('/api/issues')
                .set(auth(admin.token))
                .send({ title: 'Duplicate me', project: project.projectId });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/already exists in this project/);
        });

        it('allows the same title in a different project', async () => {
            await makeIssue({ title: 'Shared title' });
            const other = await createProject(admin.user._id, { title: 'Other' });

            const res = await request(app)
                .post('/api/issues')
                .set(auth(admin.token))
                .send({ title: 'Shared title', project: other.projectId });

            expect(res.status).toBe(201);
        });

        it('rejects an unknown project', async () => {
            const res = await request(app)
                .post('/api/issues')
                .set(auth(admin.token))
                .send({ title: 'Orphan', project: 'PRJ-does-not-exist' });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/Project not found/);
        });

        it('rejects a missing title', async () => {
            const res = await request(app)
                .post('/api/issues')
                .set(auth(admin.token))
                .send({ project: project.projectId });

            expect(res.status).toBe(400);
        });
    });

    describe('listing and filtering', () => {
        it('filters by status', async () => {
            await makeIssue({ status: 'open' });
            await makeIssue({ status: 'closed' });

            const res = await request(app).get('/api/issues?status=closed').set(auth(admin.token));

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].status).toBe('closed');
        });

        it('returns nothing for a project filter that matches no project', async () => {
            await makeIssue();

            const res = await request(app)
                .get('/api/issues?project=PRJ-nonexistent')
                .set(auth(admin.token));

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(0);
        });

        it('treats a search term literally rather than as a regular expression', async () => {
            await makeIssue({ title: 'Crash on save' });

            const res = await request(app).get('/api/issues?search=.*').set(auth(admin.token));

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(0);
        });

        it('finds issues by a substring of the title', async () => {
            await makeIssue({ title: 'Crash on save' });

            const res = await request(app).get('/api/issues?search=crash').set(auth(admin.token));

            expect(res.body.data).toHaveLength(1);
        });

        it('paginates and clamps an oversized limit', async () => {
            await Promise.all([makeIssue(), makeIssue(), makeIssue()]);

            const res = await request(app)
                .get('/api/issues?page=1&limit=100000')
                .set(auth(admin.token));

            expect(res.status).toBe(200);
            expect(res.body.limit).toBeLessThanOrEqual(100);
            expect(res.body.total).toBe(3);
        });

        it('requires authentication', async () => {
            const res = await request(app).get('/api/issues');
            expect(res.status).toBe(401);
        });
    });

    describe('fetching one issue', () => {
        it('returns the issue with its comments', async () => {
            const issue = await makeIssue();
            await Comment.create({
                commentId: ids.commentId(),
                message: 'First comment',
                issue: issue._id,
                user: admin.user._id,
            });

            const res = await request(app)
                .get(`/api/issues/${issue.issueId}`)
                .set(auth(admin.token));

            expect(res.status).toBe(200);
            expect(res.body.data.comments).toHaveLength(1);
            expect(res.body.data.comments[0].message).toBe('First comment');
        });

        it('404s for an unknown issue', async () => {
            const res = await request(app).get('/api/issues/ISS-nope').set(auth(admin.token));
            expect(res.status).toBe(404);
        });
    });

    describe('role-based update rules', () => {
        it('lets a developer update an issue assigned to them', async () => {
            const issue = await makeIssue({ assignedTo: developer.user._id });

            const res = await request(app)
                .patch(`/api/issues/${issue.issueId}`)
                .set(auth(developer.token))
                .send({ description: 'Investigating' });

            expect(res.status).toBe(200);
            expect(res.body.data.description).toBe('Investigating');
        });

        it('stops a developer updating an issue assigned to someone else', async () => {
            const other = await createUser({ role: 'developer' });
            const issue = await makeIssue({ assignedTo: other.user._id });

            const res = await request(app)
                .patch(`/api/issues/${issue.issueId}`)
                .set(auth(developer.token))
                .send({ description: 'Not mine' });

            expect(res.status).toBe(403);
        });

        it('stops a tester updating an issue', async () => {
            const issue = await makeIssue();

            const res = await request(app)
                .patch(`/api/issues/${issue.issueId}`)
                .set(auth(tester.token))
                .send({ description: 'Nope' });

            expect(res.status).toBe(403);
        });

        it('rejects a duplicate title on update', async () => {
            await makeIssue({ title: 'Taken' });
            const issue = await makeIssue({ title: 'Free' });

            const res = await request(app)
                .patch(`/api/issues/${issue.issueId}`)
                .set(auth(admin.token))
                .send({ title: 'Taken' });

            expect(res.status).toBe(400);
        });
    });

    describe('status workflow', () => {
        it('moves an issue through the workflow', async () => {
            const issue = await makeIssue();

            const res = await request(app)
                .patch(`/api/issues/${issue.issueId}/status`)
                .set(auth(manager.token))
                .send({ status: 'in-progress' });

            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('in-progress');
        });

        it('rejects an invalid status value', async () => {
            const issue = await makeIssue();

            const res = await request(app)
                .patch(`/api/issues/${issue.issueId}/status`)
                .set(auth(admin.token))
                .send({ status: 'banana' });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/Invalid status value/);
        });

        it('stops a tester resolving or closing an issue', async () => {
            const issue = await makeIssue();

            for (const status of ['resolved', 'closed']) {
                const res = await request(app)
                    .patch(`/api/issues/${issue.issueId}/status`)
                    .set(auth(tester.token))
                    .send({ status });

                expect(res.status).toBe(403);
                expect(res.body.message).toMatch(/Testers cannot close or resolve/);
            }
        });

        it('only lets the assigned developer move an issue to testing', async () => {
            const other = await createUser({ role: 'developer' });
            const issue = await makeIssue({ assignedTo: other.user._id });

            const res = await request(app)
                .patch(`/api/issues/${issue.issueId}/status`)
                .set(auth(developer.token))
                .send({ status: 'testing' });

            expect(res.status).toBe(403);
            expect(res.body.message).toMatch(/Only the assigned developer/);
        });

        it('lets the assigned developer move their issue to testing', async () => {
            const issue = await makeIssue({ assignedTo: developer.user._id });

            const res = await request(app)
                .patch(`/api/issues/${issue.issueId}/status`)
                .set(auth(developer.token))
                .send({ status: 'testing' });

            expect(res.status).toBe(200);
        });

        it('stops a closed issue moving anywhere except back to open', async () => {
            const issue = await makeIssue({ status: 'closed' });

            const res = await request(app)
                .patch(`/api/issues/${issue.issueId}/status`)
                .set(auth(admin.token))
                .send({ status: 'in-progress' });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/cannot move back without reopen/);
        });

        it('allows reopening a closed issue', async () => {
            const issue = await makeIssue({ status: 'closed' });

            const res = await request(app)
                .patch(`/api/issues/${issue.issueId}/status`)
                .set(auth(admin.token))
                .send({ status: 'open' });

            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('open');
        });

        it('records a status change in the activity log', async () => {
            const ActivityLog = require('../src/models/ActivityLog');
            const issue = await makeIssue();

            await request(app)
                .patch(`/api/issues/${issue.issueId}/status`)
                .set(auth(admin.token))
                .send({ status: 'in-progress' });

            const log = await ActivityLog.findOne({ action: 'UPDATE_STATUS' });
            expect(log.previousStatus).toBe('open');
            expect(log.newStatus).toBe('in-progress');
            // `details` used to be dropped silently because the schema lacked it.
            expect(log.details).toBeTruthy();
        });
    });

    describe('assignment', () => {
        it('assigns an issue to a developer', async () => {
            const issue = await makeIssue();

            const res = await request(app)
                .patch(`/api/issues/${issue.issueId}/assign`)
                .set(auth(manager.token))
                .send({ assignedTo: developer.user.userId });

            expect(res.status).toBe(200);
            expect(res.body.data.assignedTo._id).toBe(developer.user._id.toString());
        });

        it('rejects assignment to an unknown user', async () => {
            const issue = await makeIssue();

            const res = await request(app)
                .patch(`/api/issues/${issue.issueId}/assign`)
                .set(auth(admin.token))
                .send({ assignedTo: 'usr-ghost' });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/User not found/);
        });

        it('refuses to assign a closed issue', async () => {
            const issue = await makeIssue({ status: 'closed' });

            const res = await request(app)
                .patch(`/api/issues/${issue.issueId}/assign`)
                .set(auth(admin.token))
                .send({ assignedTo: developer.user.userId });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/Reopen the issue first/);
        });

        it('forbids a developer from assigning issues', async () => {
            const issue = await makeIssue();

            const res = await request(app)
                .patch(`/api/issues/${issue.issueId}/assign`)
                .set(auth(developer.token))
                .send({ assignedTo: developer.user.userId });

            expect(res.status).toBe(403);
        });
    });

    describe('deletion', () => {
        it('deletes an issue and its comments', async () => {
            const issue = await makeIssue();
            await Comment.create({
                commentId: ids.commentId(),
                message: 'Orphan candidate',
                issue: issue._id,
                user: admin.user._id,
            });

            const res = await request(app)
                .delete(`/api/issues/${issue.issueId}`)
                .set(auth(admin.token));

            expect(res.status).toBe(200);
            expect(await Issue.countDocuments()).toBe(0);
            // Comments used to be left behind pointing at a deleted issue.
            expect(await Comment.countDocuments({ issue: issue._id })).toBe(0);
        });

        it('forbids a developer from deleting issues', async () => {
            const issue = await makeIssue();

            const res = await request(app)
                .delete(`/api/issues/${issue.issueId}`)
                .set(auth(developer.token));

            expect(res.status).toBe(403);
        });
    });
});
