const path = require('path');
const Resume = require('../models/Resume');
const Job = require('../models/Job');
const { applyScreeningToResume } = require('../utils/aiScreening');

const buildRecommendationBuckets = (resumes) => {
    const buckets = {
        highlyRecommended: 0,
        recommended: 0,
        needsReview: 0,
        rejected: 0,
    };

    resumes.forEach((resume) => {
        const value = resume.aiAnalysis?.recommendation || '';
        if (value === 'Highly Recommended') {
            buckets.highlyRecommended += 1;
            return;
        }
        if (value === 'Recommended') {
            buckets.recommended += 1;
            return;
        }
        if (value === 'Not Recommended') {
            buckets.rejected += 1;
            return;
        }
        buckets.needsReview += 1;
    });

    return buckets;
};

// @desc    HR/Admin: list resumes (optionally by job)
// @route   GET /api/resumes
const listResumes = async (req, res) => {
    try {
        const { jobId, status } = req.query;
        const query = {};
        if (jobId) query.job = jobId;
        if (status) query.status = status;

        const resumes = await Resume.find(query)
            .populate('job', 'title department')
            .sort({ 'aiAnalysis.score': -1, createdAt: -1 });

        res.status(200).json({ success: true, count: resumes.length, data: resumes });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    HR/Admin: get single application
// @route   GET /api/resumes/:id
const getResumeById = async (req, res) => {
    try {
        const resume = await Resume.findById(req.params.id).populate('job', 'title department description skills');
        if (!resume) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }
        res.status(200).json({ success: true, data: resume });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    HR/Admin: application stats by job
// @route   GET /api/resumes/stats
const getResumeStats = async (req, res) => {
    try {
        const { jobId } = req.query;
        if (!jobId) {
            return res.status(400).json({ success: false, message: 'jobId is required' });
        }

        const resumes = await Resume.find({ job: jobId });
        const buckets = buildRecommendationBuckets(resumes);

        res.status(200).json({
            success: true,
            data: {
                total: resumes.length,
                ...buckets,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    HR/Admin: update resume status
// @route   PUT /api/resumes/:id/status
const updateResumeStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['screened', 'shortlisted', 'rejected', 'interview', 'selected', 'pending'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const resume = await Resume.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).populate('job', 'title department');

        if (!resume) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }

        res.status(200).json({ success: true, data: resume });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    HR/Admin: re-run AI screening for pending/failed application
// @route   POST /api/resumes/:id/rescreen
const rescreenResume = async (req, res) => {
    try {
        const resume = await Resume.findById(req.params.id);
        if (!resume) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }

        const job = await Job.findById(resume.job);
        if (!job) {
            return res.status(404).json({ success: false, message: 'Linked job not found' });
        }

        const filePath = path.join(__dirname, '..', resume.resumeFile.replace(/\\/g, '/'));
        const screened = await applyScreeningToResume(resume, job, filePath);

        res.status(200).json({
            success: true,
            message: 'Application re-screened successfully',
            data: screened,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    listResumes,
    getResumeById,
    getResumeStats,
    updateResumeStatus,
    rescreenResume,
};
