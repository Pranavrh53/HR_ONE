const path = require('path');
const Job = require('../models/Job');
const Resume = require('../models/Resume');
const OfferLetter = require('../models/OfferLetter');
const HiringDecision = require('../models/HiringDecision');
const { enqueueScreening } = require('../utils/screeningQueue');
const { sendApplicationConfirmation } = require('../utils/emailService');

// @desc    Public: list open jobs
// @route   GET /api/careers/jobs
const listPublicJobs = async (req, res) => {
    try {
        const jobs = await Job.find({ status: 'open' }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: jobs.length, data: jobs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Public: get job details
// @route   GET /api/careers/jobs/:id
const getPublicJob = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job || job.status !== 'open') {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }
        res.status(200).json({ success: true, data: job });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Public: apply to job — respond immediately, AI screens in background
// @route   POST /api/careers/jobs/:id/apply
const applyToJob = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job || job.status !== 'open') {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        const { candidateName, candidateEmail, candidatePhone } = req.body;
        if (!candidateName || !candidateEmail) {
            return res.status(400).json({ success: false, message: 'Name and email are required' });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Resume PDF is required' });
        }

        const resume = await Resume.create({
            job: job._id,
            candidateName,
            candidateEmail,
            candidatePhone: candidatePhone || '',
            resumeFile: path.posix.join('uploads', 'resumes', req.file.filename),
            status: 'applied',
            screeningStatus: 'pending',
        });

        job.applicants = (job.applicants || 0) + 1;
        await job.save();

        enqueueScreening(resume._id, job._id, req.file.path);

        // Send confirmation email (non-blocking)
        sendApplicationConfirmation({
            candidateName: resume.candidateName,
            candidateEmail: resume.candidateEmail,
            jobTitle: job.title,
        }).catch(err => console.error('Email error:', err.message));

        return res.status(201).json({
            success: true,
            message: 'Application submitted successfully! You will receive updates as your application progresses.',
            data: {
                applicationId: resume._id,
                candidateName: resume.candidateName,
                candidateEmail: resume.candidateEmail,
                jobTitle: job.title,
                status: 'applied',
                screeningStatus: 'pending',
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Public: get candidate applications by email (no ATS scores exposed)
// @route   GET /api/careers/applications
const getCandidateApplications = async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const applications = await Resume.find({ candidateEmail: String(email).toLowerCase() })
            .populate('job', 'title department status')
            .populate('hiringDecision')
            .populate('offerLetter')
            .populate('onboardingRecord')
            .sort({ createdAt: -1 });

        const sanitized = applications.map((app) => ({
            _id: app._id,
            candidateName: app.candidateName,
            candidateEmail: app.candidateEmail,
            status: app.status,
            screeningStatus: app.screeningStatus,
            createdAt: app.createdAt,
            job: app.job,
            hasInterview: Boolean(app.interviewToken),
            interviewReady: app.status === 'shortlisted' && Boolean(app.interviewToken),
            interviewCompleted: app.status === 'interviewed' || app.status === 'awaiting_hr_review',
            interviewUrl: app.interviewToken ? `/careers/interview/${app.interviewToken}` : null,
            hiringScore: app.hiringScore || 0,
            hiringRecommendation: app.hiringRecommendation || '',
            offerStatus: app.offerLetter?.status || '',
            offerLetterId: app.offerLetter?._id || null,
            offerFileUrl: app.offerLetter?.filePath ? `/uploads/offers/${path.basename(app.offerLetter.filePath)}` : null,
            onboardingStatus: app.onboardingRecord?.status || '',
        }));

        res.status(200).json({ success: true, count: sanitized.length, data: sanitized });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Candidate: list offer letters and onboarding status
// @route   GET /api/careers/my-offers
const getCandidateOffers = async (req, res) => {
    try {
        const email = req.user.email.toLowerCase();
        const applications = await Resume.find({ candidateEmail: email })
            .populate('job', 'title department location')
            .populate('hiringDecision')
            .populate('offerLetter')
            .populate('onboardingRecord')
            .sort({ createdAt: -1 });

        const offers = applications
            .filter((app) => app.offerLetter)
            .map((app) => ({
                applicationId: app._id,
                candidateName: app.candidateName,
                candidateEmail: app.candidateEmail,
                job: app.job,
                hiringDecision: app.hiringDecision,
                hiringScore: app.hiringScore || 0,
                hiringRecommendation: app.hiringRecommendation || '',
                offer: {
                    _id: app.offerLetter._id,
                    status: app.offerLetter.status,
                    salary: app.offerLetter.salary,
                    joiningDate: app.offerLetter.joiningDate,
                    reportingManager: app.offerLetter.reportingManager,
                    companyDetails: app.offerLetter.companyDetails,
                    fileUrl: app.offerLetter.filePath ? `/uploads/offers/${path.basename(app.offerLetter.filePath)}` : null,
                    generatedAt: app.offerLetter.generatedAt,
                },
                onboardingStatus: app.onboardingRecord?.status || '',
            }));

        res.status(200).json({ success: true, count: offers.length, data: offers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    listPublicJobs,
    getPublicJob,
    applyToJob,
    getCandidateApplications,
    getCandidateOffers,
};
