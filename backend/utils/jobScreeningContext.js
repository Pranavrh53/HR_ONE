/**
 * Build full job context for AI screening so scores differ per JD.
 */
const buildJobScreeningContext = (job) => {
    const skills = [...(job.skills || [])];
    const requirements = [...(job.requirements || [])];

    requirements.forEach((req) => {
        req.split(/[,;|]+/).forEach((part) => {
            const trimmed = part.trim();
            if (trimmed.length > 1 && trimmed.length < 60) skills.push(trimmed);
        });
    });

    const uniqueSkills = [...new Set(skills.map((s) => s.trim()).filter(Boolean))];

    const experienceMin = job.experience?.min ?? 0;
    const experienceMax = job.experience?.max ?? 0;
    const education = job.education || '';

    const enrichedDescription = [
        job.description || '',
        requirements.length ? `Requirements: ${requirements.join('; ')}` : '',
        education ? `Education: ${education}` : '',
        experienceMin || experienceMax
            ? `Experience required: ${experienceMin}${experienceMax ? `-${experienceMax}` : '+'} years`
            : '',
        job.department ? `Department: ${job.department}` : '',
        job.type ? `Employment type: ${job.type.replace('_', ' ')}` : '',
    ].filter(Boolean).join('\n\n');

    return {
        jobTitle: job.title,
        jobDescription: enrichedDescription,
        requiredSkills: uniqueSkills.join(', '),
        requirements: requirements.join('; '),
        experienceMin: String(experienceMin),
        experienceMax: String(experienceMax),
        education,
    };
};

module.exports = { buildJobScreeningContext };
