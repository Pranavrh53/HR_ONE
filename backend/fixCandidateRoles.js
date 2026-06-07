const mongoose = require('mongoose');
const User = require('./models/User');
const HiringDecision = require('./models/HiringDecision');
require('dotenv').config();

const fixRoles = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const decisions = await HiringDecision.find({ status: { $in: ['offer_accepted', 'employee_created'] } });
        console.log(`Found ${decisions.length} accepted candidates to verify.`);

        let updated = 0;
        for (const d of decisions) {
            const user = await User.findOne({ email: d.candidateEmail.toLowerCase() });
            if (user && user.role === 'candidate') {
                user.role = 'employee';
                await user.save();
                updated++;
                console.log(`Updated ${user.email} to employee role.`);
            }
        }

        console.log(`Successfully updated ${updated} users.`);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

fixRoles();
