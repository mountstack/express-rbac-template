const express = require('express');
const router = express.Router();
const { signup, signin, refreshAccessToken } = require('../controllers/auth/auth');

// Auth Routes 
router.post('/signup', signup); 
router.post('/signin', signin); 
router.post('/refresh-token', refreshAccessToken); 

module.exports = router; 