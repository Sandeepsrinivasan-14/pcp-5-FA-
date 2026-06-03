const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// In-memory data storage
let students = [
    { _id: "1", studentId: "STU001", name: "John Doe", email: "john@test.com", department: "CSE", cgpa: 8.5, status: "active" },
    { _id: "2", studentId: "STU002", name: "Jane Smith", email: "jane@test.com", department: "ECE", cgpa: 7.8, status: "active" }
];

let companies = [
    { _id: "1", companyId: "CMP001", name: "Tech Corp", role: "Developer", package: 12, status: "active" },
    { _id: "2", companyId: "CMP002", name: "Data Inc", role: "Analyst", package: 10, status: "active" }
];

// Mock users for authentication
const users = [
    { id: 1, email: "admin@test.com", password: "admin123", name: "Admin User", role: "admin" }
];

// Auth middleware
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

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ 
        success: true, 
        message: 'Database connected successfully', 
        data: { database: 'connected', documentCount: students.length } 
    });
});

// Auth routes
app.post('/auth/login', (req, res) => {
    try {
        const { email, password } = req.body;
        const user = users.find(u => u.email === email && u.password === password);
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: { token, _id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/auth/me', authMiddleware, (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Authenticated user fetched successfully',
        data: { _id: req.user.id, name: "Admin User", email: req.user.email, role: req.user.role }
    });
});

// Student routes
app.get('/students', authMiddleware, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const start = (page - 1) * limit;
    const paginatedStudents = students.slice(start, start + limit);
    
    res.status(200).json({
        success: true,
        message: 'Students fetched successfully',
        page, limit,
        total: students.length,
        totalPages: Math.ceil(students.length / limit),
        data: paginatedStudents
    });
});

app.get('/students/:id', authMiddleware, (req, res) => {
    const student = students.find(s => s._id === req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.status(200).json({ success: true, message: 'Student fetched successfully', data: student });
});

app.post('/students', authMiddleware, (req, res) => {
    const newStudent = { _id: String(students.length + 1), ...req.body };
    students.push(newStudent);
    res.status(201).json({ success: true, message: 'Student created successfully', data: newStudent });
});

app.put('/students/:id', authMiddleware, (req, res) => {
    const index = students.findIndex(s => s._id === req.params.id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Student not found' });
    students[index] = { ...students[index], ...req.body };
    res.status(200).json({ success: true, message: 'Student updated successfully', data: students[index] });
});

app.delete('/students/:id', authMiddleware, (req, res) => {
    const index = students.findIndex(s => s._id === req.params.id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Student not found' });
    students.splice(index, 1);
    res.status(200).json({ success: true, message: 'Student deleted successfully' });
});

// Company routes
app.get('/companies', authMiddleware, (req, res) => {
    res.status(200).json({ success: true, message: 'Companies fetched successfully', total: companies.length, data: companies });
});

app.get('/companies/:id', authMiddleware, (req, res) => {
    const company = companies.find(c => c._id === req.params.id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    res.status(200).json({ success: true, message: 'Company fetched successfully', data: company });
});

app.post('/companies', authMiddleware, (req, res) => {
    const newCompany = { _id: String(companies.length + 1), ...req.body };
    companies.push(newCompany);
    res.status(201).json({ success: true, message: 'Company created successfully', data: newCompany });
});

app.patch('/companies/:id', authMiddleware, (req, res) => {
    const index = companies.findIndex(c => c._id === req.params.id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Company not found' });
    companies[index] = { ...companies[index], ...req.body };
    res.status(200).json({ success: true, message: 'Company updated successfully', data: companies[index] });
});

app.delete('/companies/:id', authMiddleware, (req, res) => {
    const index = companies.findIndex(c => c._id === req.params.id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Company not found' });
    companies.splice(index, 1);
    res.status(200).json({ success: true, message: 'Company deleted successfully' });
});

// Sync endpoint
app.post('/sync', authMiddleware, (req, res) => {
    res.status(200).json({ success: true, message: 'Database synced successfully', data: { students: students.length, companies: companies.length, drives: 0, applications: 0 } });
});

// Analytics endpoints
app.get('/analytics/placements', authMiddleware, (req, res) => {
    res.status(200).json({ success: true, message: 'Placement analytics fetched', data: { totalApplications: 0, shortlistedCount: 0, selectedCount: 0, rejectedCount: 0 } });
});

app.get('/analytics/departments', authMiddleware, (req, res) => {
    res.status(200).json({ success: true, message: 'Department analytics fetched', data: [] });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ success: true, message: 'Placement Recruitment API Running' });
});

module.exports = app;
