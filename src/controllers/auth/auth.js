const User = require('../../models/User');
const ErrorHandler = require('../../utils/ErrorHandler');
const jwt = require('jsonwebtoken');

// Utility function to validate email
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Utility function to validate password
const isValidPassword = (password) => {
    return password.length >= 8;
};

// Utility function to generate tokens
const generateTokens = async (user, next) => {
    if (!user) {
        return next(ErrorHandler.notFound('User not found'));
    }

    try {
        // Access token payload with essential user data
        const accessTokenPayload = {
            _id: user._id,
            email: user.email,
            role: user.role || null,
            type: user.type
        };

        // Generate access token
        const accessToken = jwt.sign(
            accessTokenPayload,
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
        );

        // Generate refresh token with minimal payload
        const refreshToken = jwt.sign(
            { _id: user._id },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
        );

        // Store refresh token in user document, keeping only last 10 tokens
        await User.findByIdAndUpdate(
            user._id,
            {
                $push: {
                    refreshToken: {
                        $each: [`Bearer ${refreshToken}`],
                        $slice: -10 
                    }
                }
            }
        );

        return { accessToken, refreshToken };
    }
    catch (error) {
        return next(ErrorHandler.serverError('Error generating tokens'));
    }
};

exports.generateTokens = generateTokens;

exports.signup = async (req, res, next) => {
    /*
        #swagger.tags = ['Auth']
        #swagger.summary = 'Sign up a new user'
        #swagger.description = 'Create a new user account with email and password'
        #swagger.parameters['obj'] = {
            in: 'body',
            description: 'User signup credentials',
            required: true,
            schema: {
                email: 'user@gmail.com',
                password: '12345678', 
                role: {
                    type: 'string', 
                    default: null
                },
                type: {
                    type: 'string',
                    enum: ['CUSTOMER', 'EMPLOYEE'],
                    description: 'User type',
                    default: 'CUSTOMER'
                }
            }
        }
    */
    try {
        const { email, password, role=null, type='CUSTOMER' } = req.body;

        // Check for required fields
        if (!email || !password) {
            return next(ErrorHandler.badRequest('Email and password are required'));
        }

        // Validate email
        if (!isValidEmail(email)) {
            return next(ErrorHandler.badRequest('Please provide a valid email address'));
        }

        // Validate password
        if (!isValidPassword(password)) {
            return next(ErrorHandler.badRequest('Password must be at least 8 characters long'));
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return next(ErrorHandler.badRequest('Email already exists'));
        }

        if(type === 'EMPLOYEE' && !role) {
            return next(ErrorHandler.badRequest('Role is required for EMPLOYEE type'));
        }

        // Create new user 
        const user = await User.create({ email, password, role, type });

        // Generate tokens
        const { accessToken, refreshToken } = await generateTokens(user, next);

        // Send response with both tokens
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    _id: user._id,
                    email: user.email,
                    role: user.role || null,
                    type: user.type
                },
                accessToken,
                refreshToken
            }
        });
    } 
    catch (error) {
        if (error.name === 'ValidationError') {
            return next(ErrorHandler.badRequest(error.message));
        }
        next(ErrorHandler.serverError('Error in signup'));
    }
};

exports.signin = async (req, res, next) => {
    /*
        #swagger.tags = ['Auth']
        #swagger.summary = 'Sign in a user'
        #swagger.description = 'Authenticate a user with email and password'
        #swagger.parameters['obj'] = {
            in: 'body',
            description: 'User signin credentials',
            required: true,
            schema: {
                email: 'admin@gmail.com',
                password: '12345678'
            } 
        } 
    */ 
    try {
        const { email, password } = req.body;

        // Check for required fields
        if (!email || !password) {
            return next(ErrorHandler.badRequest('Email and password are required'));
        }

        // Validate email
        if (!isValidEmail(email)) {
            return next(ErrorHandler.badRequest('Please provide a valid email address'));
        }

        // Find user and explicitly select password field
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return next(ErrorHandler.badRequest('Invalid email or password'));
        }

        // Check if user is suspended
        if (user.suspended) {
            return next(ErrorHandler.badRequest('Your account has been suspended. Please contact support.'));
        }

        // Compare password
        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            return next(ErrorHandler.badRequest('Invalid email or password'));
        }

        // Generate tokens
        const { accessToken, refreshToken } = await generateTokens(user, next);

        // Send response with both tokens
        res.status(200).json({
            success: true,
            message: 'User logged in successfully',
            data: {
                user: {
                    _id: user._id,
                    email: user.email,
                    role: user.role || null, 
                    type: user.type
                },
                accessToken,
                refreshToken
            }
        });
    } 
    catch (error) {
        next(ErrorHandler.serverError('Error in signin'));
    }
};

exports.refreshAccessToken = async (req, res, next) => {
    /*
        #swagger.tags = ['Auth']
        #swagger.summary = 'Refresh access token'
        #swagger.description = 'Generate new access token using refresh token'
        #swagger.parameters['obj'] = {
            in: 'body',
            description: 'Refresh token',
            required: true,
            schema: {
                refreshToken: ''
            }
        }
    */
    try {
        const { refreshToken } = req.body; 

        // Check if refresh token is provided
        if (!refreshToken) {
            return next(ErrorHandler.badRequest('Refresh token is required'));
        }

        // Verify refresh token
        const decoded = jwt.verify(
            refreshToken.replace('Bearer ', ''),
            process.env.REFRESH_TOKEN_SECRET
        );

        // Find user by id and check if refresh token exists in their tokens array
        const user = await User.findOne({
            _id: decoded._id,
            refreshToken: { $in: [`Bearer ${refreshToken}`] }
        });

        if (!user) {
            return next(ErrorHandler.badRequest('User not found'));
        }

        // Check if user is suspended
        if (user.suspended) {
            return next(ErrorHandler.badRequest('Your account has been suspended. Please contact support.'));
        }

        // Generate new tokens
        const { accessToken, refreshToken: newRefreshToken } = await generateTokens(user, next);

        // Send response with new tokens
        res.status(200).json({
            success: true,
            message: 'Access token refreshed successfully',
            data: {
                user: {
                    _id: user._id,
                    email: user.email,
                    role: user.role || null
                },
                accessToken,
                refreshToken: newRefreshToken
            }
        });
    } 
    catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return next(ErrorHandler.badRequest('Invalid refresh token'));
        }
        if (error.name === 'TokenExpiredError') {
            return next(ErrorHandler.badRequest('Refresh token has expired'));
        }
        next(ErrorHandler.serverError('Error refreshing access token'));
    }
}; 