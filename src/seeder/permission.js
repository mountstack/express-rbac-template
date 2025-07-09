const Permission = require('../models/role/Permission'); 
var colors = require('colors');
colors.enable(); // Enable colors

const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config();

const dbUri = {
    production: process.env.MONGODB_URI, 
    test: process.env.MONGODB_LOCAL_TEST_URI, 
    development: process.env.MONGODB_LOCAL_URI,
}

const MONGODB_URI = dbUri[process.env.NODE_ENV];


const permissions = [
    // User Module Permissions
    { name: 'user_manage', label: 'Manage', module: 'user' },
    { name: 'user_view', label: 'View', module: 'user' },
    { name: 'user_create', label: 'Create', module: 'user' },
    { name: 'user_edit', label: 'Edit', module: 'user' },
    { name: 'user_delete', label: 'Delete', module: 'user' },

    // Role Module Permissions
    { name: 'role_manage', label: 'Manage', module: 'role' },
    { name: 'role_view', label: 'View', module: 'role' },
    { name: 'role_create', label: 'Create', module: 'role' },
    { name: 'role_edit', label: 'Edit', module: 'role' },
    { name: 'role_delete', label: 'Delete', module: 'role' },

    // Company Settings Module Permissions 
    { name: 'company_setting_edit', label: 'Edit', module: 'company_setting' }, 

    // Category Module Permissions
    { name: 'category_manage', label: 'Manage', module: 'category' },
    { name: 'category_view', label: 'View', module: 'category' },
    { name: 'category_create', label: 'Create', module: 'category' },
    { name: 'category_edit', label: 'Edit', module: 'category' },
    { name: 'category_delete', label: 'Delete', module: 'category' },

    // Product Module Permissions
    { name: 'product_manage', label: 'Manage', module: 'product' },
    { name: 'product_view', label: 'View', module: 'product' },
    { name: 'product_create', label: 'Create', module: 'product' },
    { name: 'product_edit', label: 'Edit', module: 'product' },
    { name: 'product_delete', label: 'Delete', module: 'product' },


    // Review Module Permissions
    { name: 'review_manage', label: 'Manage', module: 'review' },
    { name: 'review_view', label: 'View', module: 'review' },
    { name: 'review_create', label: 'Create', module: 'review' },
    { name: 'review_edit', label: 'Edit', module: 'review' },
    { name: 'review_delete', label: 'Delete', module: 'review' },

    // Order Module Permissions
    { name: 'order_manage', label: 'Manage', module: 'order' },
    { name: 'order_view', label: 'View', module: 'order' }
];

async function seedPermissions() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);

        let insertedCount = 0;
        let existingCount = 0;
        
        for await (const permission of permissions) { 
            const existingPermission = await Permission.findOne({ name: permission.name }); 

            if(!existingPermission) { 
                await Permission.create(permission); 
                insertedCount++; 
            } 
            else { 
                existingCount++; 
            } 
        } 

        if(insertedCount) { 
            console.log(colors.yellow.underline(`✓ ${insertedCount} new permissions inserted`)); 
        } 
        console.log(colors.cyan.underline(`Permissions: Seeding completed!`)); 

        process.exit(0); 
    } 
    catch (error) { 
        console.error(colors.red.underline('Error permission_seeding the database:', error.message));
        process.exit(1);
    }
} 

seedPermissions(); 