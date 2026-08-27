/**
 * Screenshots the built SPA against a mocked API, so the README can show the
 * real interface without standing up a database.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BUILD = path.resolve(__dirname, '../frontend/build');
const OUT = path.resolve(__dirname, 'screenshots');
const PORT = 4599;

const MIME = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml', '.txt': 'text/plain',
};

const serve = () =>
    new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            const urlPath = req.url.split('?')[0];
            let filePath = path.join(BUILD, urlPath);
            if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
                filePath = path.join(BUILD, 'index.html');
            }
            res.setHeader('Content-Type', MIME[path.extname(filePath)] || 'application/octet-stream');
            fs.createReadStream(filePath).pipe(res);
        });
        server.listen(PORT, () => resolve(server));
    });

// --- Fixture data -------------------------------------------------------

const users = [
    { _id: '650000000000000000000001', userId: 'usr-avery', name: 'Avery Bhatt', email: 'avery@northwind.dev', role: 'admin', department: 'Engineering', status: 'active' },
    { _id: '650000000000000000000002', userId: 'usr-priya', name: 'Priya Raghavan', email: 'priya@northwind.dev', role: 'manager', department: 'Product', status: 'active' },
    { _id: '650000000000000000000003', userId: 'usr-marco', name: 'Marco Silveira', email: 'marco@northwind.dev', role: 'developer', department: 'Platform', status: 'active' },
    { _id: '650000000000000000000004', userId: 'usr-lena', name: 'Lena Okafor', email: 'lena@northwind.dev', role: 'developer', department: 'Platform', status: 'active' },
    { _id: '650000000000000000000005', userId: 'usr-tomas', name: 'Tomás Ferreira', email: 'tomas@northwind.dev', role: 'tester', department: 'Quality', status: 'active' },
];

const byId = Object.fromEntries(users.map((u) => [u.userId, u]));

const projects = [
    { _id: '660000000000000000000001', projectId: 'PRJ-checkout', title: 'Checkout Experience', description: 'Cart, payment capture and order confirmation.', category: 'Web', status: 'active', owner: byId['usr-priya'], members: [byId['usr-marco'], byId['usr-lena']], startDate: '2026-02-03T00:00:00.000Z', createdAt: '2026-02-03T00:00:00.000Z' },
    { _id: '660000000000000000000002', projectId: 'PRJ-identity', title: 'Identity & Access', description: 'Authentication, sessions and role management.', category: 'Platform', status: 'active', owner: byId['usr-avery'], members: [byId['usr-marco']], startDate: '2026-01-12T00:00:00.000Z', createdAt: '2026-01-12T00:00:00.000Z' },
    { _id: '660000000000000000000003', projectId: 'PRJ-insights', title: 'Reporting & Insights', description: 'Scheduled exports and the analytics warehouse feed.', category: 'Data', status: 'on-hold', owner: byId['usr-priya'], members: [byId['usr-lena']], startDate: '2026-03-20T00:00:00.000Z', createdAt: '2026-03-20T00:00:00.000Z' },
];

const mkIssue = (n, over) => ({
    _id: `67000000000000000000000${n}`,
    issueId: `ISS-${1000 + n}`,
    description: 'Reproduced on staging with a clean session. Steps and logs attached to the thread below.',
    reportedBy: byId['usr-tomas'],
    severity: 'major',
    dueDate: null,
    createdAt: `2026-08-${10 + n}T09:24:00.000Z`,
    updatedAt: `2026-08-${12 + n}T14:02:00.000Z`,
    ...over,
});

const issues = [
    mkIssue(1, { title: 'Payment retry charges the customer twice', project: projects[0], assignedTo: byId['usr-marco'], priority: 'critical', severity: 'critical', status: 'in-progress' }),
    mkIssue(2, { title: 'Session expires 20 minutes earlier than configured', project: projects[1], assignedTo: byId['usr-lena'], priority: 'high', status: 'testing' }),
    mkIssue(3, { title: 'Discount code field rejects valid lowercase input', project: projects[0], assignedTo: byId['usr-lena'], priority: 'medium', severity: 'minor', status: 'open' }),
    mkIssue(4, { title: 'CSV export truncates rows beyond 10,000', project: projects[2], assignedTo: byId['usr-marco'], priority: 'high', status: 'open' }),
    mkIssue(5, { title: 'Password reset email never arrives for Outlook domains', project: projects[1], assignedTo: byId['usr-marco'], priority: 'critical', severity: 'critical', status: 'resolved' }),
    mkIssue(6, { title: 'Order confirmation shows the wrong currency symbol', project: projects[0], assignedTo: byId['usr-lena'], priority: 'low', severity: 'minor', status: 'closed' }),
    mkIssue(7, { title: 'Role change does not take effect until re-login', project: projects[1], assignedTo: null, priority: 'medium', status: 'open' }),
    mkIssue(8, { title: 'Dashboard chart renders empty on first paint', project: projects[2], assignedTo: byId['usr-lena'], priority: 'medium', status: 'in-progress' }),
];

const comments = [
    { _id: '680000000000000000000001', commentId: 'COM-2001', message: 'Confirmed against the sandbox gateway — the retry fires before the idempotency key is persisted.', user: byId['usr-marco'], issue: issues[0], createdAt: '2026-08-18T10:12:00.000Z' },
    { _id: '680000000000000000000002', commentId: 'COM-2002', message: 'Reproduced on Firefox 141 and Safari 18. Chrome is unaffected.', user: byId['usr-tomas'], issue: issues[1], createdAt: '2026-08-19T08:41:00.000Z' },
    { _id: '680000000000000000000003', commentId: 'COM-2003', message: 'Moving this to testing — fix is on staging behind the billing flag.', user: byId['usr-lena'], issue: issues[1], createdAt: '2026-08-20T16:05:00.000Z' },
];

const dashboard = {
    statusStats: [
        { _id: 'open', count: 3 }, { _id: 'in-progress', count: 2 },
        { _id: 'testing', count: 1 }, { _id: 'resolved', count: 1 }, { _id: 'closed', count: 1 },
    ],
    priorityStats: [
        { _id: 'critical', count: 2 }, { _id: 'high', count: 2 },
        { _id: 'medium', count: 3 }, { _id: 'low', count: 1 },
    ],
    projectStats: [
        { _id: projects[0]._id, count: 3, title: 'Checkout Experience', projectId: 'PRJ-checkout' },
        { _id: projects[1]._id, count: 3, title: 'Identity & Access', projectId: 'PRJ-identity' },
        { _id: projects[2]._id, count: 2, title: 'Reporting & Insights', projectId: 'PRJ-insights' },
    ],
    developerStats: [
        { _id: byId['usr-marco']._id, count: 1, name: 'Marco Silveira', email: 'marco@northwind.dev', role: 'developer' },
        { _id: byId['usr-lena']._id, count: 1, name: 'Lena Okafor', email: 'lena@northwind.dev', role: 'developer' },
    ],
    activityLogs: [
        { _id: 'a1', action: 'UPDATE_STATUS', details: 'Issue ISS-1002: in-progress → testing', previousStatus: 'in-progress', newStatus: 'testing', user: byId['usr-lena'], timestamp: '2026-08-20T16:04:00.000Z' },
        { _id: 'a2', action: 'ADD_COMMENT', details: 'Comment added by Marco Silveira', user: byId['usr-marco'], timestamp: '2026-08-18T10:12:00.000Z' },
        { _id: 'a3', action: 'ASSIGN_ISSUE', details: 'Issue ISS-1004 assignment updated', user: byId['usr-priya'], timestamp: '2026-08-17T11:30:00.000Z' },
        { _id: 'a4', action: 'CREATE_ISSUE', details: 'Created issue: CSV export truncates rows beyond 10,000 (ISS-1004)', user: byId['usr-tomas'], timestamp: '2026-08-17T09:02:00.000Z' },
        { _id: 'a5', action: 'CREATE_PROJECT', details: 'Created project: Reporting & Insights (PRJ-insights)', user: byId['usr-priya'], timestamp: '2026-08-15T13:45:00.000Z' },
    ],
};

const ok = (data, extra = {}) => ({ success: true, message: 'OK', data, ...extra });

const ROUTES = [
    [/\/auth\/me$/, () => ok(byId['usr-avery'])],
    [/\/analytics\/dashboard$/, () => ok(dashboard)],
    [/\/analytics\/issues$/, () => ok({ totalIssues: 8, openIssues: 3, resolvedIssues: 1, closedIssues: 1 })],
    [/\/issues\/[^/]+$/, (url) => {
        const found = issues.find((i) => url.includes(i._id) || url.includes(i.issueId)) || issues[0];
        return ok({ ...found, comments: comments.filter((c) => c.issue._id === found._id) });
    }],
    [/\/issues(\?|$)/, () => ok(issues, { total: issues.length, page: 1, limit: 100, totalPages: 1 })],
    [/\/projects(\?|$)/, () => ok(projects)],
    [/\/users(\?|$)/, () => ok(users)],
    [/\/comments(\?|$)/, () => ok(comments)],
];

const shoot = async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const server = await serve();
    const browser = await chromium.launch(
        process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
    );

    const capture = async (name, route, { width = 1440, height = 900, wait = 1200 } = {}) => {
        const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
        await context.route('**/api/**', async (r) => {
            const url = r.request().url();
            const match = ROUTES.find(([re]) => re.test(url));
            await r.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(match ? match[1](url) : ok([])),
            });
        });

        const page = await context.newPage();
        await page.addInitScript(() => {
            window.localStorage.setItem('token', 'screenshot-session-token');
        });
        await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(wait);
        await page.screenshot({ path: path.join(OUT, `${name}.png`) });
        await context.close();
        process.stdout.write(`  captured ${name}.png\n`);
    };

    // The login page must not carry a session.
    const loginCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    const loginPage = await loginCtx.newPage();
    await loginCtx.route('**/api/**', (r) =>
        r.fulfill({ status: 401, contentType: 'application/json', body: '{"success":false}' })
    );
    await loginPage.goto(`http://localhost:${PORT}/login`, { waitUntil: 'networkidle' });
    await loginPage.waitForTimeout(800);
    await loginPage.screenshot({ path: path.join(OUT, 'login.png') });
    await loginCtx.close();
    process.stdout.write('  captured login.png\n');

    await capture('dashboard', '/dashboard', { height: 1240 });
    await capture('issues', '/issues');
    await capture('projects', '/projects', { height: 600 });
    await capture('team', '/users', { height: 545 });
    await capture('discussions', '/comments', { height: 900 });

    await browser.close();
    server.close();
};

shoot().catch((error) => {
    process.stderr.write(`${error.stack}\n`);
    process.exit(1);
});
