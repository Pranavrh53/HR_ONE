const mongoose = require('mongoose');

const offerLetterSchema = new mongoose.Schema({
    decision: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HiringDecision',
        required: true,
        index: true,
    },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    resume: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', required: true },
    candidateName: { type: String, required: true, trim: true },
    candidateEmail: { type: String, required: true, lowercase: true },
    department: { type: String, default: '' },
    jobTitle: { type: String, default: '' },
    salary: { type: Number, default: 0 },
    joiningDate: { type: Date },
    reportingManager: { type: String, default: '' },
    companyName: { type: String, default: 'TalentSphere AI' },
    companyDetails: { type: String, default: '' },
    letterText: { type: String, default: '' },
    filePath: { type: String, default: '' },
    fileName: { type: String, default: '' },
    status: {
        type: String,
        enum: ['generated', 'sent', 'accepted', 'declined'],
        default: 'generated',
        index: true,
    },
    generatedAt: { type: Date, default: Date.now },
    sentAt: { type: Date },
    deliveredTo: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('OfferLetter', offerLetterSchema);