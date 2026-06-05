const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
    listResumes,
    getResumeById,
    getResumeStats,
    updateResumeStatus,
    rescreenResume,
} = require('../controllers/resumeController');

router.use(protect);

router.get('/', authorize('admin', 'hr'), listResumes);
router.get('/stats', authorize('admin', 'hr'), getResumeStats);
router.post('/:id/rescreen', authorize('admin', 'hr'), rescreenResume);
router.get('/:id', authorize('admin', 'hr'), getResumeById);
router.put('/:id/status', authorize('admin', 'hr'), updateResumeStatus);

module.exports = router;
