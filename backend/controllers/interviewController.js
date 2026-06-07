const InterviewSession = require('../models/InterviewSession');
const Resume = require('../models/Resume');
const Job = require('../models/Job');
const axios = require('axios');
const { createOrUpdateHiringDecision } = require('../utils/hiringWorkflow');

const AI_SERVICE = 'http://localhost:8000';

// POST /api/interview/start
exports.startInterview = async (req, res) => {
    try {
        const { resumeId, jobId } = req.body;

        const resume = await Resume.findById(resumeId);
        const job = await Job.findById(jobId);
        if (!resume || !job) return res.status(404).json({ success: false, message: 'Resume or Job not found' });

        // Generate questions from AI service
        const aiRes = await axios.post(`${AI_SERVICE}/interview/generate-questions`, {
            job_title: job.title,
            job_description: job.description || '',
            required_skills: job.skills?.join(', ') || '',
            candidate_name: resume.candidateName,
            resume_summary: resume.aiAnalysis?.summary || '',
            strengths: resume.aiAnalysis?.strengths || [],
            weaknesses: resume.aiAnalysis?.weaknesses || [],
            skills_matched: resume.aiAnalysis?.detectedSkills || [],
            skills_missing: resume.aiAnalysis?.missingSkills || [],
        });

        const questions = aiRes.data.questions || [];

        const session = await InterviewSession.create({
            candidate: resumeId,
            job: jobId,
            candidateName: resume.candidateName,
            jobTitle: job.title,
            status: 'in_progress',
            startedAt: new Date(),
            questions,
            resumeScore: resume.aiAnalysis?.score || 0,
        });

        res.json({ success: true, data: { sessionId: session._id, questions, candidateName: resume.candidateName, jobTitle: job.title } });
    } catch (err) {
        console.error('Start interview error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/interview/evaluate-answer
exports.evaluateAnswer = async (req, res) => {
    try {
        const { sessionId, question, answer, questionType } = req.body;

        const session = await InterviewSession.findById(sessionId);
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

        // Get AI evaluation
        const aiRes = await axios.post(`${AI_SERVICE}/interview/evaluate-answer`, {
            question,
            answer,
            job_title: session.jobTitle,
        });

        const evaluation = aiRes.data;

        // Push answer to session
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
        console.error('Evaluate answer error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/interview/next-question
exports.getNextQuestion = async (req, res) => {
    try {
        const { sessionId, lastAnswer, lastQuestion } = req.body;
        const session = await InterviewSession.findById(sessionId);
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

        const aiRes = await axios.post(`${AI_SERVICE}/interview/follow-up`, {
            job_title: session.jobTitle,
            last_question: lastQuestion,
            last_answer: lastAnswer,
        });

        res.json({ success: true, data: { followUp: aiRes.data.follow_up } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/interview/finish
exports.finishInterview = async (req, res) => {
    try {
        const { sessionId } = req.body;
        const session = await InterviewSession.findById(sessionId);
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

        // Build full transcript for AI
        const transcript = session.answers.map((a, i) => `Q${i + 1}: ${a.question}\nA: ${a.answer}`).join('\n\n');

        const aiRes = await axios.post(`${AI_SERVICE}/interview/final-analysis`, {
            job_title: session.jobTitle,
            candidate_name: session.candidateName,
            transcript,
        });

        const report = aiRes.data;

        // Calculate interview score (avg of all answer scores)
        const totalAnswers = session.answers.length;
        const interviewScore = totalAnswers > 0
            ? Math.round(session.answers.reduce((sum, a) => sum + (a.technicalScore + a.communicationScore + a.clarityScore + a.relevanceScore) / 4, 0) / totalAnswers)
            : 0;

        // Final hiring score = Resume 40% + Interview 60%
        const finalScore = Math.round((session.resumeScore * 0.4) + (interviewScore * 0.6));

        session.status = 'completed';
        session.completedAt = new Date();
        session.interviewScore = interviewScore;
        session.finalScore = finalScore;
        session.report = {
            ...(session.report || {}),
            communicationScore: report.communication_score || 0,
            technicalScore: report.technical_score || 0,
            problemSolvingScore: report.problem_solving_score || 0,
            behavioralScore: report.behavioral_score || 0,
            overallScore: report.overall_score || 0,
            hiringScore: finalScore,
            hiringRecommendation: '',
            hiringStatus: 'awaiting_hr_review',
            strengths: report.strengths || [],
            weaknesses: report.weaknesses || [],
            recommendation: report.recommendation || 'Consider',
            summary: report.summary || '',
        };

        await session.save();

        const resume = await Resume.findById(session.candidate).populate('job');
        if (resume && resume.job) {
            const decision = await createOrUpdateHiringDecision({
                session,
                resume,
                job: resume.job,
                interviewScore,
                report,
            });
            session.hiringDecision = decision._id;
            await session.save();
        } else {
            await Resume.findByIdAndUpdate(session.candidate, { status: 'awaiting_hr_review', hiringScore: finalScore });
        }

        res.json({ success: true, data: session });
    } catch (err) {
        console.error('Finish interview error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/interview/report/:id
exports.getReport = async (req, res) => {
    try {
        const session = await InterviewSession.findById(req.params.id).populate('job', 'title department');
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
        res.json({ success: true, data: session });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/interview/list/:jobId
exports.getInterviewsByJob = async (req, res) => {
    try {
        const sessions = await InterviewSession.find({ job: req.params.jobId })
            .sort({ finalScore: -1 });
        res.json({ success: true, data: sessions });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
