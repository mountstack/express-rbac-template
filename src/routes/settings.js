const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings/settings');
const protect = require('../middleware/protect');
const authorize = require('../middleware/authorize');

// GET site settings
router.get('/', settingsController.getSettings);

// UPDATE site settings 
router.put('/', 
    protect, 
    authorize.hasPermission('company_setting_edit'), 
    settingsController.updateSettings);

module.exports = router; 