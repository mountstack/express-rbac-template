const ErrorHandler = require('../utils/ErrorHandler'); 
const mongoose = require('mongoose');

const hasPermission = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return next(ErrorHandler.unauthorized('Not authorized to access this route'));
            }

            // Business owners have all permissions
            if (req.user.type === process.env.USER_TYPES.split(',')[0]) {
                return next();
            }

            // Check if user has a role
            if (!req.user.role) {
                return next(ErrorHandler.forbidden('You do not have permission to perform this action'));
            } 

            const hasRequiredPermission = req.user.role.permissions.some(
                permission => permission.name === requiredPermission);
            if (!hasRequiredPermission) {
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

