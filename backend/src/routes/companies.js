const express = require('express');
const Company = require('../models/Company');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
    try {
        const companies = await Company.find();
        res.status(200).json({ 
            success: true, 
            message: 'Companies fetched successfully', 
            total: companies.length, 
            data: companies 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/', authMiddleware, async (req, res) => {
    try {
        const company = await Company.create(req.body);
        res.status(201).json({ 
            success: true, 
            message: 'Company created successfully', 
            data: company 
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.patch('/:id', authMiddleware, async (req, res) => {
    try {
        const company = await Company.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        );
        if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
        res.status(200).json({ 
            success: true, 
            message: 'Company updated successfully', 
            data: company 
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const company = await Company.findByIdAndDelete(req.params.id);
        if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
        res.status(200).json({ 
            success: true, 
            message: 'Company deleted successfully' 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
