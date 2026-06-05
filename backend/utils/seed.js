const User = require('../models/User');
const Employee = require('../models/Employee');
const connectDB = require('../config/db');
const mongoose = require('mongoose');
require('dotenv').config();

const seedData = async () => {
    try {
        await connectDB();

        // Clear existing data
        await User.deleteMany({});
        await Employee.deleteMany({});

        console.log('Cleared existing data...');

        // Create Admin
        const admin = await User.create({
            name: 'Admin User',
            email: 'admin@talentsphere.com',
            password: 'admin123',
            role: 'admin',
            department: 'Management',
            designation: 'System Administrator',
        });
        console.log('✅ Admin created: admin@talentsphere.com / admin123');

        // Create Senior Manager
        const seniorManager = await User.create({
            name: 'Rajesh Kumar',
            email: 'manager@talentsphere.com',
            password: 'manager123',
            role: 'senior_manager',
            department: 'Engineering',
            designation: 'Senior Engineering Manager',
        });
        console.log('✅ Senior Manager created: manager@talentsphere.com / manager123');

        // Create HR Recruiter
        const hr = await User.create({
            name: 'Priya Sharma',
            email: 'hr@talentsphere.com',
            password: 'hr123456',
            role: 'hr',
            department: 'HR',
            designation: 'HR Recruiter',
        });
        console.log('✅ HR Recruiter created: hr@talentsphere.com / hr123456');

        // Create Employees
        const employeesData = [
            { name: 'Amit Patel', email: 'amit@talentsphere.com', dept: 'Engineering', desg: 'Software Engineer', skills: ['JavaScript', 'React', 'Node.js'] },
            { name: 'Sneha Reddy', email: 'sneha@talentsphere.com', dept: 'Engineering', desg: 'Frontend Developer', skills: ['React', 'CSS', 'TypeScript'] },
            { name: 'Vikram Singh', email: 'vikram@talentsphere.com', dept: 'Engineering', desg: 'Backend Developer', skills: ['Python', 'Django', 'PostgreSQL'] },
            { name: 'Neha Gupta', email: 'neha@talentsphere.com', dept: 'Marketing', desg: 'Marketing Manager', skills: ['SEO', 'Content Marketing', 'Analytics'] },
            { name: 'Rohan Mehta', email: 'rohan@talentsphere.com', dept: 'Sales', desg: 'Sales Executive', skills: ['Negotiation', 'CRM', 'Lead Generation'] },
            { name: 'Kavitha Nair', email: 'kavitha@talentsphere.com', dept: 'Design', desg: 'UI/UX Designer', skills: ['Figma', 'Adobe XD', 'Prototyping'] },
            { name: 'Arjun Rao', email: 'arjun@talentsphere.com', dept: 'Finance', desg: 'Financial Analyst', skills: ['Excel', 'Financial Modeling', 'SAP'] },
            { name: 'Divya Menon', email: 'divya@talentsphere.com', dept: 'HR', desg: 'HR Executive', skills: ['Recruitment', 'Onboarding', 'HRIS'] },
            { name: 'Suresh Iyer', email: 'suresh@talentsphere.com', dept: 'Operations', desg: 'Operations Manager', skills: ['Supply Chain', 'Logistics', 'Lean'] },
            { name: 'Ananya Das', email: 'ananya@talentsphere.com', dept: 'Product', desg: 'Product Manager', skills: ['Roadmapping', 'Agile', 'Jira'] },
        ];

        for (let i = 0; i < employeesData.length; i++) {
            const emp = employeesData[i];
            const user = await User.create({
                name: emp.name,
                email: emp.email,
                password: 'employee123',
                role: 'employee',
                department: emp.dept,
                designation: emp.desg,
            });

            await Employee.create({
                user: user._id,
                firstName: emp.name.split(' ')[0],
                lastName: emp.name.split(' ').slice(1).join(' '),
                email: emp.email,
                department: emp.dept,
                designation: emp.desg,
                dateOfJoining: new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
                gender: i % 2 === 0 ? 'Male' : 'Female',
                skills: emp.skills,
                manager: seniorManager._id,
                salary: {
                    basic: 40000 + Math.floor(Math.random() * 30000),
                    hra: 15000 + Math.floor(Math.random() * 10000),
                    allowances: 5000 + Math.floor(Math.random() * 5000),
                    deductions: 3000 + Math.floor(Math.random() * 3000),
                },
                phone: `+91 ${Math.floor(Math.random() * 9000000000) + 1000000000}`,
                address: {
                    city: ['Bangalore', 'Mumbai', 'Delhi', 'Chennai', 'Hyderabad'][Math.floor(Math.random() * 5)],
                    state: 'Karnataka',
                    country: 'India',
                },
            });
        }

        console.log(`✅ ${employeesData.length} Employees created (password: employee123)`);
        console.log('\n--- Seed Complete ---');
        console.log('Login Credentials:');
        console.log('  Admin:          admin@talentsphere.com / admin123');
        console.log('  Senior Manager: manager@talentsphere.com / manager123');
        console.log('  HR Recruiter:   hr@talentsphere.com / hr123456');
        console.log('  Employee:       amit@talentsphere.com / employee123');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding:', error.message);
        process.exit(1);
    }
};

seedData();
