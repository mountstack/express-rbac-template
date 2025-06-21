const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const User = require('../../models/User');
const dotenv = require('dotenv');
const testErrorMiddleware = require('../../utils/testErrorMiddleware');
const jwt = require('jsonwebtoken');
const { generateTokens } = require('./auth');

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
});

// Close database connection after all tests
afterAll(async () => {
    await mongoose.connection.close();
});

describe('Auth Controller - Signup', () => {
    const validUserData = {
        email: 'test@gmail.com',
        password: '12345678', 
        type: 'CUSTOMER', 
        role: null
    };

    test('should create a new user with valid data', async () => {
        const response = await request(app)
            .post('/api/auth/signup')
            .send(validUserData); 


        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user).toHaveProperty('_id');
        expect(response.body.data.user.type).toBe(validUserData.type);
        expect(response.body.data.user.email).toBe(validUserData.email);
        expect(response.body.data).toHaveProperty('accessToken');
        expect(response.body.data).toHaveProperty('refreshToken');
    });

    test('should not create user with existing email', async () => {
        // First create a user
        await User.create(validUserData);

        // Try to create another user with same email
        const response = await request(app)
            .post('/api/auth/signup')
            .send(validUserData);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Email already exists');
    });

    test('should not create user with invalid email', async () => {
        const response = await request(app)
            .post('/api/auth/signup')
            .send({
                email: 'invalid-email',
                password: '12345678'
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Please provide a valid email address');
    });

    test('should not create user with short password', async () => {
        const response = await request(app)
            .post('/api/auth/signup')
            .send({
                email: 'test@example.com',
                password: '1234567'
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Password must be at least 8 characters long');
    });

    test('should not create employee without role', async () => {
        validUserData.type = 'EMPLOYEE';

        const response = await request(app)
            .post('/api/auth/signup')
            .send(validUserData);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Role is required for EMPLOYEE type');
    });
});

describe('Auth Controller - Signin', () => {
    const validUserData = {
        email: 'test@gmail.com',
        password: '12345678'
    };

    beforeEach(async () => {
        // Create a test user before each test
        await User.create(validUserData);
    });

    test('should signin with valid credentials', async () => {
        const response = await request(app)
            .post('/api/auth/signin')
            .send(validUserData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('User logged in successfully');
        expect(response.body.data.user).toHaveProperty('_id');
        expect(response.body.data.user.email).toBe(validUserData.email);
        expect(response.body.data).toHaveProperty('accessToken');
        expect(response.body.data).toHaveProperty('refreshToken');
    });

    test('should not signin with invalid email', async () => {
        const response = await request(app)
            .post('/api/auth/signin')
            .send({
                email: 'wrong@gmail.com',
                password: '12345678'
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Invalid email or password');
    });

    test('should not signin with invalid password', async () => {
        const response = await request(app)
            .post('/api/auth/signin')
            .send({
                email: 'test@gmail.com',
                password: 'wrongpassword'
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Invalid email or password');
    });

    test('should not signin with missing email', async () => {
        const response = await request(app)
            .post('/api/auth/signin')
            .send({
                password: '12345678'
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Email and password are required');
    });

    test('should not signin with missing password', async () => {
        const response = await request(app)
            .post('/api/auth/signin')
            .send({
                email: 'test@gmail.com'
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Email and password are required');
    });

    test('should not signin with invalid email format', async () => {
        const response = await request(app)
            .post('/api/auth/signin')
            .send({
                email: 'invalid-email',
                password: '12345678'
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Please provide a valid email address');
    });

    test('should not signin with suspended account', async () => {
        // Update user to suspended
        await User.findOneAndUpdate(
            { email: validUserData.email },
            { suspended: true }
        );

        const response = await request(app)
            .post('/api/auth/signin')
            .send(validUserData);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Your account has been suspended. Please contact support.');
    });
});

describe('Auth Controller - Refresh Access Token', () => {
    let testUser;
    let validRefreshToken;

    beforeEach(async () => {
        // Create a test user
        testUser = await User.create({
            email: 'test@gmail.com',
            password: '12345678'
        });

        // Generate tokens for the user
        const { refreshToken } = await generateTokens(testUser);
        validRefreshToken = refreshToken;
    });

    test('should refresh access token with valid refresh token', async () => {
        const response = await request(app)
            .post('/api/auth/refresh-token')
            .send({
                refreshToken: validRefreshToken
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Access token refreshed successfully');
        expect(response.body.data.user).toHaveProperty('_id');
        expect(response.body.data.user.email).toBe('test@gmail.com');
        expect(response.body.data).toHaveProperty('accessToken');
        expect(response.body.data).toHaveProperty('refreshToken');
    });

    test('should not refresh token with missing refresh token', async () => {
        const response = await request(app)
            .post('/api/auth/refresh-token')
            .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Refresh token is required');
    });

    test('should not refresh token with invalid refresh token', async () => {
        const response = await request(app)
            .post('/api/auth/refresh-token')
            .send({
                refreshToken: 'invalid-token'
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Invalid refresh token');
    });

    test('should not refresh token with expired refresh token', async () => {
        // Create an expired token
        const expiredToken = jwt.sign(
            { _id: testUser._id },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '0s' }
        );

        const response = await request(app)
            .post('/api/auth/refresh-token')
            .send({
                refreshToken: expiredToken
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Refresh token has expired');
    });

    test('should not refresh token for suspended user', async () => { 
        const newUser = await User.findByIdAndUpdate(
            testUser._id,
            {
                suspended: true,
                $set: {
                    refreshToken: [`Bearer ${validRefreshToken}`]
                }
            },
            { 
                new: true,
                select: '+refreshToken'  // Explicitly select refreshToken field
            }
        );

        const response = await request(app)
            .post('/api/auth/refresh-token')
            .send({
                refreshToken: validRefreshToken
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Your account has been suspended. Please contact support.');
    });
}); 