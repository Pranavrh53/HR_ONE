const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Resume = require('../models/Resume');
const Job = require('../models/Job');
const InterviewSession = require('../models/InterviewSession');
const HiringDecision = require('../models/HiringDecision');
const OfferLetter = require('../models/OfferLetter');
const OfferResponse = require('../models/OfferResponse');
const CandidateRanking = require('../models/CandidateRanking');
const Onboarding = require('../models/Onboarding');
const Employee = require('../models/Employee');
const User = require('../models/User');
const { sendEmail } = require('../utils/emailService');
const {
    ensureOfferUploadDir,
    normalizeSalary,
    buildOfferLetterPayload,
    splitCandidateName,
    refreshJobRankings,
} = require('../utils/hiringWorkflow');

const jobPopulate = 'title department location salaryRange postedBy';

const statusLabelMap = {
    awaiting_hr_review: 'Awaiting HR Review',
    top_candidate: 'Top Candidate',
    recommended: 'Recommended',
    needs_hr_review: 'Needs HR Review',
    not_recommended: 'Not Recommended',
    selected: 'Selected',
    rejected: 'Rejected',
    offer_generated: 'Offer Generated',
    offer_accepted: 'Offer Accepted',
    offer_declined: 'Offer Declined',
    onboarding_started: 'Onboarding Started',
    employee_created: 'Employee Created',
};

const listHiringDecisions = async (req, res) => {
    try {
        const { jobId, status } = req.query;
        const query = {};
        if (jobId) query.job = jobId;
        if (status) query.status = status;

        const decisions = await HiringDecision.find(query)
            .populate('job', jobPopulate)
            .populate('resume', 'candidateName candidateEmail candidatePhone status aiAnalysis interviewToken interviewSession')
            .populate('interviewSession', 'status finalScore report completedAt')
            .populate('offerLetter')
            .populate('onboardingRecord')
            .sort({ finalScore: -1, createdAt: -1 });

        res.json({
            success: true,
            count: decisions.length,
            data: decisions.map((decision) => ({
                ...decision.toObject(),
                statusLabel: statusLabelMap[decision.status] || decision.status,
            })),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getHiringRanking = async (req, res) => {
    try {
        const ranking = await CandidateRanking.findOne({ job: req.params.jobId })
            .populate('job', 'title department location')
            .populate('bestTechnicalCandidate bestCommunicationSkills bestProblemSolver bestProjectExperience bestOverallFit');

        if (!ranking) {
            return res.json({ success: true, data: null });
        }

        res.json({ success: true, data: ranking });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const sendOfferEmail = async ({ candidateName, candidateEmail, jobTitle, attachmentPath }) => {
    return sendEmail({
        to: candidateEmail,
        subject: `Congratulations - ${jobTitle} Offer Letter`,
        html: `
        <div style="font-family:Inter,sans-serif;max-width:640px;margin:0 auto;background:#0f0f1a;color:#e5e7eb;border-radius:12px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#16a34a,#2563eb);padding:32px;text-align:center">
                <h1 style="margin:0;color:white;font-size:22px">Congratulations ${candidateName}</h1>
            </div>
            <div style="padding:32px">
                <p style="margin:0 0 16px">Your offer letter for <strong>${jobTitle}</strong> is ready.</p>
                <p style="margin:0 0 16px;color:#9ca3af">Please review the attached offer letter in your candidate portal and respond when ready.</p>
                <p style="margin:0;font-size:13px;color:#6b7280">If the attachment is not visible, download it from your Offers section.</p>
            </div>
        </div>`,
        attachments: attachmentPath ? [{ filename: path.basename(attachmentPath), path: attachmentPath }] : [],
    });
};

const generateOfferLetter = async (req, res) => {
    try {
        const { decisionId } = req.params;
        const {
            salary,
            joiningDate,
            reportingManager,
            companyDetails,
            notes = '',
        } = req.body;

        const decision = await HiringDecision.findById(decisionId)
            .populate('job')
            .populate('resume')
            .populate('interviewSession');

        if (!decision) {
            return res.status(404).json({ success: false, message: 'Hiring decision not found' });
        }

        const job = decision.job;
        const resume = decision.resume;
        ensureOfferUploadDir();

        const effectiveSalary = normalizeSalary(salary, job.salaryRange?.max || job.salaryRange?.min || 0);
        const payload = buildOfferLetterPayload({
            decision,
            job,
            resume,
            salary: effectiveSalary,
            joiningDate,
            reportingManager,
            companyDetails,
        });

        const filePath = path.join(require('../utils/hiringWorkflow').OFFER_UPLOAD_DIR, payload.fileName);
        fs.writeFileSync(filePath, payload.fileBuffer);

        const offer = await OfferLetter.create({
            decision: decision._id,
            job: job._id,
            resume: resume._id,
            candidateName: decision.candidateName,
            candidateEmail: decision.candidateEmail,
            department: job.department,
            jobTitle: job.title,
            salary: effectiveSalary,
            joiningDate: joiningDate ? new Date(joiningDate) : null,
            reportingManager: reportingManager || '',
            companyDetails: companyDetails || '',
            letterText: payload.letterText,
            filePath,
            fileName: payload.fileName,
            status: 'generated',
        });

        decision.offerLetter = offer._id;
        decision.status = 'selected';
        decision.reviewedAt = new Date();
        decision.hrNotes = notes || decision.hrNotes;
        await decision.save();

        resume.status = 'selected';
        resume.offerLetter = offer._id;
        resume.hiringDecision = decision._id;
        await resume.save();

        await sendOfferEmail({
            candidateName: decision.candidateName,
            candidateEmail: decision.candidateEmail,
            jobTitle: job.title,
            attachmentPath: filePath,
        });

        offer.status = 'sent';
        offer.sentAt = new Date();
        offer.deliveredTo = decision.candidateEmail;
        await offer.save();

        await refreshJobRankings(job._id);

        res.json({ success: true, message: 'Offer letter generated successfully', data: offer });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const rejectCandidate = async (req, res) => {
    try {
        const decision = await HiringDecision.findById(req.params.decisionId)
            .populate('job')
            .populate('resume');

        if (!decision) {
            return res.status(404).json({ success: false, message: 'Hiring decision not found' });
        }

        decision.status = 'rejected';
        decision.reviewedAt = new Date();
        decision.hrNotes = req.body.notes || decision.hrNotes;
        await decision.save();

        decision.resume.status = 'rejected';
        await decision.resume.save();

        await sendEmail({
            to: decision.candidateEmail,
            subject: `Update on your application for ${decision.job.title}`,
            html: `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0f0f1a;color:#e5e7eb;border-radius:12px"><h2 style="margin:0 0 12px">Application Update</h2><p style="color:#9ca3af">Thank you for interviewing for <strong>${decision.job.title}</strong>. After review, we are not moving forward at this time.</p></div>`,
        });

        await refreshJobRankings(decision.job._id);

        res.json({ success: true, message: 'Candidate rejected successfully', data: decision });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const startOnboarding = async (decision, offer) => {
    const initialTasks = [
        { title: 'Submit Aadhaar and PAN details', status: 'pending' },
        { title: 'Upload Education Certificates', status: 'pending' },
        { title: 'Sign NDAs and Company Policies', status: 'pending' },
        { title: 'Attend Orientation with HR Assistant', status: 'pending' },
    ];

    const welcomeKit = {
        message: `Welcome to the team, ${decision.candidateName}! We are thrilled to have you join our ${decision.job.department} department.`,
        firstWeekChecklist: [
            'System Setup & Credential Access',
            'Team Meet & Greet',
            'Project Briefing with Manager',
            'Policy Review with AI HR Assistant',
        ],
        teamIntroduction: `You will be working with a highly skilled team of 10+ professionals in ${decision.job.department}.`,
        departmentOverview: `The ${decision.job.department} team drives innovation and operational excellence at the core of our platform.`,
    };

    const onboarding = await Onboarding.findOneAndUpdate(
        { decision: decision._id },
        {
            decision: decision._id,
            offerLetter: offer._id,
            resume: decision.resume,
            job: decision.job,
            candidateName: decision.candidateName,
            candidateEmail: decision.candidateEmail,
            status: 'document_submission',
            tasks: initialTasks,
            welcomeKit,
            startedAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    decision.onboardingRecord = onboarding._id;
    decision.status = 'onboarding_started';
    await decision.save();

    const resume = await Resume.findById(decision.resume);
    if (resume) {
        resume.status = 'onboarding';
        resume.onboardingRecord = onboarding._id;
        await resume.save();
    }

    offer.status = 'accepted';
    await offer.save();

    return onboarding;
};

const respondToOffer = async (req, res) => {
    try {
        const { offerId } = req.params;
        const { response, note = '' } = req.body;
        if (!['accepted', 'declined'].includes(response)) {
            return res.status(400).json({ success: false, message: 'response must be accepted or declined' });
        }

        const offer = await OfferLetter.findById(offerId)
            .populate({ path: 'decision', populate: { path: 'job resume' } });
        if (!offer) {
            return res.status(404).json({ success: false, message: 'Offer letter not found' });
        }

        if (offer.candidateEmail !== req.user.email.toLowerCase()) {
            return res.status(403).json({ success: false, message: 'Not authorized for this offer' });
        }

        const decision = await HiringDecision.findById(offer.decision._id).populate('resume job');
        if (!decision) {
            return res.status(404).json({ success: false, message: 'Associated hiring decision not found' });
        }

        let offerResponse = await OfferResponse.findOne({ offerLetter: offer._id });
        if (!offerResponse) {
            offerResponse = await OfferResponse.create({
                offerLetter: offer._id,
                decision: decision._id,
                resume: decision.resume._id,
                candidateName: decision.candidateName,
                candidateEmail: decision.candidateEmail,
                response,
                candidateNote: note,
            });
        } else {
            offerResponse.response = response;
            offerResponse.candidateNote = note;
            offerResponse.respondedAt = new Date();
            await offerResponse.save();
        }

        decision.offerResponse = offerResponse._id;

        if (response === 'accepted') {
            const onboarding = await startOnboarding(decision, offer);
            decision.status = 'offer_accepted';
            decision.onboardingRecord = onboarding._id;
            await decision.save();

            // Auto-create Employee and User records upon acceptance so they appear in dashboard immediately
            const { firstName, lastName } = splitCandidateName(decision.candidateName);
            let user = await User.findOne({ email: decision.candidateEmail.toLowerCase() }).select('+password');

            if (user) {
                user.role = 'employee';
                user.department = decision.job.department;
                user.designation = decision.job.title;
                await user.save();
            } else {
                // Create new user if somehow missing
                user = await User.create({
                    name: decision.candidateName,
                    email: decision.candidateEmail.toLowerCase(),
                    password: crypto.randomBytes(8).toString('hex'),
                    role: 'employee',
                    department: decision.job.department,
                    designation: decision.job.title,
                });
            }

            const employee = await Employee.create({
                user: user._id,
                firstName,
                lastName,
                email: decision.candidateEmail,
                phone: decision.resume.candidatePhone || '',
                department: decision.job.department,
                designation: decision.job.title,
                dateOfJoining: offer.joiningDate || new Date(),
                status: 'active',
                salary: { basic: offer.salary || 0, hra: 0, allowances: 0, deductions: 0 },
            });

            onboarding.employee = employee._id;
            onboarding.status = 'completed';
            onboarding.completedAt = new Date();
            await onboarding.save();

            decision.employee = employee._id;
            decision.status = 'employee_created';
            await decision.save();

            if (decision.resume) {
                decision.resume.status = 'employee';
                decision.resume.hiringDecision = decision._id;
                decision.resume.onboardingRecord = onboarding._id;
                await decision.resume.save();
            }

            offer.status = 'accepted';
            offer.sentAt = offer.sentAt || new Date();
            await offer.save();

            await sendEmail({
                to: decision.candidateEmail,
                subject: `Welcome to the Team! - ${decision.job.title}`,
                html: `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0f0f1a;color:#e5e7eb;border-radius:12px"><h2 style="margin:0 0 12px">Welcome aboard</h2><p style="color:#9ca3af">Your offer for <strong>${decision.job.title}</strong> has been accepted. Your employee account has been created, and onboarding is complete.</p></div>`,
            });
        } else {
            decision.status = 'offer_declined';
            await decision.save();
            offer.status = 'declined';
            await offer.save();
            if (decision.resume) {
                decision.resume.status = 'offer_declined';
                await decision.resume.save();
            }
            await sendEmail({
                to: decision.candidateEmail,
                subject: `Offer declined - ${decision.job.title}`,
                html: `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0f0f1a;color:#e5e7eb;border-radius:12px"><h2 style="margin:0 0 12px">Offer declined</h2><p style="color:#9ca3af">You have declined the offer for <strong>${decision.job.title}</strong>. HR has been notified.</p></div>`,
            });
        }

        res.json({ success: true, data: { offer, offerResponse } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const completeOnboarding = async (req, res) => {
    try {
        const onboarding = await Onboarding.findById(req.params.onboardingId)
            .populate('decision')
            .populate('offerLetter')
            .populate('resume')
            .populate('job');

        if (!onboarding) {
            return res.status(404).json({ success: false, message: 'Onboarding record not found' });
        }

        if (onboarding.employee) {
            return res.status(400).json({ success: false, message: 'Employee already created for this onboarding record' });
        }

        const decision = onboarding.decision;
        const resume = onboarding.resume;
        const job = onboarding.job;
        const { firstName, lastName } = splitCandidateName(decision.candidateName);
        const password = req.body.password || crypto.randomBytes(8).toString('hex');
        const manager = req.body.manager || null;
        const designation = req.body.designation || job.title;
        const salaryValue = normalizeSalary(req.body.salary, onboarding.offerLetter.salary || 0);

        const user = await User.findOneAndUpdate(
            { email: decision.candidateEmail },
            {
                role: 'employee',
                department: job.department,
                designation,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        if (!user.password) {
            user.password = password;
            await user.save();
        }

        const employee = await Employee.create({
            user: user._id,
            firstName,
            lastName,
            email: decision.candidateEmail,
            phone: resume.candidatePhone || '',
            department: job.department,
            designation,
            dateOfJoining: req.body.dateOfJoining || onboarding.offerLetter.joiningDate || new Date(),
            salary: {
                basic: salaryValue,
                hra: 0,
                allowances: 0,
                deductions: 0,
            },
            skills: resume.aiAnalysis?.detectedSkills || [],
            manager,
            documents: {
                resume: resume.resumeFile || '',
            },
        });

        onboarding.employee = employee._id;
        onboarding.status = 'completed';
        onboarding.completedAt = new Date();
        await onboarding.save();

        decision.employee = employee._id;
        decision.status = 'employee_created';
        await decision.save();

        resume.status = 'employee';
        resume.hiringDecision = decision._id;
        resume.onboardingRecord = onboarding._id;
        await resume.save();

        await sendEmail({
            to: decision.candidateEmail,
            subject: `Onboarding complete - ${job.title}`,
            html: `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0f0f1a;color:#e5e7eb;border-radius:12px"><h2 style="margin:0 0 12px">Onboarding completed</h2><p style="color:#9ca3af">Your employee account has been created for <strong>${job.title}</strong>.</p></div>`,
        });

        await refreshJobRankings(job._id);

        res.json({ success: true, data: { onboarding, employee } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getCandidateOffers = async (req, res) => {
    try {
        const email = req.user.email.toLowerCase();
        const offers = await OfferLetter.find({ candidateEmail: email })
            .populate('job', 'title department location')
            .populate('decision')
            .sort({ createdAt: -1 });

        const onboarding = await Onboarding.find({ candidateEmail: email }).populate('employee');

        res.json({
            success: true,
            data: offers.map((offer) => ({
                ...offer.toObject(),
                fileUrl: offer.filePath ? `/uploads/offers/${path.basename(offer.filePath)}` : null,
            })),
            onboarding,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getMyApplications = async (req, res) => {
    try {
        const email = req.user.email.toLowerCase();
        const applications = await HiringDecision.find({ candidateEmail: email })
            .populate('job', 'title department location salaryRange')
            .populate('interviewSession')
            .populate('offerLetter')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: applications
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getAllOnboardings = async (req, res) => {
    try {
        const onboardings = await Onboarding.find()
            .populate('employee')
            .populate('decision')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: onboardings
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    listHiringDecisions,
    getHiringRanking,
    generateOfferLetter,
    rejectCandidate,
    respondToOffer,
    completeOnboarding,
    getCandidateOffers,
    getMyApplications,
    getAllOnboardings,
};