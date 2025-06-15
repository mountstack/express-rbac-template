require('dotenv').config();
const swaggerAutogen = require('swagger-autogen')();

const doc = {
    info: {
        title: 'E-commerce API',
        description: 'A robust e-commerce backend API built with Node.js, Express, and MongoDB'
    },
    host: `localhost:${process.env.PORT || 8080}`,
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json'], 
    securityDefinitions: {
        bearerAuth: {
            type: 'apiKey',
            name: 'Authorization',
            scheme: 'bearer',
            in: 'header',
            bearerFormat: 'JWT'
        }
    } 
};

const outputFile = './src/config/swagger/swagger-output.json';
const endpointsFiles = ['./src/app.js'];

/* NOTE: If you are using the express Router, you must pass in the 'routes' only the 
root file where the route starts, such as index.js, app.js, routes.js, etc ... */

swaggerAutogen(outputFile, endpointsFiles, doc); 