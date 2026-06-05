const express = require('express');
const router = express.Router();
const {
    applyLeave,
    getMyLeaves,
    getAllLeaves,
    updateLeaveStatus,
    getLeaveStats,
} = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.post('/', applyLeave);
router.get('/my', getMyLeaves);
router.get('/stats', authorize('admin', 'hr', 'senior_manager'), getLeaveStats);
router.get('/', authorize('admin', 'hr', 'senior_manager'), getAllLeaves);
router.put('/:id', authorize('admin', 'hr', 'senior_manager'), updateLeaveStatus);

module.exports = router;
