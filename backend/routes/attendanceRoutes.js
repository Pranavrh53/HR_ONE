const express = require('express');
const router = express.Router();
const {
    checkIn,
    checkOut,
    getMyAttendance,
    getAllAttendance,
    getAttendanceStats,
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.post('/checkin', checkIn);
router.put('/checkout', checkOut);
router.get('/my', getMyAttendance);
router.get('/stats', authorize('admin', 'hr', 'senior_manager'), getAttendanceStats);
router.get('/', authorize('admin', 'hr', 'senior_manager'), getAllAttendance);

module.exports = router;
