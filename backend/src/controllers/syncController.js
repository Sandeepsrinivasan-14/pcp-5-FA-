const axios = require('axios');

const syncData = async (req, res) => {
    try {
        console.log("Starting data sync with external API...");
        
        // Step 1: Get token from external API with correct credentials
        const tokenResponse = await axios.post('https://t4e-testserver.onrender.com/api/public/token', {
            studentId: 'SANDEEP SRINIVASAN S',
            password: '203264'  // Correct password from email
        });
        
        const token = tokenResponse.data.token;
        console.log("Token obtained successfully");
        
        // Step 2: Fetch dataset using token
        const dataResponse = await axios.get('https://t4e-testserver.onrender.com/api/private/data', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const data = dataResponse.data;
        console.log("Data fetched successfully");
        console.log("Data structure:", Object.keys(data));
        
        // Step 3: Validate and sanitize data
        let validatedData = {
            students: [],
            companies: [],
            drives: [],
            applications: []
        };
        
        // Validate students
        if (data.students && Array.isArray(data.students)) {
            validatedData.students = data.students.filter(student => 
                student.studentId && student.name && student.email && student.department
            ).map(student => ({
                ...student,
                cgpa: parseFloat(student.cgpa) || 0,
                email: student.email?.toLowerCase(),
                name: student.name?.trim()
            }));
        }
        
        // Validate companies
        if (data.companies && Array.isArray(data.companies)) {
            validatedData.companies = data.companies.filter(company => 
                company.companyId && company.name
            );
        }
        
        // Validate drives
        if (data.drives && Array.isArray(data.drives)) {
            validatedData.drives = data.drives.filter(drive => 
                drive.driveId && drive.company
            );
        }
        
        // Validate applications
        if (data.applications && Array.isArray(data.applications)) {
            validatedData.applications = data.applications.filter(app => 
                app.applicationId && app.student && app.drive
            );
        }
        
        // Store validated data globally
        global.syncedData = validatedData;
        
        const inserted = {
            students: validatedData.students.length,
            companies: validatedData.companies.length,
            drives: validatedData.drives.length,
            applications: validatedData.applications.length
        };
        
        console.log("Sync completed:", inserted);
        
        res.status(200).json({
            success: true,
            message: 'Database synced successfully',
            data: inserted
        });
        
    } catch (error) {
        console.error("Sync error:", error.response?.data || error.message);
        res.status(500).json({ 
            success: false, 
            message: error.response?.data?.message || error.message 
        });
    }
};

module.exports = { syncData };
