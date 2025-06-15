const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const User = require('../../models/User');
const dotenv = require('dotenv');
const testErrorMiddleware = require('../../utils/testErrorMiddleware');
const jwt = require('jsonwebtoken');

// Load environment variables
dotenv.config();

// Override error middleware for testing
app.use(testErrorMiddleware);

// Connect to test database before running tests
beforeAll(async () => {
    // Use test database URI
    const MONGODB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/sell-ecommerce-test';
    await mongoose.connect(MONGODB_URI); 
});

// Clear database after each test
afterEach(async () => {
    await User.deleteMany({});
});

// Close database connection after all tests
afterAll(async () => {
    await mongoose.connection.close();
});

describe('User Controller - Update User Details', () => {
    let testUser;
    let accessToken;
    let demoRoleId;

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

        // Create a demo role ID
        demoRoleId = new mongoose.Types.ObjectId().toString();
    });

    test('should update user details with valid data', async () => {
        const response = await request(app)
            .put('/api/users/me')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                name: 'Updated Name',
                role: demoRoleId
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('User details updated successfully');
        expect(response.body.data.user.name).toBe('Updated Name');
        expect(response.body.data.user.role).toBe(demoRoleId);
    });

    test('should not update user details without auth token', async () => {
        const response = await request(app)
            .put('/api/users/me')
            .send({
                name: 'Updated Name'
            });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Not authorized to access this route');
    });

    test('should not update user details when no fields provided', async () => {
        const response = await request(app)
            .put('/api/users/me')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Name or role is missing');
    });

    test('should update only provided fields', async () => {
        const response = await request(app)
            .put('/api/users/me')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                name: 'Updated Name'
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user.name).toBe('Updated Name');
        expect(response.body.data.user.role).toBe(null); // Default value
    });

    test('should not update user details with invalid token', async () => {
        const response = await request(app)
            .put('/api/users/me')
            .set('Authorization', 'Bearer invalid-token')
            .send({
                name: 'Updated Name'
            });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Not authorized to access this route');
    });

    test('should not update user details with invalid role id', async () => {
        const response = await request(app)
            .put('/api/users/me')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                role: 'invalid-role-id'
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Invalid role ID');
    });
});
