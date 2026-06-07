const path = require('path');
const Resume = require('../models/Resume');
const Job = require('../models/Job');
const { applyScreeningToResume } = require('./aiScreening');

const queue = [];
let processing = false;

const resolveFilePath = (resumeFile) => {
    const relative = resumeFile.replace(/\\/g, '/');
    return path.join(__dirname, '..', relative);
};

const enqueueScreening = (resumeId, jobId, filePath) => {
    const absolutePath = filePath
        ? (path.isAbsolute(filePath) ? filePath : path.join(__dirname, '..', filePath.replace(/\\/g, '/')))
        : null;

    queue.push({ resumeId: String(resumeId), jobId: String(jobId), filePath: absolutePath, attempts: 0 });
    processQueue();
};

const processQueue = async () => {
    if (processing) return;
    processing = true;

    while (queue.length > 0) {
        const item = queue.shift();
        try {
            const resume = await Resume.findById(item.resumeId);
            const job = await Job.findById(item.jobId);
            if (!resume || !job) continue;

            if (resume.screeningStatus === 'completed' && resume.aiAnalysis?.score > 0) continue;

            await Resume.findByIdAndUpdate(item.resumeId, { screeningStatus: 'in_progress' });

            const filePath = item.filePath || resolveFilePath(resume.resumeFile);
            await applyScreeningToResume(resume, job, filePath, { skipGemini: true });
            console.log(`Screening complete: ${resume.candidateName} (${item.resumeId})`);
        } catch (err) {
            console.error(`Screening failed for ${item.resumeId}:`, err.message);
            await Resume.findByIdAndUpdate(item.resumeId, {
                screeningStatus: item.attempts >= 2 ? 'failed' : 'pending',
            });
            item.attempts += 1;
            if (item.attempts < 3) {
                queue.push(item);
                await new Promise((r) => setTimeout(r, 2000 * item.attempts));
            }
        }
    }

    processing = false;
};

const screenPendingForJob = async (jobId) => {
    const pending = await Resume.find({
        job: jobId,
        $or: [
            { screeningStatus: { $in: ['pending', 'failed', 'in_progress'] } },
            { screeningStatus: { $exists: false }, status: { $in: ['pending', 'applied'] } },
            { screeningStatus: 'completed', 'aiAnalysis.score': { $in: [null, 0] } },
        ],
    });

    pending.forEach((resume) => {
        enqueueScreening(resume._id, jobId, resolveFilePath(resume.resumeFile));
    });

    return pending.length;
};

module.exports = {
    enqueueScreening,
    screenPendingForJob,
};
