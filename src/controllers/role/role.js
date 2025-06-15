const Role = require('../../models/role/Role');
const User = require('../../models/User');
const ErrorHandler = require('../../utils/ErrorHandler');

exports.createRole = async (req, res, next) => {
    /*
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.tags = ['Roles']
        #swagger.summary = 'Create a new role'
        #swagger.description = 'Creates a new role with a unique name and at least one permission.'
        #swagger.parameters['obj'] = {
            in: 'body',
            description: 'Role details',
            required: true,
            schema: {
                name: "HR",
                permissions: ["permission_id_1", "permission_id_2"]
            }
        }
    */
    const { name, permissions = [] } = req.body;

    if (!name) {
        return next(ErrorHandler.badRequest('Role name is required'));
    }

    if (permissions.length === 0) {
        return next(ErrorHandler.badRequest('At least one permission is required'));
    }

    try {
        const existingRole = await Role.findOne({ name });
        if (existingRole) {
            return next(ErrorHandler.conflict('Role with this name already exists'));
        }

        const role = await Role.create({ name, permissions });

        res.status(201).json({
            success: true,
            message: 'Role created successfully',
            role
        });
    }
    catch (error) {
        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return next(ErrorHandler.badRequest(messages.join(', ')));
        }
        // Handle other errors
        next(ErrorHandler.serverError(error.message));
    }
};

exports.getRoles = async (req, res, next) => {
    /*
        #swagger.tags = ['Roles']
        #swagger.summary = 'Get all roles'
        #swagger.description = 'Retrieves a list of all roles.'
        #swagger.responses[200] = { description: 'Successfully retrieved roles.' }
        #swagger.security = [{ "bearerAuth": [] }]
    */
    try {
        const roles = await Role.find();
        res.status(200).json({
            success: true,
            count: roles.length,
            roles
        });
    }
    catch (error) {
        next(ErrorHandler.serverError('Server Error!'));
    }
};

exports.getRole = async (req, res, next) => {
    /*
        #swagger.tags = ['Roles']
        #swagger.summary = 'Get a single role'
        #swagger.description = 'Retrieves a single role by its ID.'
        #swagger.parameters['id'] = {
            in: 'path',
            description: 'Role ID',
            required: true,
            type: 'string'
        }
        #swagger.responses[200] = { description: 'Successfully retrieved role.' }
        #swagger.responses[404] = { description: 'Role not found.' }
        #swagger.security = [{ "bearerAuth": [] }]
    */
    try {
        const role = await Role.findById(req.params.id);

        if (!role) {
            return next(ErrorHandler.notFound(`Role not found with id of ${req.params.id}`));
        }

        res.status(200).json({
            success: true,
            role
        });
    }
    catch (error) {
        next(ErrorHandler.serverError('Server Error!'));
    }
};

exports.updateRole = async (req, res, next) => {
    /*
        #swagger.tags = ['Roles']
        #swagger.summary = 'Update an existing role'
        #swagger.description = 'Updates the name of an existing role.'
        #swagger.parameters['id'] = {
            in: 'path',
            description: 'Role ID',
            required: true,
            type: 'string'
        }
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Updated role data',
            required: true,
            schema: { name: "HR" }
        } 
        #swagger.security = [{ "bearerAuth": [] }]
    */
    const { name } = req.body;

    if (!name) {
        return next(ErrorHandler.badRequest('Role name is required'));
    }

    try {
        let role = await Role.findById(req.params.id);

        if (!role) {
            return next(ErrorHandler.notFound(`Role not found with id of ${req.params.id}`));
        }

        // Check if another role with the same name already exists (excluding the current role)
        const existingRole = await Role.findOne({ name, _id: { $ne: req.params.id } });
        if (existingRole) {
            return next(ErrorHandler.conflict('Role with this name already exists'));
        }

        role = await Role.findByIdAndUpdate(req.params.id, { name }, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            message: 'Role updated successfully',
            role
        });
    }
    catch (error) {
        next(ErrorHandler.serverError('Server Error!'));
    }
};

exports.deleteRole = async (req, res, next) => {
    /*
        #swagger.tags = ['Roles']
        #swagger.summary = 'Delete role'
        #swagger.description = 'Deletes a role by its ID.'
        #swagger.parameters['id'] = {
            in: 'path',
            description: 'Role ID',
            required: true,
            type: 'string'
        } 
        #swagger.security = [{ "bearerAuth": [] }]
    */
    try {
        const role = await Role.findById(req.params.id);

        if (!role) {
            return next(ErrorHandler.notFound(`Role not found with id of ${req.params.id}`));
        }

        // Prevent deletion if role is assigned to any user
        const usersWithRole = await User.countDocuments({ role: req.params.id });
        if (usersWithRole > 0) {
            const userOrUsers = usersWithRole === 1 ? 'user' : 'users';
            return next(ErrorHandler.badRequest(`Cannot delete role: It is currently assigned to ${usersWithRole} ${userOrUsers}.`));
        }

        await role.deleteOne(); 

        res.status(200).json({
            success: true,
            message: 'Role deleted successfully'
        });
    }
    catch (error) {
        next(ErrorHandler.serverError('Server Error!'));
    }
};

