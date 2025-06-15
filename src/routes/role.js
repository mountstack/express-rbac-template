const express = require('express');
const {
    createRole,
    getRoles,
    getRole,
    updateRole,
    deleteRole
} = require('../controllers/role/role');

const router = express.Router();

router.route('/').post(createRole).get(getRoles);
router.route('/:id').get(getRole).put(updateRole).delete(deleteRole);

module.exports = router; 