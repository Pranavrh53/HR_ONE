const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    leaveType: {
        type: String,
        enum: ['casual', 'sick', 'earned', 'maternity', 'paternity', 'unpaid'],
        required: true,
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    totalDays: {
        type: Number,
        required: true,
    },
    reason: {
        type: String,
        required: [true, 'Please provide a reason for leave'],
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    approvedAt: {
        type: Date,
    },
    remarks: {
        type: String,
        default: '',
    },
}, {
    timestamps: true,
});

// Auto-calculate total days
leaveRequestSchema.pre('validate', function () {
    if (this.startDate && this.endDate) {
        const diff = this.endDate - this.startDate;
        this.totalDays = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
    }
});

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
