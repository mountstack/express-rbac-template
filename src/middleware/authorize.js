const ErrorHandler = require('../utils/ErrorHandler');
const Role = require('../models/role/Role');
const mongoose = require('mongoose');

const hasPermission = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return next(ErrorHandler.unauthorized('Not authorized to access this route'));
            }

            // Business owners have all permissions
            if (req.user.type === 'bussiness owner') {
                return next();
            }

            // Check if user has a role
            if (!req.user.role) {
                return next(ErrorHandler.forbidden('You do not have permission to perform this action'));
            }

            // Get the permission ID from the permissions collection
            const permission = await mongoose.connection.db.collection('permissions')
                .findOne({ name: requiredPermission });

            if (!permission) {
                return next(ErrorHandler.serverError('Invalid permission'));
            }

            // Get user's role and check permission
            const role = await Role.findById(req.user.role);
            if (!role?.permissions?.includes(permission._id)) {
                return next(ErrorHandler.forbidden('You do not have permission to perform this action'));
            }

            next();
        } 
        catch (error) {
            next(ErrorHandler.serverError('Error checking permissions'));
        }
    };
};

module.exports = {
    hasPermission
}; 