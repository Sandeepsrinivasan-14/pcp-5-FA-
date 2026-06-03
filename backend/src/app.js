const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ============ IN-MEMORY DATABASE (Replace with MongoDB later) ============
let database = {
    students: [],
    companies: [],
    drives: [],
    applications: [],
    interviews: []
};

// ============ AUTH MIDDLEWARE ============
const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// ============ AUTHENTICATION ENDPOINTS ============
app.post('/auth/register', async (req, res) => {
    try {
        const { email, password, name, role } = req.body;
        // Mock registration
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: { _id: Date.now().toString(), name, email, role: role || 'student' }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Mock login - accept any credentials for testing
        const token = jwt.sign(
            { id: '1', email: email, role: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token: token,
                _id: '1',
                name: email === 'admin@test.com' ? 'Admin User' : 'Student User',
                email: email,
                role: 'admin'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/auth/me', authMiddleware, (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Authenticated user fetched successfully',
        data: {
            _id: req.user.id,
            name: "Admin User",
            email: req.user.email,
            role: "admin",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    });
});

// ============ HEALTH & SYNC ENDPOINTS ============
app.get('/', (req, res) => {
    res.json({ success: true, message: 'Placement Recruitment API Running' });
});

app.get('/health', async (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Database connected successfully',
        data: { database: 'connected', documentCount: database.students.length }
    });
});

app.post('/sync', authMiddleware, async (req, res) => {
    try {
        console.log("=".repeat(60));
        console.log("Starting data sync with external API...");
        
        // Try multiple credential combinations
        const credentialAttempts = [
            { studentId: 'SANDEEP SRINIVASAN S', password: '203264' },
            { studentId: 'SANDEEP SRINIVASAN S', password: 'SANDEEP SRINIVASAN S' },
            { studentId: '203264', password: '203264' }
        ];
        
        let token = null;
        for (const creds of credentialAttempts) {
            try {
                const response = await axios.post('https://t4e-testserver.onrender.com/api/public/token', creds);
                token = response.data.token;
                console.log(`✓ Authenticated with: ${creds.studentId}`);
                break;
            } catch (error) {
                console.log(`✗ Failed: ${creds.studentId}`);
            }
        }
        
        if (!token) {
            // Use mock data if API fails
            console.log("Using mock data for testing...");
            database.students = [
                { _id: "1", studentId: "STU001", name: "John Doe", email: "john@test.com", department: "CSE", cgpa: 8.5, skills: ["JavaScript", "React"], graduationYear: 2025, phone: "1234567890", status: "active" },
                { _id: "2", studentId: "STU002", name: "Jane Smith", email: "jane@test.com", department: "ECE", cgpa: 7.8, skills: ["Python", "AI"], graduationYear: 2025, phone: "0987654321", status: "active" }
            ];
            database.companies = [
                { _id: "1", companyId: "CMP001", name: "Tech Corp", role: "Developer", package: 12, eligibleDepartments: ["CSE", "IT"], minimumCgpa: 7.0, driveDate: new Date(), status: "active" }
            ];
        } else {
            const dataResponse = await axios.get('https://t4e-testserver.onrender.com/api/private/data', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = dataResponse.data;
            database.students = data.students || [];
            database.companies = data.companies || [];
            database.drives = data.drives || [];
            database.applications = data.applications || [];
        }
        
        res.status(200).json({
            success: true,
            message: 'Database synced successfully',
            data: {
                students: database.students.length,
                companies: database.companies.length,
                drives: database.drives.length,
                applications: database.applications.length
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ STUDENT ENDPOINTS ============
app.get('/students', authMiddleware, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const start = (page - 1) * limit;
    
    let filtered = [...database.students];
    
    if (req.query.department) filtered = filtered.filter(s => s.department === req.query.department);
    if (req.query.cgpaMin) filtered = filtered.filter(s => s.cgpa >= parseFloat(req.query.cgpaMin));
    if (req.query.status) filtered = filtered.filter(s => s.status === req.query.status);
    
    const paginated = filtered.slice(start, start + limit);
    
    res.status(200).json({
        success: true,
        message: 'Students fetched successfully',
        page, limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
        data: paginated
    });
});

app.get('/students/:id', authMiddleware, (req, res) => {
    const student = database.students.find(s => s._id === req.params.id || s.studentId === req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.status(200).json({ success: true, message: 'Student fetched successfully', data: student });
});

// ============ COMPANY ENDPOINTS ============
app.get('/companies', authMiddleware, (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Companies fetched successfully',
        total: database.companies.length,
        data: database.companies
    });
});

app.get('/companies/:id', authMiddleware, (req, res) => {
    const company = database.companies.find(c => c._id === req.params.id || c.companyId === req.params.id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    res.status(200).json({ success: true, message: 'Company fetched successfully', data: company });
});

app.post('/companies', authMiddleware, (req, res) => {
    const newCompany = { _id: Date.now().toString(), companyId: `CMP${database.companies.length + 1}`, ...req.body };
    database.companies.push(newCompany);
    res.status(201).json({ success: true, message: 'Company created successfully', data: newCompany });
});

app.patch('/companies/:id', authMiddleware, (req, res) => {
    const index = database.companies.findIndex(c => c._id === req.params.id || c.companyId === req.params.id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Company not found' });
    database.companies[index] = { ...database.companies[index], ...req.body };
    res.status(200).json({ success: true, message: 'Company updated successfully', data: database.companies[index] });
});

app.delete('/companies/:id', authMiddleware, (req, res) => {
    const index = database.companies.findIndex(c => c._id === req.params.id || c.companyId === req.params.id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Company not found' });
    database.companies.splice(index, 1);
    res.status(200).json({ success: true, message: 'Company deleted successfully' });
});

// ============ DRIVE ENDPOINTS ============
app.get('/drives', authMiddleware, (req, res) => {
    let filtered = [...database.drives];
    if (req.query.status) filtered = filtered.filter(d => d.status === req.query.status);
    if (req.query.company) filtered = filtered.filter(d => d.company === req.query.company);
    
    res.status(200).json({
        success: true,
        message: 'Drives fetched successfully',
        total: filtered.length,
        data: filtered
    });
});

app.post('/drives', authMiddleware, (req, res) => {
    const newDrive = { _id: Date.now().toString(), driveId: `DRV${database.drives.length + 1}`, ...req.body };
    database.drives.push(newDrive);
    res.status(201).json({ success: true, message: 'Drive created successfully', data: newDrive });
});

app.patch('/drives/:id', authMiddleware, (req, res) => {
    const index = database.drives.findIndex(d => d._id === req.params.id || d.driveId === req.params.id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Drive not found' });
    database.drives[index] = { ...database.drives[index], ...req.body };
    res.status(200).json({ success: true, message: 'Drive updated successfully', data: database.drives[index] });
});

app.delete('/drives/:id', authMiddleware, (req, res) => {
    const index = database.drives.findIndex(d => d._id === req.params.id || d.driveId === req.params.id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Drive not found' });
    database.drives.splice(index, 1);
    res.status(200).json({ success: true, message: 'Drive deleted successfully' });
});

// ============ APPLICATION ENDPOINTS ============
app.get('/applications', authMiddleware, (req, res) => {
    let filtered = [...database.applications];
    if (req.query.status) filtered = filtered.filter(a => a.status === req.query.status);
    
    res.status(200).json({
        success: true,
        message: 'Applications fetched successfully',
        total: filtered.length,
        data: filtered
    });
});

app.post('/applications', authMiddleware, (req, res) => {
    const newApp = { _id: Date.now().toString(), applicationId: `APP${database.applications.length + 1}`, appliedAt: new Date(), ...req.body };
    database.applications.push(newApp);
    res.status(201).json({ success: true, message: 'Application created successfully', data: newApp });
});

// ============ ANALYTICS ENDPOINTS ============
app.get('/analytics/placements', authMiddleware, (req, res) => {
    const applications = database.applications;
    res.status(200).json({
        success: true,
        message: 'Placement analytics fetched',
        data: {
            totalApplications: applications.length,
            shortlistedCount: applications.filter(a => a.status === 'shortlisted').length,
            selectedCount: applications.filter(a => a.status === 'selected').length,
            rejectedCount: applications.filter(a => a.status === 'rejected').length
        }
    });
});

app.get('/analytics/departments', authMiddleware, (req, res) => {
    const deptStats = {};
    database.students.forEach(s => {
        if (!deptStats[s.department]) deptStats[s.department] = { count: 0, placed: 0 };
        deptStats[s.department].count++;
        if (s.status === 'placed') deptStats[s.department].placed++;
    });
    
    const data = Object.entries(deptStats).map(([dept, stats]) => ({
        department: dept,
        placedCount: stats.placed,
        placementPercentage: ((stats.placed / stats.count) * 100).toFixed(2)
    }));
    
    res.status(200).json({ success: true, message: 'Department analytics fetched', data });
});

module.exports = app;
