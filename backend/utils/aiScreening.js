const fs = require('fs');
const path = require('path');
const { Blob } = require('buffer');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const mapRecommendation = (value) => {
    if (!value) return 'Potential Match';
    const normalized = String(value).toLowerCase();
    if (normalized.includes('highly')) return 'Highly Recommended';
    if (normalized.includes('not')) return 'Not Recommended';
    if (normalized.includes('recommended')) return 'Recommended';
    if (normalized.includes('maybe')) return 'Potential Match';
    return value;
};

const mapAiAnalysis = (result) => ({
    matchPercentage: Number(result.match_percentage ?? result.score ?? 0),
    detectedSkills: result.skills_matched || result.matched_skills || [],
    missingSkills: result.skills_missing || result.missing_skills || [],
    experience: result.years_of_experience || result.experience || '',
    education: result.education || '',
    recommendation: mapRecommendation(result.recommendation),
    summary: result.summary || '',
    score: Number(result.score ?? 0),
    strengths: result.strengths || [],
    weaknesses: result.weaknesses || [],
    interviewQuestions: result.interview_questions || [],
    analysisMode: result.analysis_mode || 'gemini',
});

const callAiScreening = async ({ filePath, fileName, job }) => {
    const fileBuffer = fs.readFileSync(filePath);
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: 'application/pdf' });

    formData.append('file', blob, fileName || path.basename(filePath));
    formData.append('job_title', job.title);
    formData.append('job_description', job.description || '');
    formData.append('required_skills', (job.skills || []).join(', '));

    const response = await fetch(`${AI_SERVICE_URL}/screen-resume`, {
        method: 'POST',
        body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
        const message = data?.detail || 'AI screening failed';
        throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
    }

    return data;
};

const applyScreeningToResume = async (resume, job, filePath) => {
    const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(__dirname, '..', filePath.replace(/^\/+/, ''));

    const aiResult = await callAiScreening({
        filePath: absolutePath,
        fileName: path.basename(resume.resumeFile),
        job,
    });

    resume.extractedText = aiResult.extracted_text || resume.extractedText || '';
    resume.aiAnalysis = mapAiAnalysis(aiResult);
    resume.status = 'screened';
    resume.screenedAt = new Date();
    await resume.save();

    return resume;
};

module.exports = {
    AI_SERVICE_URL,
    mapRecommendation,
    mapAiAnalysis,
    callAiScreening,
    applyScreeningToResume,
};
