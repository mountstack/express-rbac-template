const express = require('express');
const router = express.Router();
const { updateUserDetails, setUserRole } = require('../controllers/user/user');
const protect = require('../middleware/protect');
const { hasPermission } = require('../middleware/authorize');

// User Routes
router.put('/edit', protect, updateUserDetails);
router.put('/set-new-role', protect, hasPermission('role_edit'), setUserRole);

module.exports = router;
