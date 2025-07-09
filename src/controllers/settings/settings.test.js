const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const Settings = require('../../models/Settings');
const User = require('../../models/User');
const Role = require('../../models/role/Role');
const Permission = require('../../models/role/Permission');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const testErrorMiddleware = require('../../utils/testErrorMiddleware');

dotenv.config();

// Override error middleware for testing
app.use(testErrorMiddleware);

// Helper to create a user with specific permissions and return JWT
const createTestUser = async (permissions = ['company_setting_edit'], roleName = null, type = process.env.ADMIN_USER_TYPE || 'BUSINESS-OWNER') => {
    // Get permission IDs
    const permissionDocs = await Permission.find({ name: { $in: permissions } });
    const permissionIds = permissionDocs.map(p => p._id);
    // Fallback if no permissions
    if (permissionIds.length === 0) {
        const fallback = await Permission.create({ name: 'company_setting_edit', label: 'Edit Company Settings', module: 'settings' });
        permissionIds.push(fallback._id);
    }
    // Create role
    const role = await Role.create({
        name: roleName || `Test Role ${Date.now()}`,
        permissions: permissionIds
    });
    // Create user
    const user = await User.create({
        email: `test${Date.now()}@gmail.com`,
        password: '12345678',
        type,
        role: role._id
    });
    // Generate JWT
    const token = jwt.sign(
        { _id: user._id },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
    return { user, role, token };
};

describe('Settings Controller', () => {
    beforeAll(async () => {
        const MONGODB_URI = process.env.MONGODB_LOCAL_TEST_URI;
        await mongoose.connect(MONGODB_URI);
        // Ensure permission exists
        if (!(await Permission.findOne({ name: 'company_setting_edit' }))) {
            await Permission.create({ name: 'company_setting_edit', label: 'Edit Company Settings', module: 'settings' });
        }
    });

    afterEach(async () => {
        await Settings.deleteMany({});
        await User.deleteMany({});
        await Role.deleteMany({});
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe('GET /api/settings', () => {
        it('should return settings if found', async () => {
            const doc = await Settings.create({ siteName: 'Fairy Style' });
            const res = await request(app).get('/api/settings');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.settings.siteName).toBe('Fairy Style');
        });

        it('should return 404 if settings not found', async () => {
            const res = await request(app).get('/api/settings');
            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/not found/i);
        });
    });

    describe('PUT /api/settings', () => {
        it('should create new settings if not found', async () => {
            const { token } = await createTestUser(['company_setting_edit']);
            const body = { siteName: 'Fairy Style', primaryColor: '#cd0269' };
            const res = await request(app)
                .put('/api/settings')
                .set('Authorization', `Bearer ${token}`)
                .send(body);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.settings.siteName).toBe('Fairy Style');
        });

        it('should update existing settings', async () => {
            await Settings.create({ siteName: 'Old Name', primaryColor: '#000000' });
            const { token } = await createTestUser(['company_setting_edit']);
            const body = { siteName: 'New Name', primaryColor: '#cd0269' };
            const res = await request(app)
                .put('/api/settings')
                .set('Authorization', `Bearer ${token}`)
                .send(body);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.settings.siteName).toBe('New Name');
        });

        it('should not allow unauthenticated user', async () => {
            const body = { siteName: 'Fairy Style', primaryColor: '#cd0269' };
            const res = await request(app)
                .put('/api/settings')
                .send(body);
            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('should allow bussiness-owner to edit settings permission', async () => {
            // Create business-owner
            const { token } = await createTestUser();
            const body = { siteName: 'Fairy Style', primaryColor: '#cd0269' };
            const res = await request(app)
                .put('/api/settings')
                .set('Authorization', `Bearer ${token}`)
                .send(body);
            
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('should not allow user without company_setting_edit permission', async () => {
            // Create user with unrelated permission
            const { token } = await createTestUser(['role_view'], null, 'CUSTOMER');
            const body = { siteName: 'Fairy Style', primaryColor: '#cd0269' };
            const res = await request(app)
                .put('/api/settings')
                .set('Authorization', `Bearer ${token}`)
                .send(body);
            
            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });
    });
});
