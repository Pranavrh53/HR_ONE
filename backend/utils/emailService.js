const nodemailer = require('nodemailer');

// Create transporter — in production replace with real SMTP credentials
const createTransporter = () => {
    // If SMTP env vars are set, use them; otherwise use Ethereal (dev catch-all)
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: false,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
    }
    // Dev fallback: log to console
    return null;
};

const sendEmail = async ({ to, subject, html, attachments = [] }) => {
    try {
        const transporter = createTransporter();
        if (!transporter) {
            // Dev mode: print to console instead of sending
            console.log('\n📧 EMAIL (dev mode — not sent):');
            console.log(`  To:      ${to}`);
            console.log(`  Subject: ${subject}`);
            console.log('  Body:    [HTML email]');
            if (attachments.length) {
                console.log(`  Attachments: ${attachments.map(a => a.filename || a.path || 'attachment').join(', ')}`);
            }
            console.log('  (Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env to enable real emails)\n');
            return { success: true, dev: true };
        }
        const info = await transporter.sendMail({
            from: `"TalentSphere AI" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to, subject, html, attachments,
        });
        console.log(`📧 Email sent to ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error('📧 Email send error:', err.message);
        return { success: false, error: err.message };
    }
};

// ── Email Templates ─────────────────────────────────────────────────────────

const sendApplicationConfirmation = async ({ candidateName, candidateEmail, jobTitle }) => {
    return sendEmail({
        to: candidateEmail,
        subject: `Application Received — ${jobTitle}`,
        html: `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0f0f1a;color:#e5e7eb;border-radius:12px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#6d28d9,#2563eb);padding:32px;text-align:center">
                <h1 style="margin:0;color:white;font-size:22px">🎯 Application Received!</h1>
            </div>
            <div style="padding:32px">
                <p style="margin:0 0 16px">Hi <strong>${candidateName}</strong>,</p>
                <p style="margin:0 0 16px;color:#9ca3af">We've received your application for <strong style="color:#e5e7eb">${jobTitle}</strong>.</p>
                <div style="background:#1e1e2e;border:1px solid #374151;border-radius:8px;padding:16px;margin:20px 0">
                    <p style="margin:0;font-size:14px;color:#9ca3af">📋 What happens next:</p>
                    <ul style="margin:8px 0 0;padding-left:20px;color:#d1d5db;font-size:14px">
                        <li>Our AI will screen your resume (usually within minutes)</li>
                        <li>If shortlisted, you'll receive an interview invitation</li>
                        <li>Complete your AI voice interview from your candidate portal</li>
                    </ul>
                </div>
                <p style="margin:0;font-size:13px;color:#6b7280">Track your application status at <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/portal" style="color:#8b5cf6">your candidate portal</a>.</p>
            </div>
            <div style="padding:16px 32px;border-top:1px solid #374151;font-size:12px;color:#6b7280;text-align:center">TalentSphere AI · Intelligent Hiring Platform</div>
        </div>`,
    });
};

const sendShortlistNotification = async ({ candidateName, candidateEmail, jobTitle, interviewToken, deadline }) => {
    const portalUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const interviewUrl = `${portalUrl}/portal/interviews`;
    const deadlineStr = deadline ? new Date(deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '7 days from today';

    return sendEmail({
        to: candidateEmail,
        subject: `🎉 Congratulations! You've been shortlisted for ${jobTitle}`,
        html: `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0f0f1a;color:#e5e7eb;border-radius:12px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#059669,#2563eb);padding:32px;text-align:center">
                <h1 style="margin:0;color:white;font-size:22px">🎉 You've Been Shortlisted!</h1>
            </div>
            <div style="padding:32px">
                <p style="margin:0 0 16px">Hi <strong>${candidateName}</strong>,</p>
                <p style="margin:0 0 16px;color:#9ca3af">Congratulations! You have successfully cleared the AI screening stage for <strong style="color:#e5e7eb">${jobTitle}</strong>.</p>
                <p style="margin:0 0 16px;color:#9ca3af">Your AI Voice Interview is now available and ready to begin.</p>
                <div style="background:#1e1e2e;border:1px solid #374151;border-radius:8px;padding:16px;margin:20px 0">
                    <p style="margin:0 0 8px;font-size:14px;color:#9ca3af">📋 Interview Details:</p>
                    <p style="margin:4px 0;font-size:14px;color:#d1d5db">🎯 Position: <strong>${jobTitle}</strong></p>
                    <p style="margin:4px 0;font-size:14px;color:#d1d5db">📅 Deadline: <strong style="color:#f59e0b">${deadlineStr}</strong></p>
                    <p style="margin:4px 0;font-size:14px;color:#d1d5db">⏱ Duration: ~15–20 minutes</p>
                    <p style="margin:4px 0;font-size:14px;color:#d1d5db">🎙 Format: AI Voice Interview</p>
                </div>
                <div style="text-align:center;margin:24px 0">
                    <a href="${interviewUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6d28d9,#2563eb);color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px">
                        🎙 Start My AI Interview
                    </a>
                </div>
                <p style="font-size:13px;color:#6b7280;text-align:center">Login at <a href="${portalUrl}/portal" style="color:#8b5cf6">${portalUrl}/portal</a> to access your interview.</p>
            </div>
            <div style="padding:16px 32px;border-top:1px solid #374151;font-size:12px;color:#6b7280;text-align:center">TalentSphere AI · Intelligent Hiring Platform</div>
        </div>`,
    });
};

module.exports = { sendEmail, sendApplicationConfirmation, sendShortlistNotification };
