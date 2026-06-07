const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');
const Employee = require('../models/Employee');

dotenv.config({ path: path.join(__dirname, '../.env') });

const sync = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB.');

        const users = await User.find({ role: { $ne: 'candidate' } });
        console.log(`Checking ${users.length} staff users...`);

        let createdCount = 0;
        for (const user of users) {
            const exists = await Employee.findOne({ user: user._id });
            if (!exists) {
                await Employee.create({
                    user: user._id,
                    firstName: user.name.split(' ')[0],
                    lastName: user.name.split(' ').slice(1).join(' ') || '',
                    email: user.email,
                    department: user.department || (user.role === 'hr' ? 'HR' : 'Engineering'),
                    designation: user.designation || 'Staff',
                    status: 'active',
                    dateOfJoining: user.createdAt || new Date()
                });
                createdCount++;
            }
        }

        console.log(`Sync complete. Created ${createdCount} missing employee records.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

sync();
