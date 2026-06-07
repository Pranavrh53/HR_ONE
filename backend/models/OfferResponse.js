const mongoose = require('mongoose');

const offerResponseSchema = new mongoose.Schema({
    offerLetter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OfferLetter',
        required: true,
        index: true,
    },
    decision: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HiringDecision',
        required: true,
    },
    resume: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resume',
        required: true,
    },
    candidateName: { type: String, required: true, trim: true },
    candidateEmail: { type: String, required: true, lowercase: true },
    response: {
        type: String,
        enum: ['accepted', 'declined'],
        required: true,
        index: true,
    },
    candidateNote: { type: String, default: '' },
    respondedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('OfferResponse', offerResponseSchema);