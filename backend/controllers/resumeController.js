const path = require('path');
const Resume = require('../models/Resume');
const Job = require('../models/Job');
const { applyScreeningToResume } = require('../utils/aiScreening');
const { compareCandidates } = require('../utils/aiCompare');

const buildRecruitmentStats = (resumes) => {
    const stats = {
        applicationsReceived: resumes.length,
        aiShortlisted: 0,
        needsReview: 0,
        rejected: 0,
        pendingScreening: 0,
        highlyRecommended: 0,
        recommended: 0,
    };

    resumes.forEach((resume) => {
        if (resume.status === 'pending' || !resume.aiAnalysis?.score) {
            stats.pendingScreening += 1;
            return;
        }

        const value = resume.aiAnalysis?.recommendation || '';
        if (value === 'Highly Recommended') {
            stats.highlyRecommended += 1;
            stats.aiShortlisted += 1;
            return;
        }
        if (value === 'Recommended') {
            stats.recommended += 1;
            stats.aiShortlisted += 1;
            return;
        }
        if (value === 'Not Recommended') {
            stats.rejected += 1;
            return;
        }
        stats.needsReview += 1;
    });

    return stats;
};

const assignRanks = (resumes) => {
    const screened = resumes
        .filter((r) => r.aiAnalysis?.score > 0)
        .sort((a, b) => (b.aiAnalysis?.score || 0) - (a.aiAnalysis?.score || 0));

    screened.forEach((resume, index) => {
        if (resume.aiAnalysis) {
            resume.aiAnalysis.rank = index + 1;
        }
    });
    return resumes;
};

// @desc    HR/Admin: list resumes ranked by AI score
// @route   GET /api/resumes
const listResumes = async (req, res) => {
    try {
        const { jobId, status, recommendation } = req.query;
        const query = {};
        if (jobId) query.job = jobId;
        if (status) query.status = status;
        if (recommendation) query['aiAnalysis.recommendation'] = recommendation;

        let resumes = await Resume.find(query)
            .populate('job', 'title department')
            .sort({ 'aiAnalysis.score': -1, createdAt: -1 });

        resumes = assignRanks(resumes);

        res.status(200).json({ success: true, count: resumes.length, data: resumes });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    HR/Admin: get single application with full AI analysis
// @route   GET /api/resumes/:id
const getResumeById = async (req, res) => {
    try {
        const resume = await Resume.findById(req.params.id).populate(
            'job',
            'title department description skills education experience requirements'
        );
        if (!resume) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }

        const jobResumes = await Resume.find({ job: resume.job._id })
            .sort({ 'aiAnalysis.score': -1 });
        const rank = jobResumes.findIndex((r) => String(r._id) === String(resume._id)) + 1;
        if (rank > 0 && resume.aiAnalysis) {
            resume.aiAnalysis.rank = rank;
        }

        res.status(200).json({ success: true, data: resume });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    HR/Admin: recruitment funnel stats by job
// @route   GET /api/resumes/stats
const getResumeStats = async (req, res) => {
    try {
        const { jobId } = req.query;
        if (!jobId) {
            return res.status(400).json({ success: false, message: 'jobId is required' });
        }

        const resumes = await Resume.find({ job: jobId });
        const stats = buildRecruitmentStats(resumes);

        res.status(200).json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    HR/Admin: update resume status (shortlist/reject/interview)
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

// @desc    HR/Admin: re-run AI screening (retry failed/pending)
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

// @desc    HR/Admin: AI auto-shortlist top candidates by score threshold
// @route   POST /api/resumes/auto-shortlist
const autoShortlist = async (req, res) => {
    try {
        const { jobId, minScore, topN } = req.body;
        if (!jobId) {
            return res.status(400).json({ success: false, message: 'jobId is required' });
        }

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        const threshold = Number(minScore ?? job.autoShortlist?.minScore ?? 75);
        const limit = Number(topN ?? job.autoShortlist?.topN ?? 10);

        const candidates = await Resume.find({
            job: jobId,
            status: { $nin: ['rejected', 'selected'] },
            'aiAnalysis.score': { $gte: threshold },
        })
            .sort({ 'aiAnalysis.score': -1 })
            .limit(limit);

        const ids = candidates.map((c) => c._id);
        await Resume.updateMany(
            { _id: { $in: ids } },
            { status: 'shortlisted' }
        );

        res.status(200).json({
            success: true,
            message: `${candidates.length} candidate(s) auto-shortlisted (score ≥ ${threshold})`,
            data: {
                shortlisted: candidates.length,
                threshold,
                topN: limit,
                candidates: candidates.map((c) => ({
                    id: c._id,
                    name: c.candidateName,
                    score: c.aiAnalysis?.score,
                    recommendation: c.aiAnalysis?.recommendation,
                })),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    HR/Admin: AI comparison report for multiple candidates
// @route   POST /api/resumes/compare
const compareResumeCandidates = async (req, res) => {
    try {
        const { resumeIds } = req.body;
        if (!resumeIds?.length || resumeIds.length < 2) {
            return res.status(400).json({ success: false, message: 'Select at least 2 candidates to compare' });
        }

        const resumes = await Resume.find({ _id: { $in: resumeIds } }).populate('job');
        if (resumes.length < 2) {
            return res.status(404).json({ success: false, message: 'Candidates not found' });
        }

        const jobIds = [...new Set(resumes.map((r) => String(r.job._id)))];
        if (jobIds.length > 1) {
            return res.status(400).json({ success: false, message: 'All candidates must be for the same job' });
        }

        const report = await compareCandidates({ job: resumes[0].job, candidates: resumes });

        res.status(200).json({ success: true, data: report });
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
    autoShortlist,
    compareResumeCandidates,
};
