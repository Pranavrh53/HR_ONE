const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const {
    listPublicJobs,
    getPublicJob,
    applyToJob,
    getCandidateApplications,
} = require('../controllers/careerController');
const {
    getCandidateInterview,
    startCandidateInterview,
    evaluateCandidateAnswer,
    finishCandidateInterview,
} = require('../controllers/candidateInterviewController');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads', 'resumes');
const ensureUploadDir = () => {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        ensureUploadDir();
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        cb(null, `${uniqueSuffix}-${safeName}`);
    },
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files are allowed'));
        }
        cb(null, true);
    },
    limits: { fileSize: 8 * 1024 * 1024 },
});

router.get('/jobs', listPublicJobs);
router.get('/jobs/:id', getPublicJob);
router.post('/jobs/:id/apply', upload.single('resume'), applyToJob);
router.get('/applications', getCandidateApplications);
router.get('/interview/:token', getCandidateInterview);
router.post('/interview/:token/start', startCandidateInterview);
router.post('/interview/:token/evaluate-answer', evaluateCandidateAnswer);
router.post('/interview/:token/finish', finishCandidateInterview);

module.exports = router;
