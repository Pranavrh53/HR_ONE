"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { Brain, CheckCircle, XCircle, Target, TrendingUp, MessageSquare, Star, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const recommendationConfig: Record<string, { color: string; bg: string; border: string }> = {
    "Strong Hire": { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
    "Hire": { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
    "Consider": { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    "Reject": { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
};

function ScoreBar({ label, score, color = "bg-violet-500" }: { label: string; score: number; color?: string }) {
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{score}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted/30">
                <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${score}%` }} />
            </div>
        </div>
    );
}

function ScoreCircle({ score, label }: { score: number; label: string }) {
    const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="absolute" width="80" height="80" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                    <circle cx="40" cy="40" r="34" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={`${(score / 100) * 213.6} 213.6`} transform="rotate(-90 40 40)" />
                </svg>
                <span className="text-xl font-bold" style={{ color }}>{score}</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">{label}</p>
        </div>
    );
}

export default function InterviewReportPage() {
    const params = useParams();
    const router = useRouter();
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [expandedQ, setExpandedQ] = useState<number | null>(null);

    useEffect(() => {
        api.get(`/interview/report/${params.id}`)
            .then(res => { setSession(res.data.data); setLoading(false); })
            .catch(() => setLoading(false));
    }, [params.id]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
    );

    if (!session) return <div className="p-8 text-muted-foreground">Interview report not found.</div>;

    const r = session.report || {};
    const rec = recommendationConfig[r.recommendation] || recommendationConfig["Consider"];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1 mb-3 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Brain className="w-6 h-6 text-violet-400" />
                        Interview Report
                    </h1>
                    <p className="text-muted-foreground mt-1">{session.candidateName} · {session.jobTitle}</p>
                </div>
                <Badge className={`text-sm px-4 py-1.5 ${rec.bg} ${rec.color} ${rec.border} border`}>
                    {r.recommendation || "Pending"}
                </Badge>
            </div>

            {/* Score Cards */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                <ScoreCircle score={session.resumeScore || 0} label="Resume Score" />
                <ScoreCircle score={session.interviewScore || 0} label="Interview Score" />
                <ScoreCircle score={session.finalScore || 0} label="Final Score" />
                <ScoreCircle score={r.communicationScore || 0} label="Communication" />
                <ScoreCircle score={r.technicalScore || 0} label="Technical" />
            </div>

            {/* Final Score Banner */}
            <Card className={`border ${rec.border} ${rec.bg}`}>
                <CardContent className="p-5 flex items-center justify-between">
                    <div>
                        <p className="text-lg font-bold">Final Score: {session.finalScore}%</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Resume ({session.resumeScore}% × 60%) + Interview ({session.interviewScore}% × 40%)
                        </p>
                    </div>
                    <div className={`text-3xl font-black ${rec.color}`}>
                        {r.recommendation}
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Detailed Scores */}
                <Card className="border-border/50">
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-violet-400" />Score Breakdown</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <ScoreBar label="Technical Skills" score={r.technicalScore || 0} color="bg-blue-500" />
                        <ScoreBar label="Communication" score={r.communicationScore || 0} color="bg-violet-500" />
                        <ScoreBar label="Problem Solving" score={r.problemSolvingScore || 0} color="bg-emerald-500" />
                        <ScoreBar label="Behavioral" score={r.behavioralScore || 0} color="bg-amber-500" />
                        <div className="pt-2 border-t border-border/50">
                            <ScoreBar label="Overall Interview" score={r.overallScore || 0} color="bg-violet-600" />
                        </div>
                    </CardContent>
                </Card>

                {/* Strengths & Weaknesses */}
                <Card className="border-border/50">
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><Star className="w-4 h-4 text-amber-400" />AI Analysis</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-xs font-medium text-emerald-400 mb-2 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Strengths
                            </p>
                            <ul className="space-y-1.5">
                                {(r.strengths || []).map((s: string, i: number) => (
                                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                                        <span className="text-emerald-400 shrink-0">•</span>{s}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="border-t border-border/50 pt-4">
                            <p className="text-xs font-medium text-red-400 mb-2 flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> Areas to Improve
                            </p>
                            <ul className="space-y-1.5">
                                {(r.weaknesses || []).map((w: string, i: number) => (
                                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                                        <span className="text-red-400 shrink-0">•</span>{w}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Summary */}
            {r.summary && (
                <Card className="border-border/50">
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><Brain className="w-4 h-4 text-violet-400" />AI Summary</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{r.summary}</p>
                    </CardContent>
                </Card>
            )}

            {/* Q&A Transcript */}
            {session.answers?.length > 0 && (
                <Card className="border-border/50">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-blue-400" />
                            Interview Transcript ({session.answers.length} Questions)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {session.answers.map((a: any, i: number) => (
                            <div key={i} className="border border-border/50 rounded-xl overflow-hidden">
                                <button
                                    className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/20 transition-colors"
                                    onClick={() => setExpandedQ(expandedQ === i ? null : i)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                            {i + 1}
                                        </div>
                                        <p className="text-sm font-medium text-foreground line-clamp-1">{a.question}</p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0 ml-2">
                                        {a.technicalScore > 0 && (
                                            <Badge variant="secondary" className="text-xs">
                                                {Math.round((a.technicalScore + a.communicationScore + a.clarityScore + a.relevanceScore) / 4)}%
                                            </Badge>
                                        )}
                                        {expandedQ === i ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                                    </div>
                                </button>

                                {expandedQ === i && (
                                    <div className="border-t border-border/50 p-4 space-y-4 bg-muted/10">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1.5">Candidate's Answer</p>
                                            <p className="text-sm leading-relaxed">{a.answer || "No answer recorded"}</p>
                                        </div>
                                        {a.feedback && (
                                            <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-3">
                                                <p className="text-xs text-violet-400 mb-1 font-medium">AI Feedback</p>
                                                <p className="text-xs text-muted-foreground">{a.feedback}</p>
                                            </div>
                                        )}
                                        {a.technicalScore > 0 && (
                                            <div className="grid grid-cols-4 gap-2">
                                                {[
                                                    { label: "Technical", score: a.technicalScore },
                                                    { label: "Communication", score: a.communicationScore },
                                                    { label: "Clarity", score: a.clarityScore },
                                                    { label: "Relevance", score: a.relevanceScore },
                                                ].map((s, si) => (
                                                    <div key={si} className="text-center p-2 rounded-lg bg-muted/20">
                                                        <p className="text-sm font-bold">{s.score}%</p>
                                                        <p className="text-[10px] text-muted-foreground">{s.label}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
