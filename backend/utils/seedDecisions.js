const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Register all models first
require('../models/Job');
require('../models/Resume');
require('../models/HiringDecision');
require('../models/InterviewSession');

const Resume = mongoose.model('Resume');
const HiringDecision = mongoose.model('HiringDecision');
const Job = mongoose.model('Job');

dotenv.config({ path: path.join(__dirname, '../.env') });

const seedDecisions = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB.');

        const resumes = await Resume.find();
        console.log(`Found ${resumes.length} resumes.`);

        for (const resume of resumes) {
            const exists = await HiringDecision.findOne({ resume: resume._id });
            if (!exists) {
                const job = await Job.findById(resume.job);

                await HiringDecision.create({
                    job: resume.job,
                    resume: resume._id,
                    candidateName: resume.candidateName,
                    candidateEmail: resume.candidateEmail,
                    resumeScore: resume.score || 75,
                    interviewScore: 82,
                    finalScore: 78,
                    classification: 'Recommended',
                    status: 'awaiting_hr_review',
                    technicalScore: 85,
                    communicationScore: 80,
                    problemSolvingScore: 75,
                    hrNotes: 'Strong candidate with good technical knowledge.'
                });
                console.log(`Created hiring decision for: ${resume.candidateName}`);
            }
        }

        console.log('Seeding decisions complete.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedDecisions();
