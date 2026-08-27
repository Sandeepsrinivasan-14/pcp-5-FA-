#!/usr/bin/env node
/**
 * Seeds the database with demo data.
 *
 *   npm run seed              # demo accounts only
 *   npm run seed -- --sample  # demo accounts plus sample projects and issues
 *
 * Safe to re-run: everything is created only when missing.
 */
const config = require('../src/config');
const logger = require('../src/utils/logger');
const database = require('../src/config/database');
const { seedDemoUsers, ensureAdmin } = require('../src/services/seed');
const User = require('../src/models/User');
const Project = require('../src/models/Project');
const Issue = require('../src/models/Issue');
const Comment = require('../src/models/Comment');
const ids = require('../src/utils/ids');

const SAMPLE_PROJECTS = [
    {
        title: 'Customer Portal',
        description: 'Self-service portal for account management',
        category: 'Web',
    },
    {
        title: 'Payments Service',
        description: 'Billing and subscription processing',
        category: 'Backend',
    },
];

const SAMPLE_ISSUES = [
    { title: 'Password reset email never arrives', priority: 'critical', severity: 'critical' },
    { title: 'Dashboard chart renders empty on first load', priority: 'high', severity: 'major' },
    { title: 'Currency symbol wrong for EUR accounts', priority: 'medium', severity: 'minor' },
    { title: 'Session expires earlier than configured', priority: 'high', severity: 'major' },
];

const seedSampleData = async () => {
    const admin = await User.findOne({ role: 'admin' });
    const developer = await User.findOne({ role: 'developer' });

    if (!admin) {
        logger.warn('No admin account found — skipping sample data.');
        return;
    }

    for (const [index, sample] of SAMPLE_PROJECTS.entries()) {
        let project = await Project.findOne({ title: sample.title });
        if (!project) {
            project = await Project.create({
                ...sample,
                projectId: ids.projectId(),
                owner: admin._id,
                members: developer ? [developer._id] : [],
            });
            logger.info(`Created project: ${project.title}`);
        }

        // Two issues per project.
        for (const issueSample of SAMPLE_ISSUES.slice(index * 2, index * 2 + 2)) {
            const exists = await Issue.findOne({ title: issueSample.title, project: project._id });
            if (exists) continue;

            const issue = await Issue.create({
                ...issueSample,
                issueId: ids.issueId(),
                description: 'Reported during sample data seeding.',
                project: project._id,
                reportedBy: admin._id,
                assignedTo: developer ? developer._id : null,
            });

            await Comment.create({
                commentId: ids.commentId(),
                message: 'Thanks for the report — taking a look.',
                issue: issue._id,
                user: developer ? developer._id : admin._id,
            });

            logger.info(`Created issue: ${issue.title}`);
        }
    }
};

const main = async () => {
    config.validate();
    await database.connect();

    await ensureAdmin();

    const created = await seedDemoUsers({ force: true });
    if (created.length === 0) {
        logger.info('Demo accounts already present.');
    }

    if (process.argv.includes('--sample')) {
        await seedSampleData();
    }

    await database.disconnect();
    logger.info('Seeding complete.');
};

main().catch((error) => {
    process.stderr.write(`Seeding failed: ${error.message}\n`);
    process.exit(1);
});
