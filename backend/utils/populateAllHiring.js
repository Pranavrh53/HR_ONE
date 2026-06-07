const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

require('../models/Job');
require('../models/Resume');
require('../models/HiringDecision');

const Job = mongoose.model('Job');
const Resume = mongoose.model('Resume');
const HiringDecision = mongoose.model('HiringDecision');

dotenv.config({ path: path.join(__dirname, '../.env') });

const populateAllJobs = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB.');

        const jobs = await Job.find();
        const resumes = await Resume.find();

        if (resumes.length === 0) {
            console.log('No resumes found to link.');
            process.exit(0);
        }

        for (const job of jobs) {
            const count = await HiringDecision.countDocuments({ job: job._id });
            if (count === 0) {
                console.log(`Populating decisions for job: ${job.title}...`);
                // Take 3 random resumes and link them to this job for demo purposes
                const sampleResumes = resumes.sort(() => 0.5 - Math.random()).slice(0, 3);

                for (const resu of sampleResumes) {
                    await HiringDecision.create({
                        job: job._id,
                        resume: resu._id,
                        candidateName: resu.candidateName,
                        candidateEmail: resu.candidateEmail,
                        resumeScore: Math.floor(Math.random() * 20) + 70,
                        interviewScore: Math.floor(Math.random() * 20) + 70,
                        finalScore: Math.floor(Math.random() * 20) + 70,
                        classification: Math.random() > 0.5 ? 'Top Candidate' : 'Recommended',
                        status: 'awaiting_hr_review',
                        technicalScore: 80,
                        communicationScore: 85,
                    });
                }
            }
        }

        console.log('Success: All jobs now have hiring decisions.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

populateAllJobs();
