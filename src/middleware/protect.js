const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ErrorHandler = require('../utils/ErrorHandler'); 

const protect = async (req, res, next) => { 
    try { 
        let token; 

        // Check if token exists in headers
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return next(ErrorHandler.unauthorized('Not authorized to access this route'));
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET); 

            // Get user from token
            const user = await User.findById(decoded._id)
                .populate({
                    path: 'role',
                    populate: {
                        path: 'permissions' 
                    }
                });

            if (!user) {
                console.log('User not found for ID:', decoded._id);
                return next(ErrorHandler.unauthorized('User not found'));
            }

            // Check if user is suspended
            if (user.suspended) {
                return next(ErrorHandler.unauthorized('Your account has been suspended. Please contact support.'));
            }

            // Add user to request object
            req.user = user;
            next();
        } 
        catch (error) { 
            return next(ErrorHandler.unauthorized('Not authorized to access this route'));
        }
    } 
    catch (error) {
        next(ErrorHandler.serverError('Error in authentication'));
    }
};

module.exports = protect; 