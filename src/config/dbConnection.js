const mongoose = require('mongoose'); 

const connectDB = async () => {

    console.log('');
    console.log(''); 
    console.table({Database: process.env.NODE_ENV}); 
    console.log('');
    console.log('');

    if(process.env.NODE_ENV === 'test') return; 
    
    try {
        const dbUri = { 
            production: process.env.MONGODB_URI,  
            development: process.env.MONGODB_LOCAL_URI,
        } 
        
        const MONGODB_URI = dbUri[process.env.NODE_ENV];

        const conn = await mongoose.connect(MONGODB_URI);
        console.log(`MongoDB Connected: ${process.env.NODE_ENV}`.white.underline);
    }
    catch (error) {
        console.error(`Error: ${error.message}`.red.underline.bold);
        process.exit(1);
    }
};

module.exports = connectDB; 