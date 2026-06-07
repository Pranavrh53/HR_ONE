const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');

// @desc    Generate payroll for a specific month
// @route   POST /api/payroll/generate
const generatePayroll = async (req, res) => {
    try {
        const { month, year } = req.body;
        const employees = await Employee.find({ status: 'active' });

        const payrolls = [];
        for (const emp of employees) {
            // Check if payroll already exists
            const exists = await Payroll.findOne({ employee: emp._id, month, year });
            if (exists) continue;

            const basic = emp.salary?.basic || 0;
            const hra = basic * 0.4;
            const tax = basic * 0.1; // Simple 10% tax

            const payroll = await Payroll.create({
                employee: emp._id,
                month,
                year,
                basicSalary: basic,
                hra,
                deductions: { tax },
                status: 'paid',
                paidAt: new Date(),
            });
            payrolls.push(payroll);
        }

        res.status(201).json({ success: true, count: payrolls.length, data: payrolls });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get my payslips
// @route   GET /api/payroll/my
const getMyPayrolls = async (req, res) => {
    try {
        const employee = await Employee.findOne({ user: req.user.id });
        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee profile not found' });
        }

        const payrolls = await Payroll.find({ employee: employee._id }).sort({ year: -1, month: -1 });
        res.status(200).json({ success: true, count: payrolls.length, data: payrolls });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all payroll stats for Admin
// @route   GET /api/payroll/stats
const getPayrollStats = async (req, res) => {
    try {
        const stats = await Payroll.aggregate([
            {
                $group: {
                    _id: { month: '$month', year: '$year' },
                    totalPayroll: { $sum: '$netSalary' },
                    avgSalary: { $avg: '$netSalary' },
                    count: { $sum: 1 },
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 6 }
        ]);

        res.status(200).json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { generatePayroll, getMyPayrolls, getPayrollStats };
