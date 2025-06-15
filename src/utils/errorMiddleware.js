const ErrorHandler = require('./ErrorHandler');

const errorMiddleware = (err, req, res, next) => {
    err.status = err.status || 500;
    err.message = err.message || 'Internal Server Error';

    const parseStackInfo = (stack) => {
        if (!stack) return { errorAt: 'unknown', triggeredAt: 'unknown' };

        const lines = stack.split('\n');

        const parseStackLine = (line) => {
            line = line.trim().replace(/^at\s+/, '');

            // Match the stack trace pattern: functionName (file:line:col)
            const pattern = /^(.*?)\s+\(?(.+):(\d+):(\d+)\)?$/;

            const match = line.match(pattern);
            if (match) { 
                return {
                    function: match[1].trim(),
                    file: match[2].trim(),
                    line: match[3].trim()
                };
            }

            // Handle cases where the stack trace format is different
            const fallbackPattern = /^([^:]+):(\d+):(\d+)$/;
            const fallbackMatch = line.match(fallbackPattern);
            if (fallbackMatch) {
                return {
                    function: 'anonymous',
                    file: fallbackMatch[1].trim(),
                    line: fallbackMatch[2].trim()
                };
            }

            return null;
        };

        const frames = lines
            .map(parseStackLine)
            .filter(frame => frame && 
                !frame.file.includes('node_modules') && 
                !frame.file.includes('internal'));

        const errorFrame = frames.find(frame => 
            frame.function && frame.function.includes('ErrorHandler'));

        const triggerFrame = frames.find(frame => 
            frame.function && 
            !frame.function.includes('ErrorHandler') &&
            !frame.function.includes('anonymous'));

        return {
            errorAt: errorFrame ? errorFrame.function + ' method' : 'unknown',
            triggeredAt: triggerFrame 
                ? { function: triggerFrame.function, line: triggerFrame.line} 
                : 'unknown'
        };
    };

    const { errorAt, triggeredAt } = parseStackInfo(err.stack);
    const errorTrace = {
        errorAt,
        triggeredAt,
        type: getErrorType(err.status),
        ...(err.status === 422 && { missingFields: extractMissingFields(err) })
    };

    function getErrorType(status) {
        const errorTypes = {
            400: 'Bad Request',
            401: 'Unauthorized',
            402: 'Payment Required',
            403: 'Forbidden',
            404: 'Not Found',
            409: 'Conflict Occurred',
            422: 'Validation Error',
            429: 'Too Many Requests',
            500: 'Server Error'
        };
        return `${errorTypes[status] || 'Unknown Error'} (${status})`;
    }
    
    function extractMissingFields(err) {
        if (Array.isArray(err.fields)) {
            return err.fields;
        }
        
        if (err.message.includes(',')) {
            return err.message
                .split(',')
                .map(field => field.trim())
                .filter(field => field);
        }
        
        return [err.message];
    } 

    const errorResponse = { 
        success: false, 
        hasError: true, 
        status: err.status,
        message: err.message,
        location: errorTrace
    }; 

    return res.status(err.status).json(errorResponse);
};

module.exports = errorMiddleware; 