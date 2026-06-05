const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const compareCandidates = async ({ job, candidates }) => {
    const response = await fetch(`${AI_SERVICE_URL}/compare-candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            job_title: job.title,
            job_description: job.description || '',
            required_skills: (job.skills || []).join(', '),
            candidates: candidates.map((c) => ({
                id: String(c._id),
                name: c.candidateName,
                score: c.aiAnalysis?.score ?? 0,
                recommendation: c.aiAnalysis?.recommendation || '',
                matched_skills: c.aiAnalysis?.detectedSkills || [],
                missing_skills: c.aiAnalysis?.missingSkills || [],
                experience: c.aiAnalysis?.experience || '',
                education: c.aiAnalysis?.education || '',
                summary: c.aiAnalysis?.summary || '',
                strengths: c.aiAnalysis?.strengths || [],
                weaknesses: c.aiAnalysis?.weaknesses || [],
            })),
        }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data?.detail || 'Candidate comparison failed');
    }
    return data;
};

module.exports = { compareCandidates };
