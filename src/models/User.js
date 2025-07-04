const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();


const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: false,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String, 
        select: false
    },
    role: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
    },
    type: {
        type: String, 
        enum: process.env.USER_TYPES.split(','),
        default: process.env.DEFAULT_USER_TYPE
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'pending'],
        default: 'active'
    },
    avatar: {
        type: String, 
        default: ''
    },
    suspended: {
        type: Boolean,
        default: false
    },
    theme: {
        type: String,
        enum: ['LIGHT', 'DARK', 'MODERN'],
        default: 'LIGHT'
    },
    refreshToken: [{
        type: String,
        default: [],
        select: false
    }]
}, {
    timestamps: true 
});

userSchema.index({ role: 1 }); 
userSchema.index({ suspended: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare user password
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate Access Token
userSchema.methods.generateAccessToken = function (payload = {}) {
    return jwt.sign(
        { ...payload },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
};

// Generate Refresh Token
userSchema.methods.generateRefreshToken = function (payload = {}) {
    return jwt.sign(
        payload,
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );
};

module.exports = mongoose.model('User', userSchema); 