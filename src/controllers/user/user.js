const User = require('../../models/User');
const ErrorHandler = require('../../utils/ErrorHandler');

exports.updateUserDetails = async (req, res, next) => {
    /*
        #swagger.tags = ['User']
        #swagger.summary = 'Update user details'
        #swagger.description = 'Update user profile information'
        #swagger.parameters['obj'] = {
            in: 'body',
            description: 'User details to update',
            required: true,
            schema: {
                name: 'John Doe',
                role: 'id'
            }
        }
    */
    try {
        const { name, role } = req.body;
        const userId = req.user._id; 

        if(!name && !role) { 
            return next(ErrorHandler.badRequest('Name or role is missing'));
        }

        // Update user
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    ...(name && { name }),
                    ...(role && { role }) 
                }
            },
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
                    name: updatedUser.name, 
                    role: updatedUser.role || null
                }
            }
        });
    } 
    catch (error) {
        if (error.name === 'ValidationError') {
            return next(ErrorHandler.badRequest(error.message));
        }
        next(ErrorHandler.serverError('Error updating user details'));
    }
};
