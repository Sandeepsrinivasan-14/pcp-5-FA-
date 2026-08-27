const { app, request, createUser, createProject, auth } = require('./helpers');
const Project = require('../src/models/Project');

describe('Projects', () => {
    let admin;
    let manager;
    let developer;

    beforeEach(async () => {
        admin = await createUser({ role: 'admin' });
        manager = await createUser({ role: 'manager' });
        developer = await createUser({ role: 'developer' });
    });

    it('creates a project as a manager', async () => {
        const res = await request(app)
            .post('/api/projects')
            .set(auth(manager.token))
            .send({ title: 'Apollo', description: 'Moon shot', category: 'Platform' });

        expect(res.status).toBe(201);
        expect(res.body.data.projectId).toMatch(/^PRJ-/);
        expect(res.body.data.owner).toBe(manager.user._id.toString());
    });

    it('accepts "name" as an alias for "title"', async () => {
        const res = await request(app)
            .post('/api/projects')
            .set(auth(admin.token))
            .send({ name: 'Legacy alias' });

        expect(res.status).toBe(201);
        expect(res.body.data.title).toBe('Legacy alias');
    });

    it('rejects a project with no title', async () => {
        const res = await request(app).post('/api/projects').set(auth(admin.token)).send({});

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/title is required/i);
    });

    it('forbids a developer from creating a project', async () => {
        const res = await request(app)
            .post('/api/projects')
            .set(auth(developer.token))
            .send({ title: 'Not allowed' });

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/developer cannot perform this action/);
    });

    it('resolves members given as business ids', async () => {
        const res = await request(app)
            .post('/api/projects')
            .set(auth(admin.token))
            .send({ title: 'With members', members: [developer.user.userId] });

        expect(res.status).toBe(201);
        expect(res.body.data.members).toHaveLength(1);
        expect(res.body.data.members[0]).toBe(developer.user._id.toString());
    });

    it('lists projects with the owner populated', async () => {
        await createProject(admin.user._id, { title: 'Listed' });

        const res = await request(app).get('/api/projects').set(auth(developer.token));

        expect(res.status).toBe(200);
        expect(res.body.data[0].owner.name).toBe(admin.user.name);
        expect(res.body.data[0].owner).not.toHaveProperty('password');
    });

    it('filters projects by status', async () => {
        await createProject(admin.user._id, { title: 'Active one', status: 'active' });
        await createProject(admin.user._id, { title: 'Archived one', status: 'archived' });

        const res = await request(app).get('/api/projects?status=archived').set(auth(admin.token));

        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].title).toBe('Archived one');
    });

    it('fetches a project by projectId and by _id', async () => {
        const project = await createProject(admin.user._id);

        const byBusinessId = await request(app)
            .get(`/api/projects/${project.projectId}`)
            .set(auth(admin.token));
        const byObjectId = await request(app)
            .get(`/api/projects/${project._id}`)
            .set(auth(admin.token));

        expect(byBusinessId.status).toBe(200);
        expect(byObjectId.status).toBe(200);
        expect(byBusinessId.body.data._id).toBe(byObjectId.body.data._id);
    });

    it('404s for an unknown project', async () => {
        const res = await request(app).get('/api/projects/PRJ-nope').set(auth(admin.token));
        expect(res.status).toBe(404);
    });

    it('updates a project', async () => {
        const project = await createProject(admin.user._id);

        const res = await request(app)
            .patch(`/api/projects/${project.projectId}`)
            .set(auth(manager.token))
            .send({ status: 'completed', description: 'Wrapped up' });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('completed');
        expect(res.body.data.description).toBe('Wrapped up');
    });

    it('rejects an invalid status on update', async () => {
        const project = await createProject(admin.user._id);

        const res = await request(app)
            .patch(`/api/projects/${project.projectId}`)
            .set(auth(admin.token))
            .send({ status: 'nonsense' });

        expect(res.status).toBe(400);
    });

    it('deletes a project', async () => {
        const project = await createProject(admin.user._id);

        const res = await request(app)
            .delete(`/api/projects/${project.projectId}`)
            .set(auth(admin.token));

        expect(res.status).toBe(200);
        expect(await Project.countDocuments()).toBe(0);
    });

    it('requires authentication for every project route', async () => {
        const project = await createProject(admin.user._id);

        for (const call of [
            request(app).get('/api/projects'),
            request(app).get(`/api/projects/${project.projectId}`),
            request(app).post('/api/projects').send({ title: 'x' }),
            request(app).delete(`/api/projects/${project.projectId}`),
        ]) {
            // eslint-disable-next-line no-await-in-loop
            const res = await call;
            expect(res.status).toBe(401);
        }
    });
});
