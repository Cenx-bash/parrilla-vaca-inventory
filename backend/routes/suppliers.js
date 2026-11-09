const express = require('express');
const router = express.Router();
const { requireAuth } = require('./auth');
const ctrl = require('../controllers/supplierController');

router.use(requireAuth);

router.get('/',       ctrl.list);
router.post('/',      ctrl.create);
router.put('/:id',    ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;