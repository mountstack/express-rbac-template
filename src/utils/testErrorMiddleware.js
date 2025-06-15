const ErrorHandler = require('./ErrorHandler');

const testErrorMiddleware = (err, req, res, next) => {
    err.status = err.status || 500;
    err.message = err.message || 'Internal Server Error';

    const errorResponse = { 
        success: false, 
        message: err.message
    }; 

    return res.status(err.status).json(errorResponse);
};

module.exports = testErrorMiddleware; 