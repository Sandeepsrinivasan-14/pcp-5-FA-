const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    studentId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    department: { type: String, required: true },
    cgpa: { type: Number, required: true, min: 0, max: 10 },
    skills: [String],
    graduationYear: Number,
    phone: String,
    status: { type: String, enum: ['active', 'inactive', 'placed'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
