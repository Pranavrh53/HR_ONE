const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Job title is required'],
        trim: true,
    },
    description: {
        type: String,
        required: [true, 'Job description is required'],
    },
    department: {
        type: String,
        required: true,
        enum: ['Engineering', 'HR', 'Marketing', 'Sales', 'Finance', 'Operations', 'Design', 'Product', 'Support', 'Legal'],
    },
    requirements: [{
        type: String,
    }],
    skills: [{
        type: String,
    }],
    experience: {
        min: { type: Number, default: 0 },
        max: { type: Number, default: 0 },
    },
    education: {
        type: String,
        default: '',
    },
    salaryRange: {
        min: { type: Number, default: 0 },
        max: { type: Number, default: 0 },
    },
    location: {
        type: String,
        default: 'Bangalore, India',
    },
    type: {
        type: String,
        enum: ['full_time', 'part_time', 'contract', 'internship'],
        default: 'full_time',
    },
    status: {
        type: String,
        enum: ['open', 'closed', 'on_hold'],
        default: 'open',
    },
    postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    applicants: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Job', jobSchema);
