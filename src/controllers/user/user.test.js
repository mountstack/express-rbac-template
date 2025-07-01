const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const User = require('../../models/User');
const dotenv = require('dotenv');
const testErrorMiddleware = require('../../utils/testErrorMiddleware');
const jwt = require('jsonwebtoken');
const Role = require('../../models/role/Role');
const Permission = require('../../models/role/Permission');

// Load environment variables
dotenv.config();

// Override error middleware for testing
app.use(testErrorMiddleware);

// Connect to test database before running tests
beforeAll(async () => {
    // Use test database URI
    const MONGODB_URI = process.env.MONGODB_LOCAL_TEST_URI;
    await mongoose.connect(MONGODB_URI);
});

// Clear database after each test
afterEach(async () => {
    await User.deleteMany({});
    await Role.deleteMany({});
});

// Close database connection after all tests
afterAll(async () => { 
    await mongoose.connection.close();
});

describe('User Controller - Update User Details', () => {
    let testUser;
    let accessToken;

    beforeEach(async () => {
        // Create a test user
        testUser = await User.create({
            email: 'test@gmail.com',
            password: '12345678'
        });

        // Generate access token
        accessToken = jwt.sign(
            { _id: testUser._id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
        );
    });

    test('should update user details with valid data', async () => {
        const response = await request(app)
            .put('/api/users/edit')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                name: 'Updated Name'
            });


        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('User details updated successfully');
        expect(response.body.data.user.name).toBe('Updated Name');
    });

    test('should not update user details when no fields provided', async () => {
        const response = await request(app)
            .put('/api/users/edit')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Name is missing');
    });

    test('should not update user details without auth token', async () => {
        const response = await request(app)
            .put('/api/users/edit')
            .send({
                name: 'Updated Name'
            });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Not authorized to access this route');
    });

    test('should not update user details with invalid token', async () => {
        const response = await request(app)
            .put('/api/users/edit')
            .set('Authorization', 'Bearer invalid-token')
            .send({
                name: 'Updated Name'
            });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Not authorized to access this route');
    });
});

describe('User Controller - Set User Role', () => {
    let testUser;
    let accessToken;
    let testRoleId;

    beforeEach(async () => {
        // Create a test user with business owner type
        testUser = await User.create({
            email: 'test@gmail.com',
            password: '12345678',
            type: process.env.USER_TYPES.split(',')[0]
        });

        // Generate access token
        accessToken = jwt.sign(
            { _id: testUser._id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
        );

        // Create a test role ID
        testRoleId = new mongoose.Types.ObjectId().toString();
    });

    test('should set user role with valid role ID (business owner)', async () => {
        const response = await request(app)
            .put('/api/users/set-new-role')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                roleId: testRoleId
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('User role updated successfully');
        expect(response.body.data.user.role).toBe(testRoleId);
    });

    test('should not set user role without role ID', async () => {
        const response = await request(app)
            .put('/api/users/set-new-role')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Role ID is required');
    });

    test('should not set user role with invalid role ID format', async () => {
        const response = await request(app)
            .put('/api/users/set-new-role')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                roleId: 'invalid-role-id'
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Invalid role ID format');
    });

    test('should not set user role without auth token', async () => {
        const response = await request(app)
            .put('/api/users/set-new-role')
            .send({
                roleId: testRoleId
            });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Not authorized to access this route');
    });

    test('should not set user role with invalid token', async () => {
        const response = await request(app)
            .put('/api/users/set-new-role')
            .set('Authorization', 'Bearer invalid-token')
            .send({
                roleId: testRoleId
            });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Not authorized to access this route');
    });

    test('should not set user role without role_edit permission', async () => {
        // fetch all permissions 
        const permissions = await Permission.find();

        // create a role 
        const role = await Role.create({
            name: 'HR',
            permissions: permissions
                .filter(permission => permission.name !== 'role_edit')
                .map(permission => permission._id)
        });

        // create an employee type user with role HR & above permisssions 
        const limitedUser = await User.create({
            email: 'test-user@gmail.com',
            password: '12345678',
            role: role._id,
            type: process.env.USER_TYPES.split(',')[2]
        });

        // Generate access token
        const limitedUserToken = jwt.sign(
            { _id: limitedUser._id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
        );

        const testRoleId = new mongoose.Types.ObjectId().toString();

        const response = await request(app)
            .put('/api/users/set-new-role')
            .set('Authorization', `Bearer ${limitedUserToken}`)
            .send({
                roleId: testRoleId
            });

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('You do not have permission to perform this action');
    });
});

