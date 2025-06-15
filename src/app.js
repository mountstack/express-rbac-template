const express = require('express');
require('dotenv').config();
const cors = require('cors');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const colors = require('colors');
const connectDB = require('./config/dbConnection');
const ErrorHandler = require('./utils/ErrorHandler');
const errorMiddleware = require('./utils/errorMiddleware');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./config/swagger/swagger-output.json');

// Import Routes
const authRoutes = require('./routes/auth');
const roleRoutes = require('./routes/role');
const permissionRoutes = require('./routes/permission');

// Enable colors
colors.enable();

// Create Express app
const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use(cors());

// Set security headers
// app.use(helmet());

// Sanitize data
// app.use(mongoSanitize());

// Prevent XSS attacks
// app.use(xss());

// Rate limiting
const limiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 300 // limit each IP to 300 requests per windowMs
});
app.use(limiter);

// Swagger Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, { docExpansion: 'list' }));

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);

// Basic route
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'E-commerce API is running'
    });
});

// Non-Standard Routes 
app.use(function (req, res, next) {
    next(ErrorHandler.notFound('Route Not Found'));
});

// Error Handling Middleware 
// Only use production error middleware if not in test environment
if (process.env.NODE_ENV !== 'test') {
    app.use(errorMiddleware);
}

// Only start the server if this file is run directly
if (require.main === module) {
    const PORT = process.env.PORT || 8000;

    // Connect to database and start server
    const startServer = async () => {
        try {
            await connectDB();
            app.listen(PORT, () => {
                console.log(`Server is running on port ${PORT}`.yellow.bold);
            });
        }
        catch (error) {
            console.error(`Error starting server: ${error.message}`.red.underline.bold);
            process.exit(1);
        }
    };

    startServer();
}

module.exports = app; 