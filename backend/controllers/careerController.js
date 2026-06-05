const path = require('path');
const Job = require('../models/Job');
const Resume = require('../models/Resume');
const { applyScreeningToResume } = require('../utils/aiScreening');

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

// @desc    Public: apply to job and trigger AI screening
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
            status: 'pending',
        });

        job.applicants = (job.applicants || 0) + 1;
        await job.save();

        try {
            const screened = await applyScreeningToResume(resume, job, req.file.path);
            return res.status(201).json({
                success: true,
                message: screened.aiAnalysis?.analysisMode?.includes('gemini')
                    ? 'Application submitted and ATS-screened (deterministic score + AI explanation)'
                    : 'Application submitted and ATS-screened (deterministic scoring)',
                data: screened,
            });
        } catch (aiError) {
            return res.status(201).json({
                success: true,
                message: 'Application received. AI screening pending — HR can retry from the dashboard.',
                aiError: aiError.message,
                data: resume,
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Public: get candidate applications by email
// @route   GET /api/careers/applications
const getCandidateApplications = async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const applications = await Resume.find({ candidateEmail: String(email).toLowerCase() })
            .populate('job', 'title department status')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: applications.length, data: applications });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    listPublicJobs,
    getPublicJob,
    applyToJob,
    getCandidateApplications,
};
