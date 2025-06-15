const express = require('express');
const router = express.Router();
const { getPermissions } = require('../controllers/role/permission');

router.get('/', getPermissions);

module.exports = router; 