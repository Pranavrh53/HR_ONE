const crypto = require('crypto');
const axios = require('axios');
const InterviewSession = require('../models/InterviewSession');
const { buildJobScreeningContext } = require('./jobScreeningContext');

const AI_SERVICE = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const generateInterviewToken = () => crypto.randomBytes(24).toString('hex');

const assignInterviewToCandidate = async (resume, job) => {
    if (resume.interviewSession && resume.interviewToken) {
        const existing = await InterviewSession.findById(resume.interviewSession);
        if (existing && existing.status !== 'completed') {
            return { session: existing, token: resume.interviewToken };
        }
    }

    const ctx = buildJobScreeningContext(job);
    const aiRes = await axios.post(`${AI_SERVICE}/interview/generate-questions`, {
        job_title: ctx.jobTitle,
        job_description: ctx.jobDescription,
        required_skills: ctx.requiredSkills,
        candidate_name: resume.candidateName,
        resume_summary: resume.aiAnalysis?.summary || '',
        strengths: resume.aiAnalysis?.strengths || [],
        weaknesses: resume.aiAnalysis?.weaknesses || [],
        skills_matched: resume.aiAnalysis?.detectedSkills || [],
        skills_missing: resume.aiAnalysis?.missingSkills || [],
    });

    const questions = aiRes.data.questions || [];
    const token = generateInterviewToken();

    const session = await InterviewSession.create({
        candidate: resume._id,
        job: job._id,
        candidateName: resume.candidateName,
        jobTitle: job.title,
        status: 'pending',
        questions,
        resumeScore: resume.aiAnalysis?.score || 0,
        accessToken: token,
    });

    resume.interviewSession = session._id;
    resume.interviewToken = token;
    resume.status = 'shortlisted';
    resume.interviewAssignedAt = new Date();
    await resume.save();

    return { session, token };
};

module.exports = {
    generateInterviewToken,
    assignInterviewToCandidate,
};
