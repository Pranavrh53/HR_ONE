const path = require('path');
const Resume = require('../models/Resume');
const Job = require('../models/Job');
const { applyScreeningToResume } = require('../utils/aiScreening');
const { compareCandidates } = require('../utils/aiCompare');
const { screenPendingForJob } = require('../utils/screeningQueue');
const { assignInterviewToCandidate } = require('../utils/interviewAssignment');

const buildRecruitmentStats = (resumes) => {
    const stats = {
        applicationsReceived: resumes.length,
        screeningCompleted: 0,
        screeningPending: 0,
        shortlisted: 0,
        rejected: 0,
        interviewed: 0,
        highlyRecommended: 0,
        recommended: 0,
        needsReview: 0,
        // legacy aliases
        aiShortlisted: 0,
        pendingScreening: 0,
    };

    resumes.forEach((resume) => {
        const screeningDone = resume.screeningStatus === 'completed' && resume.aiAnalysis?.score > 0;
        if (!screeningDone) {
            stats.screeningPending += 1;
            stats.pendingScreening += 1;
        } else {
            stats.screeningCompleted += 1;
        }

        if (['shortlisted', 'interview', 'interviewed'].includes(resume.status)) {
            stats.shortlisted += 1;
        }
        if (resume.status === 'rejected') stats.rejected += 1;
        if (resume.status === 'interviewed' || resume.status === 'selected') stats.interviewed += 1;

        const value = resume.aiAnalysis?.recommendation || '';
        if (value === 'Highly Recommended') {
            stats.highlyRecommended += 1;
            stats.aiShortlisted += 1;
        } else if (value === 'Recommended') {
            stats.recommended += 1;
            stats.aiShortlisted += 1;
        } else if (value === 'Needs Review') {
            stats.needsReview += 1;
        }
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
        if (!['screened', 'shortlisted', 'rejected', 'interview', 'interviewed', 'selected', 'pending'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        let resume = await Resume.findById(req.params.id).populate('job');
        if (!resume) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }

        resume.status = status;
        await resume.save();

        if (status === 'shortlisted' && resume.job) {
            try {
                await assignInterviewToCandidate(resume, resume.job);
            } catch (err) {
                console.error('Interview assignment failed:', err.message);
            }
        }

        res.status(200).json({ success: true, data: resume });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    HR/Admin: screen all pending applications for a job
// @route   POST /api/resumes/screen-pending
const screenPendingResumes = async (req, res) => {
    try {
        const { jobId } = req.body;
        if (!jobId) {
            return res.status(400).json({ success: false, message: 'jobId is required' });
        }

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        const queued = await screenPendingForJob(jobId);

        res.status(200).json({
            success: true,
            message: queued > 0
                ? `AI screening queued for ${queued} pending application(s)`
                : 'All applications are already screened',
            data: { queued },
        });
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

        const interviewResults = [];
        for (const candidate of candidates) {
            try {
                const { token } = await assignInterviewToCandidate(candidate, job);
                interviewResults.push({
                    id: candidate._id,
                    name: candidate.candidateName,
                    score: candidate.aiAnalysis?.score,
                    recommendation: candidate.aiAnalysis?.recommendation,
                    interviewToken: token,
                });
            } catch (err) {
                candidate.status = 'shortlisted';
                await candidate.save();
                interviewResults.push({
                    id: candidate._id,
                    name: candidate.candidateName,
                    score: candidate.aiAnalysis?.score,
                    error: err.message,
                });
            }
        }

        res.status(200).json({
            success: true,
            message: `${interviewResults.length} candidate(s) shortlisted with AI interview assigned (score ≥ ${threshold})`,
            data: {
                shortlisted: interviewResults.length,
                threshold,
                topN: limit,
                candidates: interviewResults,
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
    screenPendingResumes,
    rescreenResume,
    autoShortlist,
    compareResumeCandidates,
};
