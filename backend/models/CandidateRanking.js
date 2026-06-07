const mongoose = require('mongoose');

const rankingEntrySchema = new mongoose.Schema({
    decision: { type: mongoose.Schema.Types.ObjectId, ref: 'HiringDecision' },
    resume: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' },
    candidateName: { type: String, default: '' },
    candidateEmail: { type: String, default: '' },
    rank: { type: Number, default: 0 },
    resumeScore: { type: Number, default: 0 },
    interviewScore: { type: Number, default: 0 },
    finalScore: { type: Number, default: 0 },
    classification: { type: String, default: '' },
    technicalScore: { type: Number, default: 0 },
    communicationScore: { type: Number, default: 0 },
    problemSolvingScore: { type: Number, default: 0 },
    projectExperienceScore: { type: Number, default: 0 },
}, { _id: false });

const candidateRankingSchema = new mongoose.Schema({
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true,
        unique: true,
        index: true,
    },
    generatedAt: { type: Date, default: Date.now },
    rankings: [rankingEntrySchema],
    bestTechnicalCandidate: { type: mongoose.Schema.Types.ObjectId, ref: 'HiringDecision', default: null },
    bestCommunicationSkills: { type: mongoose.Schema.Types.ObjectId, ref: 'HiringDecision', default: null },
    bestProblemSolver: { type: mongoose.Schema.Types.ObjectId, ref: 'HiringDecision', default: null },
    bestProjectExperience: { type: mongoose.Schema.Types.ObjectId, ref: 'HiringDecision', default: null },
    bestOverallFit: { type: mongoose.Schema.Types.ObjectId, ref: 'HiringDecision', default: null },
}, { timestamps: true });

module.exports = mongoose.model('CandidateRanking', candidateRankingSchema);