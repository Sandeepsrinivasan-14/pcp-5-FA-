const axios = require('axios');
const Student = require('../models/Student');
const Company = require('../models/Company');
const Drive = require('../models/Drive');
const Application = require('../models/Application');

const syncData = async (req, res) => {
    try {
        const tokenResponse = await axios.post(${process.env.EXTERNAL_API_URL}/public/token, {
            studentId: req.body.studentId || 'SANDEEP SRINIVASAN S',
            password: req.body.password || ''
        });
        
        const token = tokenResponse.data.token;
        const dataResponse = await axios.get(${process.env.EXTERNAL_API_URL}/private/data, {
            headers: { Authorization: Bearer  }
        });
        
        const data = dataResponse.data;
        let inserted = { students: 0, companies: 0, drives: 0, applications: 0 };
        
        if (data.students) {
            for (const student of data.students) {
                const existing = await Student.findOne({ studentId: student.studentId });
                if (!existing && student.studentId && student.name) {
                    await Student.create({
                        studentId: student.studentId,
                        name: student.name?.trim(),
                        email: student.email?.toLowerCase(),
                        department: student.department,
                        cgpa: parseFloat(student.cgpa) || 0,
                        skills: student.skills || [],
                        graduationYear: student.graduationYear,
                        phone: student.phone,
                        status: student.status || 'active'
                    });
                    inserted.students++;
                }
            }
        }
        
        res.status(200).json({
            success: true,
            message: 'Database synced successfully',
            data: inserted
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { syncData };
