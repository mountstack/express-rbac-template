const express = require('express');
const {
    createRole,
    getRoles,
    getRole,
    updateRole,
    deleteRole
} = require('../controllers/role/role');
const { protect, hasPermission } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
    .post(protect, hasPermission('role_create'), createRole)
    .get(protect, hasPermission('role_view'), getRoles);
router.route('/:id')
    .get(protect, hasPermission('role_view'), getRole)
    .put(protect, hasPermission('role_edit'), updateRole)
    .delete(protect, hasPermission('role_delete'), deleteRole);

module.exports = router; 