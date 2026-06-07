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
                'Highly Recommended', 'Recommended', 'Needs Review', 'Potential Match', 'Not Recommended',
            ],
            default: 'Needs Review',
        },
        summary: { type: String, default: '' },
        score: { type: Number, default: 0 },
        strengths: [{ type: String }],
        weaknesses: [{ type: String }],
        interviewQuestions: [{ type: String }],
        analysisMode: { type: String, default: 'deterministic' },
        skillScore: { type: Number },
        semanticScore: { type: Number },
        experienceScore: { type: Number },
        projectsScore: { type: Number },
        educationScore: { type: Number },
        certificationsScore: { type: Number },
        achievementsScore: { type: Number },
        resumeQualityScore: { type: Number },
        technicalSkillsFound: [{ type: String }],
        scoreBreakdown: [{
            category: { type: String },
            score: { type: Number },
            max: { type: Number },
            note: { type: String },
        }],
        aiInsights: { type: String, default: '' },
        rank: { type: Number },
    },
    screeningStatus: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'failed'],
        default: 'pending',
    },
    status: {
        type: String,
        enum: ['pending', 'applied', 'screened', 'shortlisted', 'rejected', 'interview', 'interviewed', 'selected'],
        default: 'applied',
    },
    screenedAt: {
        type: Date,
    },
    interviewToken: {
        type: String,
        default: '',
    },
    interviewSession: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InterviewSession',
    },
    interviewAssignedAt: {
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
