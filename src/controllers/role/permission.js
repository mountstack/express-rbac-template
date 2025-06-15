const ErrorHandler = require('../../utils/ErrorHandler');
const mongoose = require('mongoose');

exports.getPermissions = async (req, res, next) => {
    /*
        #swagger.tags = ['Permissions']
        #swagger.summary = 'Get all permissions'
        #swagger.description = 'Retrieves a list of all permissions with their IDs from the database.'
        #swagger.responses[200] = { description: 'Successfully retrieved permissions.' }
        #swagger.security = [{ "bearerAuth": [] }]
    */
    try {
        // Query the database for all permissions
        const dbPermissions = await mongoose.connection.db.collection('permissions')
            .find()
            .toArray();

        res.status(200).json({
            success: true,
            count: dbPermissions.length,
            permissions: dbPermissions
        });
    }
    catch (error) {
        next(ErrorHandler.serverError('Server Error!'));
    }
}; 