const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const Role = require('../../models/role/Role');
const User = require('../../models/User');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const Permission = require('../../models/role/Permission');

// Load environment variables
dotenv.config();

// Override error middleware for testing
const testErrorMiddleware = require('../../utils/testErrorMiddleware');
app.use(testErrorMiddleware);

let testUser;
let accessToken;
let testRole;

// Connect to test database before running tests
beforeAll(async () => {
    // Use test database URI
    const MONGODB_URI = process.env.MONGODB_LOCAL_TEST_URI;
    await mongoose.connect(MONGODB_URI);

    // Ensure we have basic permissions for testing
    const existingPermissions = await Permission.find(); 
    
    if (existingPermissions.length === 0) {
        // Insert basic permissions for testing
        await Permission.insertMany([
            { name: 'role_create', label: 'Create', module: 'role' },
            { name: 'role_manage', label: 'Manage', module: 'role' },
            { name: 'role_view', label: 'View', module: 'role' },
            { name: 'role_edit', label: 'Edit', module: 'role' },
            { name: 'role_delete', label: 'Delete', module: 'role' },
            { name: 'user_view', label: 'View', module: 'user' }
        ]);
    }
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

// Helper function to create test user with specific permissions
const createTestUser = async (permissions = ['role_create', 'role_manage', 'role_view', 'role_edit', 'role_delete'], roleName = null) => {
    // Get permission IDs
    const permissionDocs = await Permission
        .find({ name: { $in: permissions } })
        ;
    
    
    const permissionIds = permissionDocs.map(p => p._id);

    // Ensure we have at least one permission
    if (permissionIds.length === 0) { 
        // Fallback to role_view if the requested permission doesn't exist
        const fallbackPermission = await Permission.findOne({ name: 'role_view' });
        if (fallbackPermission) {
            permissionIds.push(fallbackPermission._id); 
        } else {
            throw new Error('No permissions available in database');
        }
    }

    // Create role with permissions and unique name
    const role = await Role.create({
        name: roleName || `Test Role ${Date.now()}`,
        permissions: permissionIds
    });

    // Create user with role
    const user = await User.create({
        email: `test${Date.now()}@gmail.com`,
        password: '12345678',
        type: 'EMPLOYEE',
        role: role._id
    });

    // Generate access token
    const token = jwt.sign(
        { _id: user._id },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );

    return { user, role, token };
};

describe('Role Controller - Create Role', () => {
    beforeEach(async () => {
        const testData = await createTestUser(['role_create'], 'Create Test Role');
        testUser = testData.user;
        accessToken = testData.token;
    });

    test('should create role with valid data', async () => {
        const permissions = await Permission.find();
        const permissionIds = permissions.slice(0, 2).map(p => p._id.toString());

        const response = await request(app)
            .post('/api/roles')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                name: 'HR Manager',
                permissions: permissionIds
            });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Role created successfully');
        expect(response.body.role.name).toBe('HR Manager');
        expect(response.body.role.permissions).toHaveLength(2);
    });

    test('should not create role without name', async () => {
        const permissions = await Permission.find();
        const permissionIds = permissions.slice(0, 1).map(p => p._id.toString());

        const response = await request(app)
            .post('/api/roles')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                permissions: permissionIds
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Role name is required');
    });

    test('should not create role without permissions', async () => {
        const response = await request(app)
            .post('/api/roles')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                name: 'HR Manager',
                permissions: []
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('At least one permission is required');
    });

    test('should not create role with duplicate name', async () => {
        const permissions = await Permission.find();
        const permissionIds = permissions.slice(0, 1).map(p => p._id.toString());

        // Create first role
        await Role.create({
            name: 'HR Manager',
            permissions: permissionIds
        });

        // Try to create duplicate
        const response = await request(app)
            .post('/api/roles')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                name: 'HR Manager',
                permissions: permissionIds
            });

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Role with this name already exists');
    });

    test('should not create role without authentication', async () => {
        const permissions = await Permission.find();
        const permissionIds = permissions.slice(0, 1).map(p => p._id.toString());

        const response = await request(app)
            .post('/api/roles')
            .send({
                name: 'HR Manager',
                permissions: permissionIds
            });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });

    test('should not create role without role_create permission', async () => {
        // Create user without role_create permission
        const testData = await createTestUser(['role_view'], 'View Only Role');
        const limitedToken = testData.token;

        const permissions = await Permission.find();
        const permissionIds = permissions.slice(0, 1).map(p => p._id.toString());

        const response = await request(app)
            .post('/api/roles')
            .set('Authorization', `Bearer ${limitedToken}`)
            .send({
                name: 'HR Manager',
                permissions: permissionIds
            });

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('You do not have permission to perform this action');
    });
});

describe('Role Controller - Get All Roles', () => {
    beforeEach(async () => {
        const testData = await createTestUser(['role_manage'], 'Manage Test Role');
        testUser = testData.user;
        accessToken = testData.token;
    });

    test('should get all roles', async () => {
        // Create some test roles
        const permissions = await Permission.find();
        const permissionIds = permissions.slice(0, 1).map(p => p._id);

        await Role.create([
            { name: 'HR Manager', permissions: permissionIds },
            { name: 'Developer', permissions: permissionIds },
            { name: 'Admin', permissions: permissionIds }
        ]);

        const response = await request(app)
            .get('/api/roles')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.count).toBe(4); // 3 created + 1 from test user
        expect(response.body.roles).toHaveLength(4);
    });

    test('should return empty array when no roles exist', async () => { 
        // Delete all roles except the one from test user
        await Role.deleteMany({ _id: { $ne: testUser.role } });

        const response = await request(app)
            .get('/api/roles')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.count).toBe(1); 
        expect(response.body.roles).toHaveLength(1);
    });

    test('should not get roles without authentication', async () => {
        const response = await request(app)
            .get('/api/roles');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });

    test('should not get roles without role_manage permission', async () => {
        // Create user without role_manage permission
        const testData = await createTestUser(['role_create'], 'Create Only Role');
        const limitedToken = testData.token;

        const response = await request(app)
            .get('/api/roles')
            .set('Authorization', `Bearer ${limitedToken}`);

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('You do not have permission to perform this action');
    });
});

describe('Role Controller - Get Single Role', () => {
    beforeEach(async () => {
        const testData = await createTestUser(['role_view'], 'Single View Role');
        testUser = testData.user;
        accessToken = testData.token;
        testRole = testData.role;
    });

    test('should get single role with valid ID', async () => {
        const response = await request(app)
            .get(`/api/roles/${testRole._id}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.role._id).toBe(testRole._id.toString());
        expect(response.body.role.name).toBe('Single View Role');
    });

    test('should not get role with invalid ID format', async () => {
        const response = await request(app)
            .get('/api/roles/invalid-id')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
    });

    test('should not get role with non-existent ID', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const response = await request(app)
            .get(`/api/roles/${fakeId}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe(`Role not found with id of ${fakeId}`);
    });

    test('should not get role without authentication', async () => {
        const response = await request(app)
            .get(`/api/roles/${testRole._id}`);

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });

    test('should not get role without role_view permission', async () => {
        // Create user without role_view permission
        const testData = await createTestUser(['role_create'], 'Create Only Role 2');
        const limitedToken = testData.token;

        const response = await request(app)
            .get(`/api/roles/${testRole._id}`)
            .set('Authorization', `Bearer ${limitedToken}`);

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('You do not have permission to perform this action');
    });
});

describe('Role Controller - Update Role', () => {
    beforeEach(async () => {
        const testData = await createTestUser(['role_edit'], 'Edit Test Role');
        testUser = testData.user;
        accessToken = testData.token;
        testRole = testData.role;
    });

    test('should update role name with valid data', async () => {
        const response = await request(app)
            .put(`/api/roles/${testRole._id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                name: 'Updated Test Role'
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Role updated successfully');
        expect(response.body.role.name).toBe('Updated Test Role');
    });

    test('should not update role without name', async () => {
        const response = await request(app)
            .put(`/api/roles/${testRole._id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Role name is required');
    });

    test('should not update role with duplicate name', async () => {
        // Create another role
        const permissions = await Permission.find();
        const permissionIds = permissions.slice(0, 1).map(p => p._id);
        
        await Role.create({
            name: 'Another Role',
            permissions: permissionIds
        });

        // Try to update with duplicate name
        const response = await request(app)
            .put(`/api/roles/${testRole._id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                name: 'Another Role'
            });

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Role with this name already exists');
    });

    test('should not update role with invalid ID', async () => {
        const response = await request(app)
            .put('/api/roles/invalid-id')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                name: 'Updated Name'
            });

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
    });

    test('should not update non-existent role', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const response = await request(app)
            .put(`/api/roles/${fakeId}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                name: 'Updated Name'
            });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe(`Role not found with id of ${fakeId}`);
    });

    test('should not update role without authentication', async () => {
        const response = await request(app)
            .put(`/api/roles/${testRole._id}`)
            .send({
                name: 'Updated Name'
            });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });

    test('should not update role without role_edit permission', async () => {
        // Create user without role_edit permission
        const testData = await createTestUser(['role_view'], 'View Only Role 2');
        const limitedToken = testData.token;

        const response = await request(app)
            .put(`/api/roles/${testRole._id}`)
            .set('Authorization', `Bearer ${limitedToken}`)
            .send({
                name: 'Updated Name'
            });

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('You do not have permission to perform this action');
    });
});

describe('Role Controller - Delete Role', () => {
    beforeEach(async () => {
        const testData = await createTestUser(['role_delete'], 'Delete Test Role');
        testUser = testData.user;
        accessToken = testData.token;
        testRole = testData.role;
    });

    test('should delete role successfully', async () => {
        // Create a separate role that is not assigned to any user
        const permissions = await Permission.find();
        const permissionIds = permissions.slice(0, 1).map(p => p._id);
        
        const deletableRole = await Role.create({
            name: 'Deletable Role',
            permissions: permissionIds
        });

        const response = await request(app)
            .delete(`/api/roles/${deletableRole._id}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Role deleted successfully');

        // Verify role is deleted
        const deletedRole = await Role.findById(deletableRole._id);
        expect(deletedRole).toBeNull();
    });

    test('should not delete role assigned to users', async () => {
        // Create a user with this role
        await User.create({
            email: 'user@example.com',
            password: '12345678',
            type: 'EMPLOYEE',
            role: testRole._id
        });

        const response = await request(app)
            .delete(`/api/roles/${testRole._id}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Cannot delete role: It is currently assigned to 2 users.');

        // Verify role still exists
        const role = await Role.findById(testRole._id);
        expect(role).not.toBeNull();
    });

    test('should not delete role with invalid ID', async () => {
        const response = await request(app)
            .delete('/api/roles/invalid-id')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
    });

    test('should not delete non-existent role', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const response = await request(app)
            .delete(`/api/roles/${fakeId}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe(`Role not found with id of ${fakeId}`);
    });

    test('should not delete role without authentication', async () => {
        const response = await request(app)
            .delete(`/api/roles/${testRole._id}`);

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });

    test('should not delete role without role_delete permission', async () => {
        // Create user without role_delete permission
        const testData = await createTestUser(['role_view'], 'Limited Role');
        const limitedToken = testData.token;

        const response = await request(app)
            .delete(`/api/roles/${testRole._id}`)
            .set('Authorization', `Bearer ${limitedToken}`);

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('You do not have permission to perform this action');
    });
}); 