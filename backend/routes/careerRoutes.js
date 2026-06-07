const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const {
    listPublicJobs, getPublicJob, applyToJob, getCandidateApplications, getCandidateOffers,
} = require('../controllers/careerController');
const {
    getCandidateInterview, startCandidateInterview,
    evaluateCandidateAnswer, finishCandidateInterview,
} = require('../controllers/candidateInterviewController');
const { protect } = require('../middleware/auth');
const Resume = require('../models/Resume');
const InterviewSession = require('../models/InterviewSession');
const { respondToOffer } = require('../controllers/hiringController');

const router = express.Router();

// ── File Upload Setup ─────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '..', 'uploads', 'resumes');
const ensureUploadDir = () => { if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true }); };

const storage = multer.diskStorage({
    destination: (req, file, cb) => { ensureUploadDir(); cb(null, uploadDir); },
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safeName}`);
    },
});
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') return cb(new Error('Only PDF files are allowed'));
        cb(null, true);
    },
    limits: { fileSize: 8 * 1024 * 1024 },
});

// ── Public Job Listings ───────────────────────────────────────────────────────
router.get('/jobs', listPublicJobs);
router.get('/jobs/:id', getPublicJob);
router.post('/jobs/:id/apply', upload.single('resume'), applyToJob);

// ── Candidate Application Tracking (by email — public) ───────────────────────
router.get('/applications', getCandidateApplications);

// ── Candidate Portal (requires auth — candidate role) ────────────────────────

// GET /api/careers/my-applications — for logged-in candidate users
router.get('/my-applications', protect, async (req, res) => {
    try {
        const user = req.user;
        const applications = await Resume.find({ candidateEmail: user.email.toLowerCase() })
            .populate('job', 'title department location status')
            .populate('interviewSession')
            .sort({ createdAt: -1 });

        const data = applications.map(app => ({
            _id: app._id,
            candidateName: app.candidateName,
            candidateEmail: app.candidateEmail,
            status: app.status,
            screeningStatus: app.screeningStatus,
            createdAt: app.createdAt,
            job: app.job,
            aiScore: app.aiAnalysis?.score || 0,
            aiRecommendation: app.aiAnalysis?.recommendation || '',
            interviewToken: app.interviewToken || null,
            interviewSessionId: app.interviewSession?._id || null,
            interviewStatus: app.interviewSession?.status || null,
            interviewDeadline: app.interviewDeadline || null,
            interviewAssignedAt: app.interviewAssignedAt || null,
            hasInterview: Boolean(app.interviewToken),
        }));

        res.json({ success: true, count: data.length, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get('/my-offers', protect, getCandidateOffers);

router.post('/offers/:offerId/respond', protect, respondToOffer);

// GET /api/careers/my-interviews — list assigned interview sessions for logged-in candidate
router.get('/my-interviews', protect, async (req, res) => {
    try {
        const resumes = await Resume.find({
            candidateEmail: req.user.email.toLowerCase(),
            interviewToken: { $exists: true, $ne: '' },
        }).populate('job', 'title department location');

        const interviewIds = resumes.map(r => r.interviewSession).filter(Boolean);
        const sessions = await InterviewSession.find({ _id: { $in: interviewIds } })
            .populate('job', 'title department location');

        const data = resumes.map(resume => {
            const session = sessions.find(s => s._id.toString() === resume.interviewSession?.toString());
            return {
                resumeId: resume._id,
                token: resume.interviewToken,
                jobTitle: resume.job?.title || session?.jobTitle || '',
                department: resume.job?.department || '',
                location: resume.job?.location || '',
                status: session?.status || 'pending',
                assignedAt: resume.interviewAssignedAt,
                deadline: resume.interviewDeadline,
                sessionId: session?._id || null,
                finalScore: session?.finalScore || null,
                recommendation: session?.report?.recommendation || null,
            };
        });

        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── Interview Session via Token (candidate-facing, no auth needed) ────────────
router.get('/interview/:token', getCandidateInterview);
router.post('/interview/:token/start', startCandidateInterview);
router.post('/interview/:token/evaluate-answer', evaluateCandidateAnswer);
router.post('/interview/:token/finish', finishCandidateInterview);

module.exports = router;
