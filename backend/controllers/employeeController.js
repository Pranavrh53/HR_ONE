const Employee = require('../models/Employee');
const User = require('../models/User');

// @desc    Get all employees
// @route   GET /api/employees
const getEmployees = async (req, res) => {
    try {
        const { department, status, search, page = 1, limit = 20 } = req.query;

        let query = {};

        if (department) query.department = department;
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { employeeId: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;
        const total = await Employee.countDocuments(query);
        const employees = await Employee.find(query)
            .populate('user', 'name email role avatar')
            .populate('manager', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            count: employees.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            data: employees,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single employee
// @route   GET /api/employees/:id
const getEmployee = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id)
            .populate('user', 'name email role avatar')
            .populate('manager', 'name email');

        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        res.status(200).json({ success: true, data: employee });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create employee (also creates user account)
// @route   POST /api/employees
const createEmployee = async (req, res) => {
    try {
        const {
            firstName, lastName, email, phone, department,
            designation, dateOfJoining, dateOfBirth, gender,
            address, salary, skills, manager, password
        } = req.body;

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }

        // Create user account for the employee
        const user = await User.create({
            name: `${firstName} ${lastName}`,
            email,
            password: password || 'password123',
            role: 'employee',
            phone,
            department,
            designation,
        });

        // Create employee record
        const employee = await Employee.create({
            user: user._id,
            firstName,
            lastName,
            email,
            phone,
            department,
            designation,
            dateOfJoining: dateOfJoining || new Date(),
            dateOfBirth,
            gender,
            address,
            salary,
            skills: skills || [],
            manager,
        });

        const populatedEmployee = await Employee.findById(employee._id)
            .populate('user', 'name email role');

        res.status(201).json({ success: true, data: populatedEmployee });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
const updateEmployee = async (req, res) => {
    try {
        let employee = await Employee.findById(req.params.id);

        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        }).populate('user', 'name email role');

        // Also update the user record
        if (req.body.firstName || req.body.lastName || req.body.department || req.body.designation) {
            await User.findByIdAndUpdate(employee.user._id, {
                name: `${req.body.firstName || employee.firstName} ${req.body.lastName || employee.lastName}`,
                department: req.body.department || employee.department,
                designation: req.body.designation || employee.designation,
            });
        }

        res.status(200).json({ success: true, data: employee });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete employee
// @route   DELETE /api/employees/:id
const deleteEmployee = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);

        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        // Deactivate user account (soft delete)
        await User.findByIdAndUpdate(employee.user, { isActive: false });
        await Employee.findByIdAndUpdate(req.params.id, { status: 'terminated' });

        res.status(200).json({ success: true, message: 'Employee removed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get employee stats (for dashboard)
// @route   GET /api/employees/stats
const getEmployeeStats = async (req, res) => {
    try {
        const totalEmployees = await Employee.countDocuments({ status: 'active' });
        const departmentStats = await Employee.aggregate([
            { $match: { status: 'active' } },
            { $group: { _id: '$department', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);

        // Simple Attrition Risk Analysis (AI Prediction Placeholder)
        const total = await Employee.countDocuments({ status: 'active' });
        const attritionRisk = {
            low: Math.floor(total * 0.8),
            medium: Math.floor(total * 0.15),
            high: Math.floor(total * 0.05),
        };

        const recentHires = await Employee.find({ status: 'active' })
            .sort({ dateOfJoining: -1 })
            .limit(5)
            .populate('user', 'name email avatar');

        res.status(200).json({
            success: true,
            data: {
                totalEmployees,
                departmentStats,
                recentHires,
                attritionRisk,
                turnoverRate: '1.2%',
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getEmployees,
    getEmployee,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployeeStats,
};
