const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
    {
        userId: { type: String, unique: true, sparse: true, trim: true },
        name: { type: String, required: true, trim: true, maxlength: 120 },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            // Normalising here means `Admin@Test.com` and `admin@test.com` can
            // never become two accounts, and login lookups always match.
            lowercase: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
        },
        password: { type: String, required: true, minlength: 8, select: true },
        role: {
            type: String,
            enum: ['admin', 'manager', 'developer', 'tester'],
            required: true,
            default: 'developer',
        },
        department: { type: String, default: 'General', trim: true },
        status: { type: String, enum: ['active', 'inactive'], default: 'active' },
        createdAt: { type: Date, default: Date.now },
    },
    {
        toJSON: {
            transform: (doc, ret) => {
                delete ret.password;
                delete ret.__v;
                return ret;
            },
        },
    }
);

userSchema.pre('save', async function hashPassword() {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
