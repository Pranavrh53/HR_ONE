const LeaveRequest = require('../models/LeaveRequest');
const Employee = require('../models/Employee');

// @desc    Apply for leave
// @route   POST /api/leaves
const applyLeave = async (req, res) => {
    try {
        const employee = await Employee.findOne({ user: req.user._id });
        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee record not found' });
        }

        const { leaveType, startDate, endDate, reason } = req.body;

        const leave = await LeaveRequest.create({
            employee: employee._id,
            user: req.user._id,
            leaveType,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            reason,
        });

        res.status(201).json({ success: true, data: leave });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get my leaves
// @route   GET /api/leaves/my
const getMyLeaves = async (req, res) => {
    try {
        const employee = await Employee.findOne({ user: req.user._id });
        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee record not found' });
        }

        const leaves = await LeaveRequest.find({ employee: employee._id })
            .populate('approvedBy', 'name')
            .sort({ createdAt: -1 });

        // Leave balance calculation
        const year = new Date().getFullYear();
        const startOfYear = new Date(year, 0, 1);
        const approvedLeaves = await LeaveRequest.find({
            employee: employee._id,
            status: 'approved',
            startDate: { $gte: startOfYear },
        });

        const usedLeaves = {
            casual: 0, sick: 0, earned: 0, total: 0,
        };

        approvedLeaves.forEach(l => {
            usedLeaves[l.leaveType] = (usedLeaves[l.leaveType] || 0) + l.totalDays;
            usedLeaves.total += l.totalDays;
        });

        const leaveBalance = {
            casual: { total: 12, used: usedLeaves.casual, remaining: 12 - usedLeaves.casual },
            sick: { total: 10, used: usedLeaves.sick, remaining: 10 - usedLeaves.sick },
            earned: { total: 15, used: usedLeaves.earned, remaining: 15 - usedLeaves.earned },
        };

        res.status(200).json({
            success: true,
            count: leaves.length,
            leaveBalance,
            data: leaves,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all leave requests (HR/Admin/Manager)
// @route   GET /api/leaves
const getAllLeaves = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        let query = {};
        if (status) query.status = status;

        const skip = (page - 1) * limit;
        const total = await LeaveRequest.countDocuments(query);

        const leaves = await LeaveRequest.find(query)
            .populate({
                path: 'employee',
                select: 'firstName lastName employeeId department',
            })
            .populate('user', 'name email')
            .populate('approvedBy', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            count: leaves.length,
            total,
            data: leaves,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Approve/Reject leave
// @route   PUT /api/leaves/:id
const updateLeaveStatus = async (req, res) => {
    try {
        const { status, remarks } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
        }

        const leave = await LeaveRequest.findByIdAndUpdate(
            req.params.id,
            {
                status,
                remarks,
                approvedBy: req.user._id,
                approvedAt: new Date(),
            },
            { new: true }
        ).populate({
            path: 'employee',
            select: 'firstName lastName employeeId department',
        });

        if (!leave) {
            return res.status(404).json({ success: false, message: 'Leave request not found' });
        }

        res.status(200).json({ success: true, data: leave });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get leave stats
// @route   GET /api/leaves/stats
const getLeaveStats = async (req, res) => {
    try {
        const pendingCount = await LeaveRequest.countDocuments({ status: 'pending' });
        const approvedCount = await LeaveRequest.countDocuments({ status: 'approved' });
        const rejectedCount = await LeaveRequest.countDocuments({ status: 'rejected' });

        const byType = await LeaveRequest.aggregate([
            { $match: { status: 'approved' } },
            { $group: { _id: '$leaveType', count: { $sum: 1 }, totalDays: { $sum: '$totalDays' } } },
        ]);

        res.status(200).json({
            success: true,
            data: {
                pending: pendingCount,
                approved: approvedCount,
                rejected: rejectedCount,
                byType,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    applyLeave,
    getMyLeaves,
    getAllLeaves,
    updateLeaveStatus,
    getLeaveStats,
};
