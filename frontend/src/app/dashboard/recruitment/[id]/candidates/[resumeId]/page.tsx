"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import {
    ArrowLeft, FileText, Brain, CheckCircle, XCircle, Calendar,
    Zap, RefreshCw
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const FILE_BASE = API_BASE.replace(/\/api$/, "");

const recommendationColors: Record<string, string> = {
    "Highly Recommended": "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    "Recommended": "bg-blue-500/10 text-blue-400 border-blue-500/30",
    "Needs Review": "bg-amber-500/10 text-amber-400 border-amber-500/30",
    "Not Recommended": "bg-red-500/10 text-red-400 border-red-500/30",
};

export default function CandidateDetailPage({
    params,
}: {
    params: Promise<{ id: string; resumeId: string }>;
}) {
    const { id: jobId, resumeId } = use(params);
    const [app, setApp] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [rescreening, setRescreening] = useState(false);

    const fetchApp = async () => {
        try {
            const res = await api.get(`/resumes/${resumeId}`);
            setApp(res.data.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchApp(); }, [resumeId]);

    const handleStatus = async (status: string) => {
        await api.put(`/resumes/${resumeId}/status`, { status });
        fetchApp();
    };

    const handleRescreen = async () => {
        setRescreening(true);
        try {
            await api.post(`/resumes/${resumeId}/rescreen`);
            fetchApp();
        } finally {
            setRescreening(false);
        }
    };

    if (loading) return <div className="p-6">Loading candidate profile...</div>;
    if (!app) return <div className="p-6">Application not found.</div>;

    const a = app.aiAnalysis || {};
    const isPending = !a.score;

    return (
        <div className="space-y-6">
            <Link href={`/dashboard/recruitment/${jobId}`} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 w-fit">
                <ArrowLeft className="w-4 h-4" /> Back to ranked list
            </Link>

            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">{app.candidateName}</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {app.candidateEmail} • {app.candidatePhone || "No phone"} • Applied {new Date(app.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge className={`border ${recommendationColors[a.recommendation] || ""}`}>
                            {isPending ? "Pending AI Screen" : a.recommendation}
                        </Badge>
                        {a.rank && <Badge variant="outline">Rank #{a.rank}</Badge>}
                        <Badge variant="secondary" className="capitalize">{app.status}</Badge>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-center">
                        <p className="text-4xl font-bold text-violet-400">{isPending ? "—" : a.score}</p>
                        <p className="text-xs text-muted-foreground">ATS Score / 100</p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Button variant="outline" size="sm" onClick={() => window.open(`${FILE_BASE}/${app.resumeFile}`, "_blank")}>
                            <FileText className="w-4 h-4 mr-1" /> View Resume PDF
                        </Button>
                        {isPending && (
                            <Button size="sm" variant="outline" disabled={rescreening} onClick={handleRescreen}>
                                <RefreshCw className={`w-4 h-4 mr-1 ${rescreening ? "animate-spin" : ""}`} /> Run AI Screening
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* AI Recruiter Insights Panel */}
            {a.aiInsights && (
                <Card className="border-violet-500/30 bg-violet-500/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Brain className="w-5 h-5 text-violet-400" /> AI Recruiter Insights
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm leading-relaxed">{a.aiInsights}</p>
                    </CardContent>
                </Card>
            )}

            {a.summary && (
                <Card className="border-border/50">
                    <CardContent className="p-4">
                        <p className="text-sm font-medium mb-1">AI Summary</p>
                        <p className="text-sm text-muted-foreground">{a.summary}</p>
                    </CardContent>
                </Card>
            )}

            {!isPending && a.scoreBreakdown?.length > 0 && (
                <ScoreBreakdown items={a.scoreBreakdown} totalScore={a.score} />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-border/50">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-emerald-400">Matched Skills</CardTitle></CardHeader>
                    <CardContent className="flex flex-wrap gap-1">
                        {(a.detectedSkills || []).map((s: string, i: number) => (
                            <Badge key={i} className="text-xs bg-emerald-500/10 text-emerald-400">{s}</Badge>
                        ))}
                    </CardContent>
                </Card>
                <Card className="border-border/50">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-red-400">Missing Skills</CardTitle></CardHeader>
                    <CardContent className="flex flex-wrap gap-1">
                        {(a.missingSkills || []).map((s: string, i: number) => (
                            <Badge key={i} className="text-xs bg-red-500/10 text-red-400">{s}</Badge>
                        ))}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-border/50">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-emerald-400">Strengths</CardTitle></CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {(a.strengths || []).map((s: string, i: number) => (
                                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />{s}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
                <Card className="border-border/50">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-red-400">Weaknesses</CardTitle></CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {(a.weaknesses || []).map((w: string, i: number) => (
                                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                                    <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />{w}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-border/50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Zap className="w-4 h-4 text-blue-400" /> AI-Generated Interview Questions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ol className="space-y-2">
                        {(a.interviewQuestions || []).map((q: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground">{i + 1}. {q}</li>
                        ))}
                    </ol>
                </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
                <Button onClick={() => handleStatus("shortlisted")} className="bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle className="w-4 h-4 mr-1" /> Shortlist
                </Button>
                <Button onClick={() => handleStatus("interview")} variant="outline">
                    <Calendar className="w-4 h-4 mr-1" /> Schedule Interview
                </Button>
                <Button onClick={() => handleStatus("rejected")} variant="outline" className="text-red-400 border-red-500/30">
                    <XCircle className="w-4 h-4 mr-1" /> Reject
                </Button>
            </div>
        </div>
    );
}
