const axios = require('axios');
const Resume = require('../models/Resume');
const Employee = require('../models/Employee');
const LeaveRequest = require('../models/LeaveRequest');
const Job = require('../models/Job');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// ─── Gemini with exponential backoff ─────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const callGemini = async (prompt, retries = 3) => {
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set in backend .env');

    const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
    };

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const res = await axios.post(GEMINI_URL, body, { timeout: 20000 });
            const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error('Empty Gemini response');
            return text.trim();
        } catch (err) {
            const status = err.response?.status;
            const isRateLimit = status === 429 || String(err.message).includes('429');

            if (isRateLimit && attempt < retries - 1) {
                const delay = 2000 * Math.pow(2, attempt);
                console.log(`[HR Chat] Rate limited (429), retry ${attempt + 1}/${retries} in ${delay}ms`);
                await sleep(delay);
                continue;
            }
            throw err;
        }
    }
};

// ─── Build live DB context for the user ──────────────────────────────────────
const buildContext = async (user) => {
    const ctx = { role: user.role, name: user.name, email: user.email };

    if (user.role === 'candidate') {
        const applications = await Resume.find({ candidateEmail: user.email.toLowerCase() })
            .populate('job', 'title department status')
            .populate('interviewSession')
            .sort({ createdAt: -1 })
            .limit(5);

        ctx.applications = applications.map(app => ({
            jobTitle: app.job?.title,
            status: app.status,
            screeningStatus: app.screeningStatus,
            interviewStatus: app.interviewSession?.status,
            hiringScore: app.hiringScore,
            hiringRecommendation: app.hiringRecommendation,
        }));
    } else if (['employee', 'admin', 'hr', 'senior_manager'].includes(user.role)) {
        const emp = await Employee.findOne({ email: user.email.toLowerCase() });
        if (emp) {
            ctx.employeeDetails = {
                employeeId: emp.employeeId,
                department: emp.department,
                designation: emp.designation,
                dateOfJoining: emp.dateOfJoining,
                status: emp.status,
            };
            const leaves = await LeaveRequest.find({ employee: emp._id, status: 'approved' });
            const used = leaves.reduce((s, l) => s + l.totalDays, 0);
            ctx.leaveBalance = { totalAnnualQuota: 24, used, remaining: 24 - used };
        }

        if (['admin', 'hr', 'senior_manager'].includes(user.role)) {
            const [openJobs, weekApps, totalApps, shortlisted] = await Promise.all([
                Job.countDocuments({ status: 'open' }),
                Resume.countDocuments({ createdAt: { $gt: new Date(Date.now() - 7 * 86400000) } }),
                Resume.countDocuments(),
                Resume.countDocuments({ status: { $in: ['shortlisted', 'interview', 'interviewed'] } }),
            ]);
            ctx.hrStats = { openJobs, weekApps, totalApps, shortlisted };
        }
    }

    return ctx;
};

// ─── Role-specific system prompt ─────────────────────────────────────────────
const buildPrompt = (message, ctx) => {
    const tones = {
        candidate: `You are a friendly HR Assistant helping candidate ${ctx.name} with their job application at TalentSphere.`,
        employee: `You are a helpful HR Assistant for TalentSphere employee ${ctx.name}. Help with leaves, payroll, attendance, and policies.`,
        hr: `You are a professional HR Analytics Assistant for ${ctx.name}. Help with recruitment stats and hiring decisions.`,
        admin: `You are a professional HR Analytics Assistant for ${ctx.name} (Admin). Help with recruitment stats and employee management.`,
        senior_manager: `You are a strategic HR Assistant for ${ctx.name} (Senior Manager). Help with workforce analytics and hiring.`,
    };
    const tone = tones[ctx.role] || tones.employee;

    return `${tone}

RULE: ONLY answer HR topics (leave, payroll, attendance, recruitment, interviews, onboarding, policies).
ONBOARDING POLICY: New hires must submit Aadhaar, PAN, and Educational Certificates. Orientation tasks include System Setup and Manager Sync.
For anything else say: "I can assist only with HR-related queries."

USER DATA:
${JSON.stringify(ctx, null, 2)}

QUESTION: ${message}

Reply in 2-4 sentences, be concise and friendly.`;
};

// ─── Smart Offline Fallback (scored topic matching) ──────────────────────────
const offlineFallback = (message, ctx) => {
    const msg = message.toLowerCase().trim();

    // Score each topic by how many keywords match
    const topics = [
        {
            name: 'greeting',
            keywords: ['hello', 'hi ', 'hey', 'help', 'what can you do', 'menu'],
            handler: () => `👋 Hello ${ctx.name}! I'm your TalentSphere AI HR Assistant. I can help you with:\n• 📋 Application status\n• 🎤 Interview tips\n• 📅 Leave balance & policy\n• 💰 Payroll & salary info\n• ⏰ Attendance queries\n• 🚀 Onboarding guidance\n• 📊 Recruitment analytics\nJust ask me anything HR-related!`,
        },
        {
            name: 'interview_help',
            keywords: ['interview help', 'interview tip', 'prepare for interview', 'interview question', 'how to prepare', 'interview advice', 'interview prep'],
            handler: () => `🎤 **Interview Tips**:\n• Research the role and company beforehand\n• Practice common behavioral questions (STAR method)\n• Keep answers concise — 2-3 minutes per question\n• Prepare 2-3 questions to ask the interviewer\n• Test your camera, mic, and internet if it's a virtual interview\n• Be confident and authentic. Good luck! 🚀`,
        },
        {
            name: 'application_status',
            keywords: ['application status', 'my application', 'application update', 'where is my application', 'my status', 'am i selected', 'result'],
            handler: () => {
                if (ctx.applications && ctx.applications.length > 0) {
                    const latest = ctx.applications[0];
                    const statusMap = {
                        'screened': 'screened by our AI system',
                        'shortlisted': 'shortlisted for interview',
                        'interview': 'currently in the interview stage',
                        'interviewed': 'interview completed and under review',
                        'selected': 'selected — congratulations! Check your offers',
                        'rejected': 'not moving forward at this time',
                        'onboarding': 'in the onboarding phase',
                        'employee': 'completed — you are now an employee!',
                        'awaiting_hr_review': 'under HR review',
                    };
                    const statusText = statusMap[latest.status] || latest.status;
                    let reply = `📋 Your latest application for **${latest.jobTitle || 'the position'}** is currently: **${statusText}**.`;
                    if (latest.hiringScore) reply += ` Your AI hiring score is **${latest.hiringScore}/100**.`;
                    if (latest.hiringRecommendation) reply += ` Recommendation: ${latest.hiringRecommendation}.`;
                    return reply;
                }
                return "I don't see any active applications associated with your account. Please apply through the Career Portal first!";
            },
        },
        {
            name: 'leave',
            keywords: ['leave', 'vacation', 'time off', 'holiday', 'leave balance', 'sick leave', 'casual leave', 'earned leave', 'apply leave'],
            handler: () => {
                if (ctx.leaveBalance) {
                    const lb = ctx.leaveBalance;
                    return `📅 **Leave Balance**: You have used **${lb.used}** of your **${lb.totalAnnualQuota}** annual leaves. Remaining: **${lb.remaining} days**. Breakdown: 12 Casual, 10 Sick, 15 Earned leaves per year. Apply from the Leave Management tab.`;
                }
                return "📅 **Leave Policy**: TalentSphere provides 12 Casual, 10 Sick, and 15 Earned leaves per year (total 37). Apply from the Leave Management tab in your dashboard.";
            },
        },
        {
            name: 'payroll',
            keywords: ['payroll', 'salary', 'payslip', 'compensation', 'pay date', 'tax', 'deduction', 'ctc', 'wage'],
            handler: () => "💰 **Payroll Info**: Salaries are disbursed on the 1st of every month. Tax deduction is 10% of basic salary. HRA is 40% of basic. You can view and download your payslips from the **Payroll** tab in your dashboard.",
        },
        {
            name: 'attendance',
            keywords: ['attendance', 'check in', 'check out', 'clock in', 'clock out', 'working hours', 'late', 'punch'],
            handler: () => "⏰ **Attendance**: You can mark your attendance from the Attendance tab. Working hours are 9 AM to 6 PM. Late arrivals are tracked automatically. Contact your manager for any attendance discrepancies.",
        },
        {
            name: 'onboarding',
            keywords: ['onboarding', 'joining', 'first day', 'aadhaar', 'pan card', 'document submission', 'welcome kit', 'nda', 'orientation'],
            handler: () => "🚀 **Onboarding**: New employees must submit:\n• Aadhaar Card & PAN Card\n• Educational Certificates\n• Experience Documents & Previous Payslips\n• Signed NDAs\nYou can track your onboarding progress and access your AI Welcome Kit from the **Onboarding** tab.",
        },
        {
            name: 'hr_stats',
            keywords: ['recruitment stats', 'hiring stats', 'analytics', 'open jobs', 'total applications', 'workforce'],
            handler: () => {
                if (ctx.hrStats) {
                    const s = ctx.hrStats;
                    return `📊 **Recruitment Dashboard**: ${s.openJobs} open positions, ${s.totalApps} total applications, ${s.weekApps} this week, ${s.shortlisted} shortlisted candidates. Visit the Analytics tab for detailed workforce intelligence.`;
                }
                return "📊 Visit the **Analytics** tab for detailed workforce intelligence and recruitment metrics.";
            },
        },
        {
            name: 'profile',
            keywords: ['my profile', 'my detail', 'employee id', 'my department', 'my designation', 'who am i'],
            handler: () => {
                if (ctx.employeeDetails) {
                    const e = ctx.employeeDetails;
                    return `👤 **Your Profile**: Employee ID: ${e.employeeId || 'N/A'}, Department: ${e.department || 'N/A'}, Designation: ${e.designation || 'N/A'}, Joined: ${e.dateOfJoining ? new Date(e.dateOfJoining).toLocaleDateString() : 'N/A'}, Status: ${e.status}.`;
                }
                return "I couldn't find your employee profile. Please contact HR for assistance.";
            },
        },
        {
            name: 'policy',
            keywords: ['policy', 'policies', 'rule', 'guideline', 'company rule', 'work from home', 'wfh', 'probation'],
            handler: () => "📜 **Company Policies**: TalentSphere follows a standard 5-day work week (Mon-Fri). Core hours: 9 AM - 6 PM. Leave policy: 12 Casual + 10 Sick + 15 Earned = 37 days/year. Probation period: 3 months. For detailed policy documents, check the Onboarding section.",
        },
        {
            name: 'job_search',
            keywords: ['job', 'open position', 'career', 'vacancy', 'apply for job', 'current opening'],
            handler: () => "💼 **Job Openings**: You can browse all current job openings on the **Career Portal**. Each listing includes the role description, required skills, and salary range. Apply directly and our AI will screen your resume instantly!",
        },
        {
            name: 'thanks',
            keywords: ['thank', 'thanks', 'thank you', 'great', 'awesome', 'perfect', 'got it'],
            handler: () => `😊 You're welcome, ${ctx.name}! I'm always here to help. Feel free to ask me anything about HR policies, your application, payroll, or leaves anytime.`,
        },
    ];

    // Score each topic — longer keyword phrases get higher priority
    let bestTopic = null;
    let bestScore = 0;

    for (const topic of topics) {
        let score = 0;
        for (const kw of topic.keywords) {
            if (msg.includes(kw)) {
                score += kw.length; // longer phrases score higher = more specific match
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestTopic = topic;
        }
    }

    if (bestTopic && bestScore > 0) {
        return bestTopic.handler();
    }

    // ── Default fallback ─────────────────────────────────────────────────────
    return `I understand your question, ${ctx.name}. As your HR Assistant, I can help you with:\n• Application status & interview tips\n• Leave balance & policies\n• Payroll & salary queries\n• Attendance & onboarding\nCould you please rephrase your question related to one of these topics?`;
};

// ─── Controller ──────────────────────────────────────────────────────────────
const handleHrChat = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message?.trim()) {
            return res.status(400).json({ success: false, reply: 'Please provide a message.' });
        }

        const ctx = await buildContext(req.user);

        // Try Gemini first, fall back to offline engine
        let reply;
        try {
            const prompt = buildPrompt(message.trim(), ctx);
            reply = await callGemini(prompt);
        } catch (aiErr) {
            console.log(`[HR Chat] Gemini unavailable (${aiErr.response?.status || aiErr.message}), using smart fallback`);
            reply = offlineFallback(message.trim(), ctx);
        }

        return res.json({ success: true, reply });
    } catch (err) {
        console.error(`HR Chat Error:`, err.message);
        return res.json({
            success: false,
            reply: 'HR Assistant encountered an error. Please try again shortly.',
        });
    }
};

module.exports = { handleHrChat };
