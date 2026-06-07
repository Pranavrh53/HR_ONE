const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const crypto = require('crypto');

// Register all models first to prevent MissingSchemaError during population
require('../models/Job');
require('../models/Resume');
require('../models/OfferLetter');
require('../models/HiringDecision');
require('../models/User');
require('../models/Employee');
require('../models/Onboarding');

const Onboarding = mongoose.model('Onboarding');
const HiringDecision = mongoose.model('HiringDecision');
const Resume = mongoose.model('Resume');
const Employee = mongoose.model('Employee');
const User = mongoose.model('User');

dotenv.config({ path: path.join(__dirname, '../.env') });

const finalizeExisting = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB.');

        const pendingOnboardings = await Onboarding.find({ status: { $ne: 'completed' } })
            .populate('decision')
            .populate('resume')
            .populate('job');

        console.log(`Found ${pendingOnboardings.length} pending onboardings.`);

        for (const onboarding of pendingOnboardings) {
            if (onboarding.employee) continue;

            const decision = onboarding.decision;
            const resume = onboarding.resume;
            const job = onboarding.job;

            if (!decision || !job) {
                console.log(`Skipping onboarding ${onboarding._id} due to missing decision/job.`);
                continue;
            }

            const nameParts = decision.candidateName.split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ') || '';
            const password = crypto.randomBytes(8).toString('hex');

            let user = await User.findOne({ email: decision.candidateEmail });
            if (!user) {
                user = await User.create({
                    name: decision.candidateName,
                    email: decision.candidateEmail,
                    password,
                    role: 'employee',
                    department: job.department,
                    designation: job.title,
                });
            }

            const employee = await Employee.create({
                user: user._id,
                firstName,
                lastName,
                email: decision.candidateEmail,
                phone: resume?.candidatePhone || '',
                department: job.department,
                designation: job.title,
                dateOfJoining: new Date(),
                status: 'active',
                salary: { basic: 0, hra: 0, allowances: 0, deductions: 0 },
            });

            onboarding.employee = employee._id;
            onboarding.status = 'completed';
            onboarding.completedAt = new Date();
            await onboarding.save();

            decision.employee = employee._id;
            decision.status = 'employee_created';
            await decision.save();

            if (resume) {
                resume.status = 'employee';
                resume.hiringDecision = decision._id;
                resume.onboardingRecord = onboarding._id;
                await resume.save();
            }

            console.log(`Finalized employee: ${decision.candidateName}`);
        }

        console.log('Finalization complete.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

finalizeExisting();
