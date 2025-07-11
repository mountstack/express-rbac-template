const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const dbUri = {
    production: process.env.MONGODB_URI, 
    test: process.env.MONGODB_LOCAL_TEST_URI, 
    development: process.env.MONGODB_LOCAL_URI,
}

const MONGODB_URI = dbUri[process.env.NODE_ENV];


mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    });

const ADMIN_TYPE = process.env.ADMIN_USER_TYPE || 'ADMIN';

const adminData = { 
    email: process.env.ADMIN_EMAIL, 
    password: '12345678', 
    type: ADMIN_TYPE 
}; 

const seedAdmin = async () => { 
    try {
        // Check if business-owner already exists
        const existingAdmin = await User.findOne({ type: ADMIN_TYPE });
        
        if (existingAdmin) { 
            process.exit(0);
        }

        // Create admin user
        const admin = await User.create(adminData);
        console.log(`${ADMIN_TYPE} created successfully: ${admin.email}`);
        process.exit(0);
    } 
    catch (error) {
        console.error(`Error creating ${ADMIN_TYPE}: ${error.message}`);
        process.exit(1);
    }
};

// Run the seeder 
seedAdmin(); 