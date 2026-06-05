const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    employeeId: {
        type: String,
        unique: true,
        required: true,
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    phone: {
        type: String,
        default: '',
    },
    department: {
        type: String,
        required: true,
        enum: ['Engineering', 'HR', 'Marketing', 'Sales', 'Finance', 'Operations', 'Design', 'Product', 'Support', 'Legal'],
    },
    designation: {
        type: String,
        required: true,
    },
    dateOfJoining: {
        type: Date,
        default: Date.now,
    },
    dateOfBirth: {
        type: Date,
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
    },
    address: {
        street: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        zipCode: { type: String, default: '' },
        country: { type: String, default: 'India' },
    },
    salary: {
        basic: { type: Number, default: 0 },
        hra: { type: Number, default: 0 },
        allowances: { type: Number, default: 0 },
        deductions: { type: Number, default: 0 },
    },
    skills: [{
        type: String,
    }],
    manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'on_leave', 'terminated'],
        default: 'active',
    },
    documents: {
        aadhaar: { type: String, default: '' },
        pan: { type: String, default: '' },
        resume: { type: String, default: '' },
    },
}, {
    timestamps: true,
});

// Auto-generate employee ID
employeeSchema.pre('validate', async function () {
    if (!this.employeeId) {
        const count = await mongoose.model('Employee').countDocuments();
        this.employeeId = `EMP${String(count + 1).padStart(4, '0')}`;
    }
});

module.exports = mongoose.model('Employee', employeeSchema);
