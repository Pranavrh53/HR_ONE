const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    startInterview,
    evaluateAnswer,
    getNextQuestion,
    finishInterview,
    getReport,
    getInterviewsByJob,
} = require('../controllers/interviewController');

router.post('/start', protect, startInterview);
router.post('/evaluate-answer', protect, evaluateAnswer);
router.post('/next-question', protect, getNextQuestion);
router.post('/finish', protect, finishInterview);
router.get('/report/:id', protect, getReport);
router.get('/list/:jobId', protect, getInterviewsByJob);

module.exports = router;
