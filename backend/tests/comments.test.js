const { app, request, createUser, createProject, auth } = require('./helpers');
const Issue = require('../src/models/Issue');
const Comment = require('../src/models/Comment');
const ids = require('../src/utils/ids');

describe('Comments', () => {
    let admin;
    let tester;
    let developer;
    let issue;

    beforeEach(async () => {
        admin = await createUser({ role: 'admin' });
        tester = await createUser({ role: 'tester' });
        developer = await createUser({ role: 'developer' });
        const project = await createProject(admin.user._id);
        issue = await Issue.create({
            issueId: ids.issueId(),
            title: 'Commentable issue',
            project: project._id,
            reportedBy: admin.user._id,
        });
    });

    it('lets a tester comment even though they cannot edit issues', async () => {
        const res = await request(app)
            .post(`/api/issues/${issue.issueId}/comments`)
            .set(auth(tester.token))
            .send({ comment: 'Reproduced on staging' });

        expect(res.status).toBe(200);
        expect(res.body.data.message).toBe('Reproduced on staging');
        expect(res.body.data.user.role).toBe('tester');
    });

    it('creates a comment through the standalone endpoint', async () => {
        const res = await request(app)
            .post('/api/comments')
            .set(auth(developer.token))
            .send({ issueId: issue.issueId, message: 'On it' });

        expect(res.status).toBe(201);
        expect(res.body.data.commentId).toMatch(/^COM-/);
    });

    it('rejects an empty comment', async () => {
        const res = await request(app)
            .post(`/api/issues/${issue.issueId}/comments`)
            .set(auth(tester.token))
            .send({ comment: '   ' });

        expect(res.status).toBe(400);
    });

    it('rejects a comment on an unknown issue', async () => {
        const res = await request(app)
            .post('/api/comments')
            .set(auth(admin.token))
            .send({ issueId: 'ISS-ghost', message: 'Hello?' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Issue not found/);
    });

    it('lists comments with issue and project populated', async () => {
        await request(app)
            .post(`/api/issues/${issue.issueId}/comments`)
            .set(auth(admin.token))
            .send({ comment: 'Listed' });

        const res = await request(app).get('/api/comments').set(auth(admin.token));

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].issue.project.title).toBeTruthy();
    });

    it('lets an author delete their own comment', async () => {
        const created = await request(app)
            .post(`/api/issues/${issue.issueId}/comments`)
            .set(auth(developer.token))
            .send({ comment: 'Mine to remove' });

        const res = await request(app)
            .delete(`/api/comments/${created.body.data._id}`)
            .set(auth(developer.token));

        expect(res.status).toBe(200);
        expect(await Comment.countDocuments()).toBe(0);
    });

    it('stops a non-author, non-admin deleting a comment', async () => {
        const created = await request(app)
            .post(`/api/issues/${issue.issueId}/comments`)
            .set(auth(developer.token))
            .send({ comment: 'Not yours' });

        const res = await request(app)
            .delete(`/api/comments/${created.body.data._id}`)
            .set(auth(tester.token));

        expect(res.status).toBe(403);
    });

    it('lets an admin delete anyone’s comment', async () => {
        const created = await request(app)
            .post(`/api/issues/${issue.issueId}/comments`)
            .set(auth(developer.token))
            .send({ comment: 'Admin can remove this' });

        const res = await request(app)
            .delete(`/api/comments/${created.body.data._id}`)
            .set(auth(admin.token));

        expect(res.status).toBe(200);
    });

    it('404s when deleting an unknown comment', async () => {
        const res = await request(app)
            .delete('/api/comments/507f1f77bcf86cd799439011')
            .set(auth(admin.token));

        expect(res.status).toBe(404);
    });
});
