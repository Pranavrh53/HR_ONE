"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Briefcase, Clock, CheckCircle, XCircle, Mic, AlertCircle, ChevronRight, BarChart2, FileText } from "lucide-react";
import Link from "next/link";

const PIPELINE = [
    { key: "applied", label: "Applied" },
    { key: "screened", label: "AI Screening" },
    { key: "shortlisted", label: "Shortlisted" },
    { key: "interview", label: "Interview" },
    { key: "interviewed", label: "Completed" },
    { key: "awaiting_hr_review", label: "HR Review" },
    { key: "selected", label: "Selected" },
    { key: "offer_generated", label: "Offer" },
    { key: "offer_accepted", label: "Onboarding" },
    { key: "employee", label: "Employee" },
];

const statusColor: Record<string, string> = {
    applied: "bg-muted/60 text-muted-foreground",
    screened: "bg-blue-500/10 text-blue-400",
    shortlisted: "bg-violet-500/10 text-violet-400",
    interview: "bg-amber-500/10 text-amber-400",
    interviewed: "bg-cyan-500/10 text-cyan-400",
    awaiting_hr_review: "bg-sky-500/10 text-sky-400",
    top_candidate: "bg-emerald-500/10 text-emerald-400",
    recommended: "bg-blue-500/10 text-blue-400",
    needs_hr_review: "bg-amber-500/10 text-amber-400",
    not_recommended: "bg-red-500/10 text-red-400",
    selected: "bg-emerald-500/10 text-emerald-400",
    offer_generated: "bg-indigo-500/10 text-indigo-400",
    offer_accepted: "bg-emerald-500/10 text-emerald-400",
    offer_declined: "bg-red-500/10 text-red-400",
    onboarding: "bg-cyan-500/10 text-cyan-400",
    employee: "bg-emerald-500/10 text-emerald-400",
    rejected: "bg-red-500/10 text-red-400",
    pending: "bg-muted/60 text-muted-foreground",
};

function StatusPipeline({ current }: { current: string }) {
    const idx = PIPELINE.findIndex(s => s.key === current);
    const isRejected = current === "rejected";
    return (
        <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-1">
            {PIPELINE.map((step, i) => {
                const done = !isRejected && i <= idx;
                const active = step.key === current;
                return (
                    <div key={step.key} className="flex items-center gap-1 shrink-0">
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all ${active ? "bg-violet-500/20 text-violet-300 border border-violet-500/40" :
                                done ? "bg-emerald-500/10 text-emerald-400/80" : "text-muted-foreground/50"
                            }`}>
                            {done && !active && <CheckCircle className="w-3 h-3" />}
                            {step.label}
                        </div>
                        {i < PIPELINE.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/30 shrink-0" />}
                    </div>
                );
            })}
            {isRejected && (
                <span className="text-xs px-2 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/30 flex items-center gap-1 shrink-0">
                    <XCircle className="w-3 h-3" /> Rejected
                </span>
            )}
        </div>
    );
}

function ScoreBar({ score }: { score: number }) {
    const color = score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
            </div>
            <span className="text-xs font-medium w-8 text-right">{score}</span>
        </div>
    );
}

export default function MyApplicationsPage() {
    const [apps, setApps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/careers/my-applications")
            .then(r => setApps(r.data.data || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <FileText className="w-6 h-6 text-violet-400" /> My Applications
                </h1>
                <p className="text-muted-foreground text-sm mt-1">Track your job applications and interview progress.</p>
            </div>

            {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-40 rounded-2xl bg-muted/30 animate-pulse" />)}</div>
            ) : apps.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border/50 rounded-2xl text-muted-foreground space-y-3">
                    <Briefcase className="w-12 h-12 mx-auto opacity-30" />
                    <p className="font-medium">No applications yet</p>
                    <Link href="/portal/jobs" className="text-violet-400 hover:text-violet-300 text-sm">Browse open positions →</Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {apps.map(app => (
                        <div key={app._id} className="p-5 rounded-2xl border border-border/50 bg-card hover:border-violet-500/30 transition-all space-y-4">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                                        <Briefcase className="w-5 h-5 text-violet-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">{app.job?.title || "Job Position"}</p>
                                        <p className="text-xs text-muted-foreground">{app.job?.department} · {app.job?.location}</p>
                                    </div>
                                </div>
                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusColor[app.status] || statusColor.pending}`}>
                                    {app.status}
                                </span>
                            </div>

                            {/* Metadata row */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div>
                                    <p className="text-muted-foreground mb-0.5">Applied</p>
                                    <p className="font-medium">{new Date(app.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground mb-0.5">AI Score</p>
                                    {app.aiScore > 0 ? <ScoreBar score={app.aiScore} /> : <p className="text-muted-foreground">Pending</p>}
                                </div>
                                <div>
                                    <p className="text-muted-foreground mb-0.5">Screening</p>
                                    <p className="font-medium capitalize">{app.screeningStatus || "pending"}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground mb-0.5">Hiring</p>
                                    <span className="font-medium capitalize">
                                        {app.hiringRecommendation || app.offerStatus || app.onboardingStatus || app.interviewStatus || app.status || "pending"}
                                    </span>
                                </div>
                            </div>

                            {(app.hiringScore || app.offerStatus || app.onboardingStatus) && (
                                <div className="grid grid-cols-3 gap-3 text-xs p-3 rounded-xl bg-muted/20 border border-border/30">
                                    <div>
                                        <p className="text-muted-foreground mb-0.5">Final Score</p>
                                        <p className="font-semibold">{app.hiringScore || 0}/100</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground mb-0.5">Recommendation</p>
                                        <p className="font-semibold">{app.hiringRecommendation || "Awaiting HR"}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground mb-0.5">Offer</p>
                                        <p className="font-semibold">{app.offerStatus || "Not generated"}</p>
                                    </div>
                                </div>
                            )}

                            {/* Pipeline */}
                            <StatusPipeline current={app.status} />

                            {/* Interview CTA */}
                            {app.hasInterview && (app.interviewStatus === "pending" || app.interviewStatus === null) && (
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                                    <p className="text-xs text-amber-300 flex-1">AI Interview is available! Click below to start.</p>
                                    <Link href="/portal/interviews">
                                        <button className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all font-medium flex items-center gap-1">
                                            <Mic className="w-3 h-3" /> Go to Interview
                                        </button>
                                    </Link>
                                </div>
                            )}

                            {app.offerStatus === "sent" && (
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                                    <p className="text-xs text-emerald-300 flex-1">Your offer has been generated. Visit the Offers section to review and respond.</p>
                                    <Link href="/portal/offers" className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all font-medium">
                                        View Offer
                                    </Link>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
