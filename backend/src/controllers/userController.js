const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
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

/**
 * Administrator maintenance of an account: role, department and active status.
 * Passwords are deliberately not settable here — a user changes their own via
 * PATCH /auth/password, so an administrator can never silently take over an
 * account by overwriting its password.
 */
const update = asyncHandler(async (req, res) => {
    const user = await findByAnyId(User, req.params.id, 'userId');
    if (!user) {
        throw ApiError.notFound('User not found');
    }

    const { role, department, status, name } = req.body;

    // Removing the last administrator would leave nobody able to administer the
    // workspace, including nobody able to undo it.
    const isDemotingAdmin = user.role === 'admin' && role && role !== 'admin';
    const isDeactivatingAdmin = user.role === 'admin' && status === 'inactive';

    if (isDemotingAdmin || isDeactivatingAdmin) {
        const activeAdmins = await User.countDocuments({ role: 'admin', status: 'active' });
        if (activeAdmins <= 1) {
            throw ApiError.badRequest(
                'This is the only active administrator. Promote another account first.'
            );
        }
    }

    if (role !== undefined) user.role = role;
    if (department !== undefined) user.department = department;
    if (status !== undefined) user.status = status;
    if (name !== undefined) user.name = name;

    await user.save();

    await ActivityLog.create({
        action: 'UPDATE_USER',
        details: `Updated ${user.name} (${user.userId})`,
        user: req.user._id,
    });

    res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: user,
    });
});

module.exports = { list, getOne, update };
