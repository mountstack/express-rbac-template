class ErrorHandler extends Error { 
    constructor(status, message) { 
        super(message);
        this.status = status;
        this.message = message;
        this.timestamp = new Date().toISOString();
        Error.captureStackTrace(this, this.constructor);
    } 

    static badRequest(message = 'Bad Request') {
        return new ErrorHandler(400, message); 
    }
    
    static unauthorized(message = 'Unauthorized') {
        return new ErrorHandler(401, message); 
    } 

    static paymentRequired(message = 'Payment Required!') {
        return new ErrorHandler(402, message); 
    }

    static forbidden(message = 'Access Denied!') { 
        return new ErrorHandler(403, message); 
    } 

    static notFound(message = 'Data Not Found!') {
        return new ErrorHandler(404, message); 
    }

    static conflict(message = 'Conflict Occured!') {
        return new ErrorHandler(409, message); 
    }

    static validationError(message = 'Fields Are Required!') {
        return new ErrorHandler(422, message); 
    } 

    static tooManyRequests(message = 'Excced the max limit!') { 
        return new ErrorHandler(429, message); 
    } 

    static serverError(message = 'Internal server Error') {
        return new ErrorHandler(500, message); 
    }
}

module.exports = ErrorHandler; 