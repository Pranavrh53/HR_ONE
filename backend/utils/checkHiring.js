const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

require('../models/Job');
require('../models/HiringDecision');

const Job = mongoose.model('Job');
const HiringDecision = mongoose.model('HiringDecision');

dotenv.config({ path: path.join(__dirname, '../.env') });

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const jobs = await Job.find();
        for (const j of jobs) {
            const count = await HiringDecision.countDocuments({ job: j._id });
            console.log(`Job: ${j.title} (${j._id}) - Decisions: ${count}`);
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

check();
