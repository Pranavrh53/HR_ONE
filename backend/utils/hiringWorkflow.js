const fs = require('fs');
const path = require('path');
const HiringDecision = require('../models/HiringDecision');
const CandidateRanking = require('../models/CandidateRanking');

const OFFER_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'offers');

const ensureOfferUploadDir = () => {
    if (!fs.existsSync(OFFER_UPLOAD_DIR)) {
        fs.mkdirSync(OFFER_UPLOAD_DIR, { recursive: true });
    }
};

const calculateFinalHiringScore = (resumeScore = 0, interviewScore = 0) => {
    return Math.round((Number(resumeScore) * 0.4) + (Number(interviewScore) * 0.6));
};

const classifyHiringScore = (score = 0) => {
    if (score >= 90) return 'Top Candidate';
    if (score >= 80) return 'Recommended';
    if (score >= 70) return 'Needs HR Review';
    return 'Not Recommended';
};

const statusFromClassification = (classification) => {
    switch (classification) {
        case 'Top Candidate': return 'top_candidate';
        case 'Recommended': return 'recommended';
        case 'Needs HR Review': return 'needs_hr_review';
        default: return 'not_recommended';
    }
};

const normalizeSalary = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const splitCandidateName = (fullName = '') => {
    const cleanName = String(fullName).trim();
    if (!cleanName) return { firstName: 'New', lastName: 'Employee' };
    const parts = cleanName.split(/\s+/);
    if (parts.length === 1) {
        return { firstName: parts[0], lastName: '' };
    }
    return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' '),
    };
};

const wrapText = (text, limit = 86) => {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';
    for (const word of words) {
        const next = current ? `${current} ${word}` : word;
        if (next.length > limit) {
            if (current) lines.push(current);
            current = word;
        } else {
            current = next;
        }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [''];
};

const escapePdfText = (text) => String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r?\n/g, ' ');

const buildOfferPdfBuffer = ({ title, lines }) => {
    const contentLines = [
        'BT',
        '/F1 18 Tf',
        '1 0 0 1 72 760 Tm',
        `(${escapePdfText(title)}) Tj`,
        '14 TL',
        '/F1 11 Tf',
        'T*',
    ];

    for (const paragraph of lines) {
        const wrapped = wrapText(paragraph, 90);
        wrapped.forEach((line, index) => {
            if (index > 0) {
                contentLines.push('T*');
            }
            contentLines.push(`(${escapePdfText(line)}) Tj`);
        });
        contentLines.push('T*');
    }
    contentLines.push('ET');

    const stream = contentLines.join('\n');
    const objects = [
        '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
        '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n',
        '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n',
        '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n',
        `5 0 obj << /Length ${Buffer.byteLength(stream, 'utf8')} >> stream\n${stream}\nendstream endobj\n`,
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = ['0000000000 65535 f \n'];
    for (const object of objects) {
        offsets.push(String(pdf.length).padStart(10, '0') + ' 00000 n \n');
        pdf += object;
    }
    const xrefStart = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += offsets.join('');
    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    return Buffer.from(pdf, 'utf8');
};

const buildOfferLetterPayload = ({ decision, job, resume, salary, joiningDate, reportingManager, companyDetails }) => {
    const title = `Offer Letter - ${decision.candidateName}`;
    const lines = [
        `Candidate: ${decision.candidateName}`,
        `Email: ${decision.candidateEmail}`,
        `Job Title: ${job.title}`,
        `Department: ${job.department}`,
        `Salary: ${salary}`,
        `Joining Date: ${joiningDate ? new Date(joiningDate).toDateString() : 'To be confirmed'}`,
        `Reporting Manager: ${reportingManager || 'To be assigned'}`,
        '',
        'Congratulations on your selection. Please review the attached offer letter and respond through the candidate portal.',
        companyDetails || 'This offer is issued by TalentSphere AI on behalf of the hiring team.',
        '',
        'Regards,',
        'TalentSphere AI Hiring Team',
    ];

    return {
        title,
        lines,
        fileName: `offer-${decision._id}.pdf`,
        fileBuffer: buildOfferPdfBuffer({ title, lines }),
        letterText: lines.join('\n'),
    };
};

const refreshJobRankings = async (jobId) => {
    const decisions = await HiringDecision.find({ job: jobId })
        .sort({ finalScore: -1, interviewScore: -1, resumeScore: -1 });

    const rankings = decisions.map((decision, index) => ({
        decision: decision._id,
        resume: decision.resume,
        candidateName: decision.candidateName,
        candidateEmail: decision.candidateEmail,
        rank: index + 1,
        resumeScore: decision.resumeScore,
        interviewScore: decision.interviewScore,
        finalScore: decision.finalScore,
        classification: decision.classification,
        technicalScore: decision.technicalScore,
        communicationScore: decision.communicationScore,
        problemSolvingScore: decision.problemSolvingScore,
        projectExperienceScore: decision.projectExperienceScore,
    }));

    const pickMax = (selector) => decisions.reduce((best, current) => {
        if (!best) return current;
        return selector(current) > selector(best) ? current : best;
    }, null);

    const summary = {
        job: jobId,
        generatedAt: new Date(),
        rankings,
        bestTechnicalCandidate: pickMax((d) => d.technicalScore)?._id || null,
        bestCommunicationSkills: pickMax((d) => d.communicationScore)?._id || null,
        bestProblemSolver: pickMax((d) => d.problemSolvingScore)?._id || null,
        bestProjectExperience: pickMax((d) => d.projectExperienceScore)?._id || null,
        bestOverallFit: decisions[0]?._id || null,
    };

    await CandidateRanking.findOneAndUpdate(
        { job: jobId },
        summary,
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    for (const [index, decision] of decisions.entries()) {
        const rank = index + 1;
        if (decision.rank !== rank) {
            decision.rank = rank;
            await decision.save();
        }
    }

    return summary;
};

const createOrUpdateHiringDecision = async ({ session, resume, job, interviewScore, report }) => {
    const finalScore = calculateFinalHiringScore(resume.aiAnalysis?.score || 0, interviewScore || 0);
    const classification = classifyHiringScore(finalScore);

    const decisionPayload = {
        job: job._id,
        resume: resume._id,
        interviewSession: session?._id || null,
        candidateName: resume.candidateName,
        candidateEmail: resume.candidateEmail,
        resumeScore: resume.aiAnalysis?.score || 0,
        interviewScore: interviewScore || 0,
        finalScore,
        classification,
        status: statusFromClassification(classification),
        resumeQuality: resume.aiAnalysis?.resumeQualityScore || 0,
        technicalScore: report?.technicalScore || 0,
        communicationScore: report?.communicationScore || 0,
        problemSolvingScore: report?.problemSolvingScore || 0,
        behavioralScore: report?.behavioralScore || 0,
        projectExperienceScore: resume.aiAnalysis?.projectsScore || 0,
    };

    const decision = await HiringDecision.findOneAndUpdate(
        { resume: resume._id },
        decisionPayload,
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    resume.status = 'awaiting_hr_review';
    resume.hiringScore = finalScore;
    resume.hiringRecommendation = classification;
    resume.hiringDecision = decision._id;
    await resume.save();

    if (session) {
        session.finalScore = finalScore;
        session.report = {
            ...(session.report || {}),
            hiringScore: finalScore,
            hiringRecommendation: classification,
            hiringStatus: 'awaiting_hr_review',
        };
        await session.save();
    }

    await refreshJobRankings(job._id);
    return decision;
};

module.exports = {
    OFFER_UPLOAD_DIR,
    ensureOfferUploadDir,
    calculateFinalHiringScore,
    classifyHiringScore,
    statusFromClassification,
    splitCandidateName,
    normalizeSalary,
    buildOfferLetterPayload,
    refreshJobRankings,
    createOrUpdateHiringDecision,
};