const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
    listResumes,
    getResumeById,
    getResumeStats,
    updateResumeStatus,
    screenPendingResumes,
    rescreenResume,
    autoShortlist,
    compareResumeCandidates,
} = require('../controllers/resumeController');

router.use(protect);

router.get('/', authorize('admin', 'hr'), listResumes);
router.get('/stats', authorize('admin', 'hr'), getResumeStats);
router.post('/compare', authorize('admin', 'hr'), compareResumeCandidates);
router.post('/screen-pending', authorize('admin', 'hr'), screenPendingResumes);
router.post('/auto-shortlist', authorize('admin', 'hr'), autoShortlist);
router.post('/:id/rescreen', authorize('admin', 'hr'), rescreenResume);
router.get('/:id', authorize('admin', 'hr'), getResumeById);
router.put('/:id/status', authorize('admin', 'hr'), updateResumeStatus);
router.get('/job/:jobId', protect, async (req, res) => {
    req.query.jobId = req.params.jobId;
    return require('../controllers/resumeController').listResumes(req, res);
});

module.exports = router;
