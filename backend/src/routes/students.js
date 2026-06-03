const express = require('express');
const Student = require('../models/Student');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        let filter = {};
        if (req.query.department) filter.department = req.query.department;
        if (req.query.status) filter.status = req.query.status;
        
        const total = await Student.countDocuments(filter);
        const students = await Student.find(filter).skip(skip).limit(limit);
        
        res.status(200).json({
            success: true,
            message: 'Students fetched successfully',
            page: page,
            limit: limit,
            total: total,
            totalPages: Math.ceil(total / limit),
            data: students
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
        res.status(200).json({ success: true, message: 'Student fetched successfully', data: student });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
