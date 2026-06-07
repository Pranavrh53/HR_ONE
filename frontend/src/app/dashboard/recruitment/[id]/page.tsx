"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Star, ArrowLeft, Users, CheckCircle, AlertCircle, XCircle,
    Brain, GitCompare, Sparkles, ChevronRight, RefreshCw, Mic, BarChart3, Target
} from "lucide-react";
import CandidateCompareModal from "@/components/CandidateCompareModal";

const recommendationColors: Record<string, string> = {
    "Highly Recommended": "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    "Recommended": "bg-blue-500/10 text-blue-400 border-blue-500/30",
    "Needs Review": "bg-amber-500/10 text-amber-400 border-amber-500/30",
    "Not Recommended": "bg-red-500/10 text-red-400 border-red-500/30",
};

const interviewRecColor: Record<string, string> = {
    "Strong Hire": "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    "Hire": "text-blue-400 bg-blue-500/10 border-blue-500/30",
    "Consider": "text-amber-400 bg-amber-500/10 border-amber-500/30",
    "Reject": "text-red-400 bg-red-500/10 border-red-500/30",
};

function ScoreRing({ score }: { score: number }) {
    const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
    return (
        <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
            <svg className="absolute" width="48" height="48" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
                <circle cx="24" cy="24" r="20" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={`${(score / 100) * 125.7} 125.7`} transform="rotate(-90 24 24)" />
            </svg>
            <span className="text-xs font-bold" style={{ color }}>{score}</span>
        </div>
    );
}

export default function JobRecruitmentDashboard({ params }: { params: Promise<{ id: string }> }) {
    const { id: jobId } = use(params);

    const [job, setJob] = useState<any>(null);
    const [applications, setApplications] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [interviews, setInterviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [compareOpen, setCompareOpen] = useState(false);
    const [compareLoading, setCompareLoading] = useState(false);
    const [compareReport, setCompareReport] = useState<any>(null);
    const [shortlistMin, setShortlistMin] = useState(75);
    const [shortlistTopN, setShortlistTopN] = useState(10);
    const [actionMsg, setActionMsg] = useState("");
    const [activeTab, setActiveTab] = useState<"candidates" | "interviews">("candidates");

    const fetchData = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const [jobRes, appsRes, statsRes, interviewRes] = await Promise.all([
                api.get(`/jobs/${jobId}`),
                api.get(`/resumes`, { params: { jobId } }),
                api.get(`/resumes/stats`, { params: { jobId } }),
                api.get(`/interview/list/${jobId}`).catch(() => ({ data: { data: [] } })),
            ]);
            setJob(jobRes.data.data);
            setApplications(appsRes.data.data || []);
            setStats(statsRes.data.data || null);
            setInterviews(interviewRes.data.data || []);
            return statsRes.data.data;
        } catch (e) {
            console.error(e);
            return null;
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        let pollTimer: ReturnType<typeof setInterval> | null = null;

        const init = async () => {
            try {
                await api.post('/resumes/screen-pending', { jobId });
            } catch { /* queue best-effort */ }

            const stats = await fetchData();
            if (stats?.screeningPending > 0 || stats?.pendingScreening > 0) {
                let polls = 0;
                pollTimer = setInterval(async () => {
                    polls += 1;
                    const s = await fetchData(true);
                    if ((!s?.screeningPending && !s?.pendingScreening) || polls >= 24) {
                        if (pollTimer) clearInterval(pollTimer);
                    }
                }, 5000);
            }
        };

        init();
        return () => { if (pollTimer) clearInterval(pollTimer); };
    }, [jobId]);

    const rankedApps = useMemo(
        () => [...applications].sort((a, b) => (b.aiAnalysis?.score || 0) - (a.aiAnalysis?.score || 0)),
        [applications]
    );

    const shortlistedApps = useMemo(
        () => rankedApps.filter(a => a.status === 'shortlisted' || a.status === 'interview' || a.status === 'interviewed'),
        [rankedApps]
    );

    const toggleSelect = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleCompare = async () => {
        if (selected.size < 2) return;
        setCompareOpen(true);
        setCompareLoading(true);
        setCompareReport(null);
        try {
            const res = await api.post("/resumes/compare", { resumeIds: Array.from(selected) });
            setCompareReport(res.data.data);
        } catch (e: any) {
            setCompareReport({ comparison_summary: e.response?.data?.message || "Comparison failed" });
        } finally {
            setCompareLoading(false);
        }
    };

    const handleAutoShortlist = async () => {
        try {
            const res = await api.post("/resumes/auto-shortlist", {
                jobId,
                minScore: shortlistMin,
                topN: shortlistTopN,
            });
            setActionMsg(res.data.message);
            fetchData();
        } catch (e: any) {
            setActionMsg(e.response?.data?.message || "Auto-shortlist failed");
        }
    };

    const handleShortlist = async (resumeId: string) => {
        await api.put(`/resumes/${resumeId}/status`, { status: 'shortlisted' });
        setApplications(prev => prev.map(r => r._id === resumeId ? { ...r, status: 'shortlisted' } : r));
    };

    const handleReject = async (resumeId: string) => {
        await api.put(`/resumes/${resumeId}/status`, { status: 'rejected' });
        setApplications(prev => prev.map(r => r._id === resumeId ? { ...r, status: 'rejected' } : r));
    };

    const tabs = [
        { key: "candidates", label: `All Candidates (${applications.length})` },
        { key: "interviews", label: `AI Interviews (${interviews.length})` },
    ] as const;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <Link href="/dashboard/recruitment" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 w-fit">
                    <ArrowLeft className="w-4 h-4" /> Back to Recruitment Hub
                </Link>
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Star className="w-6 h-6 text-amber-400" />
                            {job?.title || "AI Recruitment Pipeline"}
                        </h1>
                        <p className="text-muted-foreground mt-1">{job?.department} · {job?.location}</p>
                    </div>
                    <Badge className={`text-xs border ${job?.status === 'open' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-muted/50 border-muted'}`}>
                        {job?.status}
                    </Badge>
                </div>
            </div>

            {/* Pipeline banner */}
            <div className="flex flex-wrap items-center gap-2 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300">
                {["Apply", "AI Screen", "Rank", "HR Review", "Shortlist", "🎙 AI Interview", "Hire"].map((step, i) => (
                    <span key={step} className="flex items-center gap-2">
                        {i > 0 && <ChevronRight className="w-3 h-3 opacity-50" />}
                        <span className={`px-2 py-1 rounded-md ${step.startsWith("🎙") ? "bg-violet-500/30 font-semibold" : "bg-violet-500/15"}`}>{step}</span>
                    </span>
                ))}
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: "Applications Received", value: stats.applicationsReceived, icon: Users, color: "text-foreground" },
                        { label: "AI Screening Done", value: stats.screeningCompleted, icon: CheckCircle, color: "text-emerald-400" },
                        { label: "Screening Pending", value: stats.screeningPending, icon: RefreshCw, color: "text-amber-400" },
                        { label: "Shortlisted", value: stats.shortlisted, icon: Star, color: "text-violet-400" },
                    ].map((item) => (
                        <Card key={item.label} className="border-border/50">
                            <CardContent className="p-4">
                                <item.icon className={`w-4 h-4 mb-2 ${item.color}`} />
                                <p className={`text-2xl font-bold ${item.color}`}>{item.value ?? 0}</p>
                                <p className="text-xs text-muted-foreground">{item.label}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {stats?.pendingScreening > 0 && (
                <div className="text-sm text-amber-400 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    {stats.pendingScreening} application(s) pending AI screening — ensure AI service is running on port 8000.
                </div>
            )}

            {/* HR Actions */}
            <Card className="border-border/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-violet-400" /> AI Recruiter Actions
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3 items-end">
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Min score</label>
                        <Input type="number" className="w-20 h-8" value={shortlistMin} onChange={(e) => setShortlistMin(Number(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Top N</label>
                        <Input type="number" className="w-20 h-8" value={shortlistTopN} onChange={(e) => setShortlistTopN(Number(e.target.value))} />
                    </div>
                    <Button size="sm" onClick={handleAutoShortlist} className="bg-emerald-600 hover:bg-emerald-700">
                        <CheckCircle className="w-4 h-4 mr-1" /> AI Auto-Shortlist
                    </Button>
                    <Button size="sm" variant="outline" disabled={selected.size < 2} onClick={handleCompare}>
                        <GitCompare className="w-4 h-4 mr-1" /> Compare ({selected.size})
                    </Button>
                    {actionMsg && <p className="text-xs text-muted-foreground w-full">{actionMsg}</p>}
                </CardContent>
            </Card>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-muted/30 rounded-lg w-fit">
                {tabs.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── CANDIDATES TAB ── */}
            {activeTab === "candidates" && (
                <Card className="border-border/50">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Brain className="w-5 h-5 text-violet-400" /> AI-Ranked Candidates
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
                        {!loading && rankedApps.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                No applications yet. Share the career portal: <Link href="/careers" className="text-violet-400">/careers</Link>
                            </p>
                        )}
                        {rankedApps.map((app, index) => {
                            const a = app.aiAnalysis || {};
                            const isPending = app.screeningStatus !== 'completed' || !a.score;
                            const isShortlisted = ['shortlisted', 'interview', 'interviewed'].includes(app.status);
                            const isRejected = app.status === 'rejected';
                            return (
                                <div
                                    key={app._id}
                                    className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${selected.has(app._id) ? "border-violet-500/50 bg-violet-500/5" : "border-border/50"} ${isRejected ? "opacity-50" : ""}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected.has(app._id)}
                                        onChange={() => toggleSelect(app._id)}
                                        className="rounded border-border"
                                    />
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${index === 0 ? "bg-amber-500 text-black" : "bg-muted text-muted-foreground"}`}>
                                        #{index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold">{app.candidateName}</span>
                                            {!isPending && (
                                                <Badge className={`text-[10px] border ${recommendationColors[a.recommendation] || ""}`}>
                                                    {a.recommendation}
                                                </Badge>
                                            )}
                                            {app.screeningStatus === 'in_progress' && <Badge variant="outline" className="text-[10px] text-amber-400">Screening...</Badge>}
                                            {isPending && app.screeningStatus !== 'in_progress' && <Badge variant="outline" className="text-[10px]">Pending AI</Badge>}
                                            {isShortlisted && <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 border">✓ Shortlisted</Badge>}
                                            {isRejected && <Badge className="text-[10px] bg-red-500/10 text-red-400 border-red-500/30 border">Rejected</Badge>}
                                        </div>
                                        <p className="text-xs text-muted-foreground">{app.candidateEmail}</p>
                                        {a.aiInsights && (
                                            <p className="text-xs text-violet-300/80 mt-1 line-clamp-2">{a.aiInsights}</p>
                                        )}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-lg font-bold">{isPending ? "—" : `${a.score}/100`}</p>
                                        <p className="text-[10px] text-muted-foreground capitalize">{app.status}</p>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {isShortlisted && !isRejected && (
                                            <Badge className="text-[10px] bg-violet-500/10 text-violet-300 border-violet-500/30 border">
                                                Interview sent to candidate
                                            </Badge>
                                        )}
                                        {!isShortlisted && !isRejected && !isPending && (
                                            <div className="flex gap-1">
                                                <Button size="sm" variant="outline" onClick={() => handleShortlist(app._id)}
                                                    className="text-xs text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 h-7 px-2">
                                                    ✓ Shortlist
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => handleReject(app._id)}
                                                    className="text-xs text-red-400 border-red-500/30 hover:bg-red-500/10 h-7 px-2">
                                                    ✗ Reject
                                                </Button>
                                            </div>
                                        )}
                                        <Link href={`/dashboard/recruitment/${jobId}/candidates/${app._id}`}>
                                            <Button size="sm" variant="outline" className="h-7 text-xs">View</Button>
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            {/* ── AI INTERVIEWS TAB ── */}
            {activeTab === "interviews" && (
                <Card className="border-border/50">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Mic className="w-5 h-5 text-violet-400" /> AI Interview Results
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {interviews.length === 0 ? (
                            <div className="py-10 text-center space-y-3">
                                <Mic className="w-10 h-10 text-muted-foreground mx-auto" />
                                <p className="font-medium">No AI Interviews Yet</p>
                                <p className="text-sm text-muted-foreground">
                                    Shortlist candidates in the <button onClick={() => setActiveTab("candidates")} className="text-violet-400 underline">Candidates tab</button> and click <strong>Interview</strong> to begin.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {interviews.map((iv: any, i: number) => {
                                    const rec = iv.report?.recommendation || "";
                                    return (
                                        <div key={iv._id} className={`flex items-center gap-4 p-4 rounded-lg border ${i === 0 ? 'border-amber-500/30 bg-amber-500/5' : 'border-border/50'}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-amber-500 text-black' : 'bg-muted text-muted-foreground'}`}>
                                                #{i + 1}
                                            </div>
                                            <ScoreRing score={iv.finalScore || 0} />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold">{iv.candidateName}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Final: <strong>{iv.finalScore}%</strong>
                                                    <span className="mx-1 opacity-40">·</span>
                                                    Resume <strong>{iv.resumeScore}%</strong> × 60% + Interview <strong>{iv.interviewScore}%</strong> × 40%
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                {rec && (
                                                    <Badge className={`text-xs border ${interviewRecColor[rec] || 'text-muted-foreground bg-muted/50 border-muted'}`}>
                                                        {rec}
                                                    </Badge>
                                                )}
                                                <Link href={`/dashboard/interview/report/${iv._id}`}>
                                                    <Button size="sm" variant="outline" className="text-xs gap-1">
                                                        <BarChart3 className="w-3 h-3" /> Report
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                                {interviews.length > 1 && (
                                    <div className="mt-3 p-3 rounded-lg bg-violet-500/5 border border-violet-500/20 text-xs text-violet-300 flex items-center gap-2">
                                        <Target className="w-4 h-4" />
                                        <strong>Top recommendation:</strong> {interviews[0]?.candidateName} with a final score of {interviews[0]?.finalScore}%
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <CandidateCompareModal
                open={compareOpen}
                onClose={() => setCompareOpen(false)}
                loading={compareLoading}
                report={compareReport}
            />
        </div>
    );
}
