const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const ApiError = require('../utils/ApiError');
const ids = require('../utils/ids');
const asyncHandler = require('../middleware/asyncHandler');
const { signToken } = require('../middleware/auth');

const publicUser = (user) => ({
    _id: user._id,
    userId: user.userId,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    createdAt: user.createdAt,
});

const register = asyncHandler(async (req, res) => {
    const { name, email, password, role, department } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw ApiError.conflict('Email already registered');
    }

    const user = await User.create({
        userId: ids.userId(),
        name,
        email,
        password,
        role,
        ...(department ? { department } : {}),
    });

    await ActivityLog.create({
        action: 'REGISTER_USER',
        details: `New user registered: ${user.name} (${user.role})`,
        user: user._id,
    });

    res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: publicUser(user),
    });
});

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    // Compare unconditionally so a missing account and a wrong password take
    // the same amount of time, and report the same message either way.
    const isValidPassword = user ? await user.comparePassword(password) : false;

    if (!user || !isValidPassword) {
        throw ApiError.unauthorized('Invalid credentials');
    }
    if (user.status === 'inactive') {
        throw ApiError.forbidden('Account is inactive');
    }

    const token = signToken(user);

    await ActivityLog.create({
        action: 'LOGIN_USER',
        details: `User logged in: ${user.name}`,
        user: user._id,
    });

    res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
            token,
            _id: user._id,
            userId: user.userId,
            name: user.name,
            email: user.email,
            role: user.role,
        },
    });
});

const me = asyncHandler(async (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Authenticated user fetched successfully',
        data: publicUser(req.user),
    });
});

module.exports = { register, login, me };
