const fs = require('fs');
const path = require('path');
const { Blob } = require('buffer');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const mapRecommendation = (value) => {
    if (!value) return 'Needs Review';
    const normalized = String(value).toLowerCase();
    if (normalized.includes('highly')) return 'Highly Recommended';
    if (normalized.includes('not') && normalized.includes('recommend')) return 'Not Recommended';
    if (normalized.includes('needs') && normalized.includes('review')) return 'Needs Review';
    if (normalized.includes('recommended')) return 'Recommended';
    if (normalized.includes('potential') || normalized.includes('maybe')) return 'Needs Review';
    return value;
};

const mapAiAnalysis = (result) => ({
    matchPercentage: Number(result.match_percentage ?? result.final_score ?? result.score ?? 0),
    detectedSkills: result.skills_matched || result.matched_skills || [],
    missingSkills: result.skills_missing || result.missing_skills || [],
    experience: result.years_of_experience || result.experience || '',
    education: result.education || '',
    recommendation: mapRecommendation(result.recommendation),
    summary: result.summary || '',
    score: Number(result.final_score ?? result.score ?? 0),
    strengths: result.strengths || [],
    weaknesses: result.weaknesses || [],
    interviewQuestions: result.interview_questions || [],
    analysisMode: result.analysis_mode || 'deterministic',
    skillScore: result.skill_score ?? null,
    experienceScore: result.experience_score ?? null,
    projectsScore: result.projects_score ?? null,
    educationScore: result.education_score ?? null,
    certificationsScore: result.certifications_score ?? null,
    achievementsScore: result.achievements_score ?? null,
    resumeQualityScore: result.resume_quality_score ?? null,
    technicalSkillsFound: result.technical_skills_found || [],
    scoreBreakdown: result.score_breakdown || [],
    aiInsights: result.recruiter_insights || result.ai_insights || '',
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
