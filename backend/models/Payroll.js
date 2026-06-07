const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
    },
    month: {
        type: Number,
        required: true,
    },
    year: {
        type: Number,
        required: true,
    },
    basicSalary: {
        type: Number,
        required: true,
    },
    hra: {
        type: Number,
        default: 0,
    },
    allowances: {
        type: Number,
        default: 0,
    },
    bonus: {
        type: Number,
        default: 0,
    },
    deductions: {
        insurance: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        other: { type: Number, default: 0 },
    },
    netSalary: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'paid'],
        default: 'pending',
    },
    paidAt: {
        type: Date,
    },
}, {
    timestamps: true,
});

// Calculate net salary before saving
payrollSchema.pre('save', function (next) {
    const totalDeductions = this.deductions.insurance + this.deductions.tax + this.deductions.other;
    this.netSalary = (this.basicSalary + this.hra + this.allowances + this.bonus) - totalDeductions;
    next();
});

module.exports = mongoose.model('Payroll', payrollSchema);
