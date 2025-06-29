const express = require('express');
const {
    createRole,
    getRoles,
    getRole,
    updateRole,
    deleteRole
} = require('../controllers/role/role');
const protect = require('../middleware/protect');
const { hasPermission } = require('../middleware/authorize');

const router = express.Router();

// Single permission check
router.route('/')
    .post(protect, hasPermission('role_create'), createRole)
    .get(protect, hasPermission('role_manage'), getRoles);

router.route('/:id')
    .get(protect, hasPermission('role_view'), getRole)
    .put(protect, hasPermission('role_edit'), updateRole)
    .delete(protect, hasPermission('role_delete'), deleteRole);

module.exports = router; 