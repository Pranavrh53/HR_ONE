const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Job = require('../models/Job');
const Resume = require('../models/Resume');

dotenv.config({ path: path.join(__dirname, '../.env') });

const seed = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const emails = [
            'admin@talentsphere.com',
            'hr@talentsphere.com',
            'manager@talentsphere.com',
            'employee@talentsphere.com'
        ];
        await User.deleteMany({ email: { $in: emails } });
        console.log('Cleared existing demo users.');

        const commonPass = 'pass123456';

        const users = [
            { name: 'John Admin', email: 'admin@talentsphere.com', password: commonPass, role: 'admin', department: 'Operations', designation: 'General Manager' },
            { name: 'Sarah HR', email: 'hr@talentsphere.com', password: commonPass, role: 'hr', department: 'HR', designation: 'Senior HR Recruiter' },
            { name: 'David Manager', email: 'manager@talentsphere.com', password: commonPass, role: 'senior_manager', department: 'Engineering', designation: 'VP of Engineering' },
            { name: 'Amit Employee', email: 'employee@talentsphere.com', password: commonPass, role: 'employee', department: 'Engineering', designation: 'Senior Developer' }
        ];

        for (const u of users) {
            const user = await User.create(u);
            console.log(`Created ${u.role}: ${u.email}`);

            await Employee.create({
                user: user._id,
                firstName: u.name.split(' ')[0],
                lastName: u.name.split(' ')[1] || '',
                email: u.email,
                department: u.department,
                designation: u.designation,
                status: 'active',
                dateOfJoining: new Date('2024-01-15')
            });
        }

        console.log('Seeding completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seed();
