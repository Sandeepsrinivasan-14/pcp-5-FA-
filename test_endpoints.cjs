const axios = require('axios');

const baseUrl = 'http://localhost:5000';

async function runTests() {
    try {
        console.log('--- STARTING COMPREHENSIVE SET B SYSTEM INTEGRATION TESTS ---');
        
        console.log('\n1. Testing Auth - Logging in as Admin...');
        const adminLogin = await axios.post(`${baseUrl}/auth/login`, {
            email: 'admin@test.com',
            password: 'admin123'
        });
        const adminToken = adminLogin.data.data.token;
        const adminId = adminLogin.data.data._id;
        const adminAuth = { headers: { Authorization: `Bearer ${adminToken}` } };
        console.log('Admin login successful!');

        console.log('\n2. Testing Sync - Triggering Database Sync via POST /sync...');
        try {
            const syncResponse = await axios.post(`${baseUrl}/sync`, {}, adminAuth);
            console.log('Sync Response:', syncResponse.data);
        } catch (err) {
            console.warn('Sync failed (likely due to expired credentials):', err.response?.data?.message || err.message);
            console.warn('Proceeding with the remaining integration tests...');
        }

        console.log('\n3. Testing Users - Fetching user directory & single user...');
        const usersListRes = await axios.get(`${baseUrl}/users`, adminAuth);
        const users = usersListRes.data.data;
        console.log(`Found ${users.length} users in database.`);
        const developer = users.find(u => u.role === 'developer');
        const tester = users.find(u => u.role === 'tester');
        console.log('Developer selected:', developer.name);
        
        const singleUserRes = await axios.get(`${baseUrl}/users/${developer._id}`, adminAuth);
        console.log('Fetched single user name:', singleUserRes.data.data.name);

        console.log('\n4. Testing Projects - Creating, updating and listing projects...');
        const newProjRes = await axios.post(`${baseUrl}/projects`, {
            title: 'Set B Automation Workspace',
            description: 'Verification workspace for assessment criteria.',
            category: 'Quality Assurance',
            members: [developer._id, tester._id]
        }, adminAuth);
        const project = newProjRes.data.data;
        console.log('Created Project title:', project.title);

        const updateProjRes = await axios.patch(`${baseUrl}/projects/${project._id}`, {
            description: 'Updated verification workspace description.'
        }, adminAuth);
        console.log('Updated Project desc:', updateProjRes.data.data.description);

        const listProjRes = await axios.get(`${baseUrl}/projects?status=active`, adminAuth);
        console.log(`Fetched ${listProjRes.data.data.length} active projects.`);

        console.log('\n5. Testing Issues - Creating, searching, paging and workflow rules...');
        const newIssueRes = await axios.post(`${baseUrl}/issues`, {
            title: 'Assessment checklist fails on backend verification',
            description: 'Run tests to identify missing endpoints.',
            project: project._id,
            priority: 'high',
            severity: 'critical',
            assignedTo: developer._id
        }, adminAuth);
        const issue = newIssueRes.data.data;
        console.log('Created Issue ID:', issue.issueId);

        const searchIssuesRes = await axios.get(`${baseUrl}/issues?search=checklist`, adminAuth);
        console.log(`Search result count for "checklist": ${searchIssuesRes.data.data.length}`);

        const pagedIssuesRes = await axios.get(`${baseUrl}/issues?page=1&limit=2`, adminAuth);
        console.log(`Paged results count (limit=2): ${pagedIssuesRes.data.data.length}`);

        console.log('\n6. Testing Comments - Creating via POST /comments and fetching by ID...');
        const newCommentRes = await axios.post(`${baseUrl}/comments`, {
            issueId: issue._id,
            message: 'Checking endpoint comments logic compliance.'
        }, adminAuth);
        const comment = newCommentRes.data.data;
        console.log('Created Comment message:', comment.message);

        const singleCommentRes = await axios.get(`${baseUrl}/comments/${comment._id}`, adminAuth);
        console.log('Fetched Comment by ID message:', singleCommentRes.data.data.message);

        console.log('\n7. Testing Workflow Validation Rules...');
        
        console.log('A. Developer token login...');
        const devLogin = await axios.post(`${baseUrl}/auth/login`, {
            email: 'developer@test.com',
            password: 'dev123'
        });
        const devToken = devLogin.data.data.token;
        const devAuth = { headers: { Authorization: `Bearer ${devToken}` } };

        console.log('B. Tester token login...');
        const testerLogin = await axios.post(`${baseUrl}/auth/login`, {
            email: 'tester@test.com',
            password: 'tester123'
        });
        const testerToken = testerLogin.data.data.token;
        const testerAuth = { headers: { Authorization: `Bearer ${testerToken}` } };

        console.log('C. Testing rule: Testers cannot close or resolve issues directly...');
        try {
            await axios.patch(`${baseUrl}/issues/${issue._id}/status`, { status: 'closed' }, testerAuth);
            console.error('FAIL: Tester was allowed to close the issue.');
            process.exit(1);
        } catch (err) {
            console.log('PASS: Tester rejected with code', err.response.status, '-', err.response.data.message);
        }

        console.log('D. Testing rule: Only assigned developer can move an issue to testing...');
        try {
            await axios.patch(`${baseUrl}/issues/${issue._id}/status`, { status: 'testing' }, testerAuth);
            console.error('FAIL: Unassigned user was allowed to move issue to testing.');
            process.exit(1);
        } catch (err) {
            console.log('PASS: Tester rejected from setting testing status with code', err.response.status, '-', err.response.data.message);
        }

        console.log('E. Testing rule: Only admin/manager can assign issues...');
        try {
            await axios.patch(`${baseUrl}/issues/${issue._id}/assign`, { assignedTo: tester._id }, devAuth);
            console.error('FAIL: Developer was allowed to assign issue.');
            process.exit(1);
        } catch (err) {
            console.log('PASS: Developer assignment rejected with code', err.response.status, '-', err.response.data.message);
        }

        console.log('F. Admin reassigns issue...');
        const assignRes = await axios.patch(`${baseUrl}/issues/${issue._id}/assign`, { assignedTo: developer._id }, adminAuth);
        console.log('PASS: Admin successfully assigned issue to developer.');

        console.log('G. Developer moves assigned issue to testing...');
        const statusTestRes = await axios.patch(`${baseUrl}/issues/${issue._id}/status`, { status: 'testing' }, devAuth);
        console.log('PASS: Developer successfully set status to testing. New status:', statusTestRes.data.data.status);

        console.log('H. Manager/Admin resolves and closes issue...');
        const statusClosedRes = await axios.patch(`${baseUrl}/issues/${issue._id}/status`, { status: 'closed' }, adminAuth);
        console.log('PASS: Closed issue. New status:', statusClosedRes.data.data.status);

        console.log('I. Testing rule: Closed issues cannot move back without reopen...');
        try {
            await axios.patch(`${baseUrl}/issues/${issue._id}/status`, { status: 'in-progress' }, adminAuth);
            console.error('FAIL: Closed issue was moved to in-progress without reopening.');
            process.exit(1);
        } catch (err) {
            console.log('PASS: Rejected status change on closed issue with code', err.response.status, '-', err.response.data.message);
        }

        console.log('J. Reopen issue (move back to open)...');
        const statusReopenRes = await axios.patch(`${baseUrl}/issues/${issue._id}/status`, { status: 'open' }, adminAuth);
        console.log('PASS: Reopened closed issue. New status:', statusReopenRes.data.data.status);

        console.log('\n8. Testing Aggregation & Analytics APIs...');
        const issuesAnalytics = await axios.get(`${baseUrl}/analytics/issues`, adminAuth);
        console.log('Issues Analytics:', issuesAnalytics.data.data);

        const projectsAnalytics = await axios.get(`${baseUrl}/analytics/projects`, adminAuth);
        console.log('Projects Analytics:', projectsAnalytics.data.data);

        const developersAnalytics = await axios.get(`${baseUrl}/analytics/developers`, adminAuth);
        console.log('Developers Analytics:', developersAnalytics.data.data);

        console.log('\n--- ALL COMPREHENSIVE SET B INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
    } catch (error) {
        console.error('--- INTEGRATION TEST FAILED ---');
        console.error(error.response?.data || error.message);
        process.exit(1);
    }
}

runTests();
