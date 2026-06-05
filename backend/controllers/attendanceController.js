const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');

// @desc    Check in
// @route   POST /api/attendance/checkin
const checkIn = async (req, res) => {
    try {
        const employee = await Employee.findOne({ user: req.user._id });
        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee record not found' });
        }

        // Check if already checked in today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const existing = await Attendance.findOne({
            employee: employee._id,
            date: { $gte: today, $lt: tomorrow },
        });

        if (existing) {
            return res.status(400).json({ success: false, message: 'Already checked in today' });
        }

        const attendance = await Attendance.create({
            employee: employee._id,
            user: req.user._id,
            date: new Date(),
            checkIn: new Date(),
            status: new Date().getHours() > 9 ? 'late' : 'present',
        });

        res.status(201).json({ success: true, data: attendance });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Check out
// @route   PUT /api/attendance/checkout
const checkOut = async (req, res) => {
    try {
        const employee = await Employee.findOne({ user: req.user._id });
        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee record not found' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const attendance = await Attendance.findOne({
            employee: employee._id,
            date: { $gte: today, $lt: tomorrow },
        });

        if (!attendance) {
            return res.status(400).json({ success: false, message: 'No check-in found for today' });
        }

        if (attendance.checkOut) {
            return res.status(400).json({ success: false, message: 'Already checked out today' });
        }

        attendance.checkOut = new Date();
        const diff = attendance.checkOut - attendance.checkIn;
        attendance.workHours = parseFloat((diff / (1000 * 60 * 60)).toFixed(2));

        if (attendance.workHours < 4) {
            attendance.status = 'half_day';
        }

        await attendance.save();

        res.status(200).json({ success: true, data: attendance });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get my attendance
// @route   GET /api/attendance/my
const getMyAttendance = async (req, res) => {
    try {
        const employee = await Employee.findOne({ user: req.user._id });
        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee record not found' });
        }

        const { month, year } = req.query;
        let query = { employee: employee._id };

        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            query.date = { $gte: startDate, $lte: endDate };
        }

        const attendance = await Attendance.find(query).sort({ date: -1 });

        // Today's record
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const todayRecord = await Attendance.findOne({
            employee: employee._id,
            date: { $gte: today, $lt: tomorrow },
        });

        res.status(200).json({
            success: true,
            count: attendance.length,
            todayRecord,
            data: attendance,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all attendance (HR/Admin)
// @route   GET /api/attendance
const getAllAttendance = async (req, res) => {
    try {
        const { date, department, page = 1, limit = 50 } = req.query;

        let query = {};
        if (date) {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            const next = new Date(d);
            next.setDate(next.getDate() + 1);
            query.date = { $gte: d, $lt: next };
        }

        const skip = (page - 1) * limit;

        let attendance = await Attendance.find(query)
            .populate({
                path: 'employee',
                select: 'firstName lastName employeeId department',
                ...(department ? { match: { department } } : {}),
            })
            .populate('user', 'name email')
            .sort({ date: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Filter out null employees (from department filter)
        attendance = attendance.filter(a => a.employee !== null);

        const total = await Attendance.countDocuments(query);

        res.status(200).json({
            success: true,
            count: attendance.length,
            total,
            data: attendance,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get attendance stats
// @route   GET /api/attendance/stats
const getAttendanceStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const totalEmployees = await Employee.countDocuments({ status: 'active' });
        const presentToday = await Attendance.countDocuments({
            date: { $gte: today, $lt: tomorrow },
            status: { $in: ['present', 'late'] },
        });
        const lateToday = await Attendance.countDocuments({
            date: { $gte: today, $lt: tomorrow },
            status: 'late',
        });
        const absentToday = totalEmployees - presentToday;

        res.status(200).json({
            success: true,
            data: {
                totalEmployees,
                presentToday,
                absentToday,
                lateToday,
                attendanceRate: totalEmployees > 0 ? ((presentToday / totalEmployees) * 100).toFixed(1) : 0,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    checkIn,
    checkOut,
    getMyAttendance,
    getAllAttendance,
    getAttendanceStats,
};
