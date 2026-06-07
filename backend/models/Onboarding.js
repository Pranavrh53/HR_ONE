const mongoose = require('mongoose');

const onboardingSchema = new mongoose.Schema({
    decision: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HiringDecision',
        required: true,
        index: true,
    },
    offerLetter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OfferLetter',
        required: true,
    },
    resume: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', required: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    candidateName: { type: String, required: true, trim: true },
    candidateEmail: { type: String, required: true, lowercase: true },
    status: {
        type: String,
        enum: [
            'document_submission',
            'document_verification',
            'ai_onboarding_assistant',
            'employee_created',
            'active',
            'completed',
        ],
        default: 'document_submission',
        index: true,
    },
    documents: {
        aadhaar: { type: String, default: '' },
        pan: { type: String, default: '' },
        educationalCertificates: { type: String, default: '' },
        experienceDocuments: { type: String, default: '' },
        photo: { type: String, default: '' },
    },
    tasks: [{
        title: { type: String, required: true },
        status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
        completedAt: { type: Date },
    }],
    welcomeKit: {
        message: { type: String, default: '' },
        firstWeekChecklist: [{ type: String }],
        teamIntroduction: { type: String, default: '' },
        departmentOverview: { type: String, default: '' },
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    notes: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Onboarding', onboardingSchema);