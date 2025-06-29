const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Role name is required!'],
        unique: true,
        trim: true
    },
    permissions: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Permission'
        }],
        required: [true, 'At least one permission is required!'],
        validate: {
            validator: function(permissions) {
                return permissions.length > 0;
            },
            message: 'A role must have at least one permission!'
        }
    }
}, {
    timestamps: true 
});

// Add database indexes for better performance
roleSchema.index({ name: 1 }); 

module.exports = mongoose.model('Role', roleSchema); 