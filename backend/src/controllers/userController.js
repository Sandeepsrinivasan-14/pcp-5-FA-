const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../middleware/asyncHandler');
const { findByAnyId } = require('../utils/query');

const list = asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.status) filter.status = req.query.status;

    const users = await User.find(filter, 'name email role department status userId createdAt').sort({
        name: 1,
    });

    res.status(200).json({
        success: true,
        message: 'Users fetched successfully',
        data: users,
    });
});

const getOne = asyncHandler(async (req, res) => {
    const user = await findByAnyId(User, req.params.id, 'userId');
    if (!user) {
        throw ApiError.notFound('User not found');
    }
    res.status(200).json({ success: true, data: user });
});

module.exports = { list, getOne };
