const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');

const seedUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/taskmanager');
        console.log('MongoDB connected for seeding');

        const testEmail = 'testcache_2118331189@example.com';
        const testPassword = 'password123';

        let user = await User.findOne({ email: testEmail });
        if (!user) {
            const hashedPassword = await bcrypt.hash(testPassword, 10);
            user = await User.create({
                email: testEmail,
                password: hashedPassword
            });
            console.log(`Created test user: ${testEmail}`);
        } else {
            console.log(`Test user already exists: ${testEmail}`);
        }

        console.log('Credentials:');
        console.log(`Email:    ${testEmail}`);
        console.log(`Password: ${testPassword}`);
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
};

seedUser();
