const InterviewSession = require('../models/InterviewSession');
const Resume = require('../models/Resume');
const axios = require('axios');

const AI_SERVICE = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const getSessionByToken = async (token) => {
    const session = await InterviewSession.findOne({ accessToken: token });
    if (!session) return null;
    return session;
};

// GET /api/careers/interview/:token
exports.getCandidateInterview = async (req, res) => {
    try {
        const session = await getSessionByToken(req.params.token);
        if (!session) {
            return res.status(404).json({ success: false, message: 'Interview not found' });
        }

        res.json({
            success: true,
            data: {
                sessionId: session._id,
                candidateName: session.candidateName,
                jobTitle: session.jobTitle,
                status: session.status,
                questions: session.status === 'completed' ? [] : session.questions,
                resumeScore: session.resumeScore,
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/careers/interview/:token/start
exports.startCandidateInterview = async (req, res) => {
    try {
        const session = await getSessionByToken(req.params.token);
        if (!session) {
            return res.status(404).json({ success: false, message: 'Interview not found' });
        }
        if (session.status === 'completed') {
            return res.status(400).json({ success: false, message: 'Interview already completed' });
        }

        session.status = 'in_progress';
        session.startedAt = new Date();
        await session.save();

        await Resume.findByIdAndUpdate(session.candidate, { status: 'interview' });

        res.json({
            success: true,
            data: {
                sessionId: session._id,
                questions: session.questions,
                candidateName: session.candidateName,
                jobTitle: session.jobTitle,
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/careers/interview/:token/evaluate-answer
exports.evaluateCandidateAnswer = async (req, res) => {
    try {
        const session = await getSessionByToken(req.params.token);
        if (!session) return res.status(404).json({ success: false, message: 'Interview not found' });

        const { question, answer, questionType } = req.body;
        const aiRes = await axios.post(`${AI_SERVICE}/interview/evaluate-answer`, {
            question,
            answer,
            job_title: session.jobTitle,
        });

        const evaluation = aiRes.data;
        session.answers.push({
            question,
            questionType: questionType || 'technical',
            answer,
            transcript: answer,
            technicalScore: evaluation.technical_score || 0,
            communicationScore: evaluation.communication_score || 0,
            clarityScore: evaluation.clarity_score || 0,
            relevanceScore: evaluation.relevance_score || 0,
            feedback: evaluation.feedback || '',
        });
        await session.save();

        res.json({ success: true, data: evaluation });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/careers/interview/:token/finish
exports.finishCandidateInterview = async (req, res) => {
    try {
        const session = await getSessionByToken(req.params.token);
        if (!session) return res.status(404).json({ success: false, message: 'Interview not found' });

        const transcript = session.answers.map((a, i) => `Q${i + 1}: ${a.question}\nA: ${a.answer}`).join('\n\n');
        const aiRes = await axios.post(`${AI_SERVICE}/interview/final-analysis`, {
            job_title: session.jobTitle,
            candidate_name: session.candidateName,
            transcript,
        });

        const report = aiRes.data;
        const totalAnswers = session.answers.length;
        const interviewScore = totalAnswers > 0
            ? Math.round(session.answers.reduce((sum, a) => sum + (a.technicalScore + a.communicationScore + a.clarityScore + a.relevanceScore) / 4, 0) / totalAnswers)
            : 0;
        const finalScore = Math.round((session.resumeScore * 0.6) + (interviewScore * 0.4));

        session.status = 'completed';
        session.completedAt = new Date();
        session.interviewScore = interviewScore;
        session.finalScore = finalScore;
        session.report = {
            communicationScore: report.communication_score || 0,
            technicalScore: report.technical_score || 0,
            problemSolvingScore: report.problem_solving_score || 0,
            behavioralScore: report.behavioral_score || 0,
            overallScore: report.overall_score || 0,
            strengths: report.strengths || [],
            weaknesses: report.weaknesses || [],
            recommendation: report.recommendation || 'Consider',
            summary: report.summary || '',
        };
        await session.save();
        await Resume.findByIdAndUpdate(session.candidate, { status: 'interviewed' });

        res.json({ success: true, data: { finalScore, interviewScore, recommendation: session.report.recommendation } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
