const mongoose = require('mongoose');

const hiringDecisionSchema = new mongoose.Schema({
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true,
        index: true,
    },
    resume: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resume',
        required: true,
        index: true,
    },
    interviewSession: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InterviewSession',
        default: null,
    },
    candidateName: { type: String, required: true, trim: true },
    candidateEmail: { type: String, required: true, lowercase: true },
    resumeScore: { type: Number, default: 0 },
    interviewScore: { type: Number, default: 0 },
    finalScore: { type: Number, default: 0 },
    classification: {
        type: String,
        enum: ['Top Candidate', 'Recommended', 'Needs HR Review', 'Not Recommended'],
        default: 'Needs HR Review',
    },
    status: {
        type: String,
        enum: [
            'awaiting_hr_review',
            'top_candidate',
            'recommended',
            'needs_hr_review',
            'not_recommended',
            'selected',
            'rejected',
            'offer_generated',
            'offer_accepted',
            'offer_declined',
            'onboarding_started',
            'employee_created',
        ],
        default: 'awaiting_hr_review',
        index: true,
    },
    rank: { type: Number, default: null },
    resumeQuality: { type: Number, default: 0 },
    technicalScore: { type: Number, default: 0 },
    communicationScore: { type: Number, default: 0 },
    problemSolvingScore: { type: Number, default: 0 },
    behavioralScore: { type: Number, default: 0 },
    projectExperienceScore: { type: Number, default: 0 },
    hrNotes: { type: String, default: '' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    offerLetter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OfferLetter',
        default: null,
    },
    offerResponse: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OfferResponse',
        default: null,
    },
    onboardingRecord: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Onboarding',
        default: null,
    },
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        default: null,
    },
}, { timestamps: true });

module.exports = mongoose.model('HiringDecision', hiringDecisionSchema);