const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Permission name is required!'],
        unique: true,
        trim: true
    },
    label: {
        type: String,
        trim: true
    },
    module: {
        type: String,
        required: true,
        trim: true
    } 
}, {
    timestamps: true 
});

module.exports = mongoose.model('Permission', permissionSchema);