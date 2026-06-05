const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true,
    },
    candidateName: {
        type: String,
        required: true,
        trim: true,
    },
    candidateEmail: {
        type: String,
        required: true,
        lowercase: true,
    },
    candidatePhone: {
        type: String,
        default: '',
    },
    resumeFile: {
        type: String, // file path
        required: true,
    },
    extractedText: {
        type: String,
        default: '',
    },
    // AI Analysis Results
    aiAnalysis: {
        matchPercentage: { type: Number, default: 0 },
        detectedSkills: [{ type: String }],
        missingSkills: [{ type: String }],
        experience: { type: String, default: '' },
        education: { type: String, default: '' },
        recommendation: {
            type: String,
            enum: [
                'strong_hire', 'hire', 'maybe', 'no_hire',
                'Highly Recommended', 'Recommended', 'Potential Match', 'Not Recommended',
            ],
            default: 'Potential Match',
        },
        summary: { type: String, default: '' },
        score: { type: Number, default: 0 },
        strengths: [{ type: String }],
        weaknesses: [{ type: String }],
        interviewQuestions: [{ type: String }],
        analysisMode: { type: String, default: 'gemini' },
    },
    status: {
        type: String,
        enum: ['pending', 'screened', 'shortlisted', 'rejected', 'interview', 'selected'],
        default: 'pending',
    },
    screenedAt: {
        type: Date,
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Resume', resumeSchema);
