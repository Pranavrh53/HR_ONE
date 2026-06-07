const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    candidateName: { type: String, required: true, trim: true },
    candidateEmail: { type: String, required: true, lowercase: true },
    candidatePhone: { type: String, default: '' },
    resumeFile: { type: String, required: true },
    extractedText: { type: String, default: '' },

    // AI Analysis Results
    aiAnalysis: {
        matchPercentage: { type: Number, default: 0 },
        detectedSkills: [{ type: String }],
        missingSkills: [{ type: String }],
        experience: { type: String, default: '' },
        education: { type: String, default: '' },
        recommendation: {
            type: String,
            enum: ['strong_hire', 'hire', 'maybe', 'no_hire', 'Highly Recommended', 'Recommended', 'Needs Review', 'Potential Match', 'Not Recommended'],
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
        scoreBreakdown: [{ category: String, score: Number, max: Number, note: String }],
        aiInsights: { type: String, default: '' },
        rank: { type: Number },
    },

    hiringScore: { type: Number, default: 0 },
    hiringRecommendation: { type: String, default: '' },
    hiringDecision: { type: mongoose.Schema.Types.ObjectId, ref: 'HiringDecision' },
    offerLetter: { type: mongoose.Schema.Types.ObjectId, ref: 'OfferLetter' },
    onboardingRecord: { type: mongoose.Schema.Types.ObjectId, ref: 'Onboarding' },

    // Status tracking
    screeningStatus: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'failed'],
        default: 'pending',
    },
    status: {
        type: String,
        enum: ['pending', 'applied', 'screened', 'shortlisted', 'rejected', 'interview', 'interviewed', 'awaiting_hr_review', 'top_candidate', 'recommended', 'needs_hr_review', 'not_recommended', 'selected', 'offer_generated', 'offer_accepted', 'offer_declined', 'onboarding', 'employee'],
        default: 'applied',
    },
    screenedAt: { type: Date },

    // Interview assignment
    interviewSession: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewSession' },
    interviewToken: { type: String, default: '' },
    interviewAssignedAt: { type: Date },
    interviewDeadline: { type: Date },

    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Resume', resumeSchema);
