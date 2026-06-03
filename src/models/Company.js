const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    companyId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    role: String,
    package: Number,
    eligibleDepartments: [String],
    minimumCgpa: Number,
    driveDate: Date,
    status: { type: String, enum: ['active', 'upcoming', 'completed'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
