const User = require('../../models/User');
const ErrorHandler = require('../../utils/ErrorHandler');
const mongoose = require('mongoose');
const Role = require('../../models/role/Role');

exports.updateUserDetails = async (req, res, next) => {
    /*
        #swagger.tags = ['User']
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.summary = 'Update user details'
        #swagger.description = 'Update user profile information'
        #swagger.parameters['obj'] = {
            in: 'body',
            description: 'User details to update',
            required: true,
            schema: {
                name: 'John Doe'
            }
        }
    */
    try {
        const { name } = req.body; 
        const userId = req.user._id; 

        if(!name) { 
            return next(ErrorHandler.badRequest('Name is missing'));
        }

        // Update user
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: { name } },
            { new: true }
        ); 

        if (!updatedUser) {
            return next(ErrorHandler.notFound('User not found'));
        }

        res.status(200).json({
            success: true,
            message: 'User details updated successfully',
            data: {
                user: {
                    _id: updatedUser._id,
                    name: updatedUser.name
                }
            }
        });
    } 
    catch (error) {
        if (error.name === 'ValidationError') {
            return next(ErrorHandler.badRequest(error.message));
        }
        console.log({message: error.message})
        next(ErrorHandler.serverError('Error updating user details'));
    }
};

exports.setUserRole = async (req, res, next) => {
    /*
        #swagger.tags = ['User']
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.summary = 'Set user role'
        #swagger.description = 'Set or update role for a user'
        #swagger.parameters['obj'] = {
            in: 'body',
            description: 'User role details',
            required: true,
            schema: {
                roleId: ''
            }
        }
    */
    try {
        const { roleId } = req.body;
        const userId = req.user._id; 

        if (!roleId) {
            return next(ErrorHandler.badRequest('Role ID is required'));
        }

        // Validate role ID format
        if (!mongoose.Types.ObjectId.isValid(roleId)) {
            return next(ErrorHandler.badRequest('Invalid role ID format'));
        }

        // Update user role
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: { role: roleId } },
            { new: true }
        );

        if (!updatedUser) {
            return next(ErrorHandler.notFound('User not found'));
        }

        res.status(200).json({
            success: true,
            message: 'User role updated successfully',
            data: {
                user: {
                    _id: updatedUser._id,
                    email: updatedUser.email,
                    role: updatedUser.role
                }
            }
        });
    } 
    catch (error) {
        if (error.name === 'ValidationError') {
            return next(ErrorHandler.badRequest(error.message));
        }
        next(ErrorHandler.serverError('Error updating user role'));
    }
};
