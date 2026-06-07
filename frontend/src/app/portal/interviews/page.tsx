"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Mic, Clock, CheckCircle, Play, Briefcase, Calendar, AlertTriangle, BarChart3 } from "lucide-react";
import Link from "next/link";

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
    pending: { label: "Available", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    in_progress: { label: "In Progress", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
    completed: { label: "Completed", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
    abandoned: { label: "Expired", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
};

function Countdown({ deadline }: { deadline: string }) {
    const now = new Date();
    const end = new Date(deadline);
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return <span className="text-red-400 text-xs">Expired</span>;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return <span className="text-xs text-amber-400">{days}d {hours}h remaining</span>;
}

export default function MyInterviewsPage() {
    const [interviews, setInterviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        api.get("/careers/my-interviews")
            .then(r => setInterviews(r.data.data || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleStart = async (iv: any) => {
        setStarting(iv.token);
        try {
            await api.post(`/careers/interview/${iv.token}/start`);
            router.push(`/portal/interviews/${iv.token}`);
        } catch (err) {
            router.push(`/portal/interviews/${iv.token}`);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Mic className="w-6 h-6 text-violet-400" /> My Interviews
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                    AI-powered voice interviews assigned to you. Complete before the deadline.
                </p>
            </div>

            {loading ? (
                <div className="space-y-4">{[1, 2].map(i => <div key={i} className="h-44 bg-muted/30 rounded-2xl animate-pulse" />)}</div>
            ) : interviews.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border/50 rounded-2xl space-y-4">
                    <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto">
                        <Mic className="w-8 h-8 text-violet-400/50" />
                    </div>
                    <div>
                        <p className="font-semibold text-muted-foreground">No Interviews Assigned Yet</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">When you're shortlisted, your AI interview will appear here.</p>
                    </div>
                    <Link href="/portal/applications" className="inline-flex text-sm text-violet-400 hover:text-violet-300">
                        Check your applications →
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {interviews.map(iv => {
                        const sc = statusConfig[iv.status] || statusConfig.pending;
                        const isAvailable = iv.status === "pending" || iv.status === "in_progress";
                        const isCompleted = iv.status === "completed";
                        return (
                            <div key={iv.token} className={`p-5 rounded-2xl border ${isAvailable ? "border-violet-500/30 bg-violet-500/5" : "border-border/50 bg-card"} space-y-4`}>
                                {/* Header */}
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/20">
                                            <Mic className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-lg">{iv.jobTitle}</p>
                                            <p className="text-sm text-muted-foreground">{iv.department}{iv.location ? ` · ${iv.location}` : ''}</p>
                                        </div>
                                    </div>
                                    <span className={`text-xs px-3 py-1 rounded-full font-medium border ${sc.color} ${sc.bg} ${sc.border}`}>
                                        {sc.label}
                                    </span>
                                </div>

                                {/* Info grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                                            <Calendar className="w-3 h-3" /> Assigned
                                        </p>
                                        <p className="text-sm font-medium">
                                            {iv.assignedAt ? new Date(iv.assignedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                                            <Clock className="w-3 h-3" /> Deadline
                                        </p>
                                        {iv.deadline ? (
                                            <div>
                                                <p className="text-sm font-medium">{new Date(iv.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                                                <Countdown deadline={iv.deadline} />
                                            </div>
                                        ) : <p className="text-sm text-muted-foreground">No deadline</p>}
                                    </div>
                                    {isCompleted && iv.finalScore != null && (
                                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                                            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                                                <BarChart3 className="w-3 h-3" /> Final Score
                                            </p>
                                            <p className="text-xl font-bold text-emerald-400">{iv.finalScore}<span className="text-sm font-normal text-muted-foreground">/100</span></p>
                                        </div>
                                    )}
                                </div>

                                {/* How it works */}
                                {isAvailable && (
                                    <div className="p-3 rounded-xl bg-muted/20 border border-border/30 text-xs text-muted-foreground space-y-1">
                                        <p className="font-medium text-foreground">How the AI Interview works:</p>
                                        <p>🎙 The AI will ask you questions via text-to-speech</p>
                                        <p>🎤 Speak your answers — they're transcribed in real-time</p>
                                        <p>⏱ Each interview takes approximately 15–20 minutes</p>
                                        <p>📊 You'll receive an instant score upon completion</p>
                                    </div>
                                )}

                                {/* Action */}
                                <div className="flex items-center gap-3">
                                    {isAvailable && (
                                        <button
                                            onClick={() => handleStart(iv)}
                                            disabled={starting === iv.token}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white font-medium text-sm disabled:opacity-60 transition-all shadow-lg shadow-violet-500/20"
                                        >
                                            {starting === iv.token ? (
                                                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Preparing...</>
                                            ) : (
                                                <><Play className="w-4 h-4" /> Start AI Interview</>
                                            )}
                                        </button>
                                    )}
                                    {isCompleted && iv.sessionId && (
                                        <Link href={`/dashboard/interview/report/${iv.sessionId}`}>
                                            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/40 text-emerald-400 text-sm hover:bg-emerald-500/10 transition-all">
                                                <BarChart3 className="w-4 h-4" /> View Report
                                            </button>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Tips */}
            <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
                <p className="text-sm font-medium text-blue-300 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Before you start
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Use <strong>Google Chrome</strong> for best speech recognition support</li>
                    <li>Find a <strong>quiet environment</strong> with no background noise</li>
                    <li>Allow microphone access when the browser asks</li>
                    <li>Ensure you have a <strong>stable internet connection</strong></li>
                </ul>
            </div>
        </div>
    );
}
