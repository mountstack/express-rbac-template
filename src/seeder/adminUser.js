const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to MongoDB
const MONGODB_URI = process.env.NODE_ENV === 'development' ? process.env.MONGODB_LOCAL_URI : process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

const adminData = {
    email: process.env.ADMIN_EMAIL,
    password: '12345678',
    type: 'bussiness owner'
};

const seedAdmin = async () => {
    try {
        // Check if business owner already exists
        const existingAdmin = await User.findOne({ type: 'bussiness owner' });
        
        if (existingAdmin) { 
            process.exit(0);
        }

        // Create admin user
        const admin = await User.create(adminData);
        console.log('Business owner created successfully:', admin.email);
        process.exit(0);
    } 
    catch (error) {
        console.error('Error creating business owner:', error);
        process.exit(1);
    }
};

// Run the seeder
seedAdmin(); 