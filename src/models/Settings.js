const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    siteName: {
        type: String, 
        default: 'Fairy Style'
    },
    siteLogo: {
        type: String,
        default: ''
    },
    siteFavicon: {
        type: String,
        default: ''
    },
    contactEmail: {
        type: String,
        default: ''
    },
    contactPhone: {
        type: String,
        default: ''
    },
    address: {
        type: String,
        default: ''
    },
    socialLinks: {
        facebook: { type: String, default: '' },
        twitter: { type: String, default: '' },
        instagram: { type: String, default: '' },
        linkedin: { type: String, default: '' }
    },
    primaryColor: {
        type: String,
        default: '#cd0269'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Settings', settingsSchema);
