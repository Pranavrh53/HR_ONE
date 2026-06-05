const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
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
    date: {
        type: Date,
        required: true,
        default: Date.now,
    },
    checkIn: {
        type: Date,
    },
    checkOut: {
        type: Date,
    },
    status: {
        type: String,
        enum: ['present', 'absent', 'half_day', 'late', 'on_leave'],
        default: 'present',
    },
    workHours: {
        type: Number,
        default: 0,
    },
    notes: {
        type: String,
        default: '',
    },
}, {
    timestamps: true,
});

// Calculate work hours on save
attendanceSchema.pre('save', function () {
    if (this.checkIn && this.checkOut) {
        const diff = this.checkOut - this.checkIn;
        this.workHours = parseFloat((diff / (1000 * 60 * 60)).toFixed(2));
    }
});

// Compound index to prevent duplicate attendance entries
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
