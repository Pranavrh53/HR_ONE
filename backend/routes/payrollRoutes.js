const express = require('express');
const router = express.Router();
const { generatePayroll, getMyPayrolls, getPayrollStats } = require('../controllers/payrollController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/my', getMyPayrolls);
router.post('/generate', authorize('admin', 'hr'), generatePayroll);
router.get('/stats', authorize('admin', 'hr'), getPayrollStats);

module.exports = router;
