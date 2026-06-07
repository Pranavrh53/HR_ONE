const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
    question: { type: String, required: true },
    questionType: { type: String, enum: ['intro', 'technical', 'behavioral', 'followup'], default: 'technical' },
    answer: { type: String, default: '' },
    transcript: { type: String, default: '' },
    technicalScore: { type: Number, default: 0 },
    communicationScore: { type: Number, default: 0 },
    clarityScore: { type: Number, default: 0 },
    relevanceScore: { type: Number, default: 0 },
    feedback: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
});

const interviewSessionSchema = new mongoose.Schema({
    candidate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resume',
        required: true,
    },
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true,
    },
    candidateName: { type: String, required: true },
    jobTitle: { type: String, required: true },
    accessToken: {
        type: String,
        default: '',
        index: true,
    },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'abandoned'],
        default: 'pending',
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    questions: [{ type: String }],
    answers: [answerSchema],
    resumeScore: { type: Number, default: 0 },
    interviewScore: { type: Number, default: 0 },
    finalScore: { type: Number, default: 0 },
    hiringDecision: { type: mongoose.Schema.Types.ObjectId, ref: 'HiringDecision', default: null },
    report: {
        communicationScore: { type: Number, default: 0 },
        technicalScore: { type: Number, default: 0 },
        problemSolvingScore: { type: Number, default: 0 },
        behavioralScore: { type: Number, default: 0 },
        overallScore: { type: Number, default: 0 },
        hiringScore: { type: Number, default: 0 },
        hiringRecommendation: { type: String, default: '' },
        hiringStatus: { type: String, default: '' },
        strengths: [{ type: String }],
        weaknesses: [{ type: String }],
        recommendation: {
            type: String,
            enum: ['Strong Hire', 'Hire', 'Consider', 'Reject', ''],
            default: '',
        },
        summary: { type: String, default: '' },
    },
}, { timestamps: true });

module.exports = mongoose.model('InterviewSession', interviewSessionSchema);
