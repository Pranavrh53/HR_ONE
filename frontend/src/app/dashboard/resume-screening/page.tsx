"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Brain, Upload, Briefcase, Star, CheckCircle, XCircle,
    ChevronDown, ChevronUp, FileText, Zap, Target, X
} from "lucide-react";
import ScoreBreakdown from "@/components/ScoreBreakdown";

interface Evaluation {
    candidate_name: string;
    score: number;
    match_percentage: number;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    skills_matched: string[];
    skills_missing: string[];
    years_of_experience: string;
    education: string;
    recommendation: string;
    interview_questions: string[];
    score_breakdown?: { category: string; score: number; max: number; note?: string }[];
    error?: string;
}

const recommendationConfig: Record<string, { color: string; icon: any; bg: string }> = {
    "Highly Recommended": { color: "text-emerald-400", icon: CheckCircle, bg: "bg-emerald-500/10 border-emerald-500/30" },
    "Recommended": { color: "text-blue-400", icon: CheckCircle, bg: "bg-blue-500/10 border-blue-500/30" },
    "Needs Review": { color: "text-amber-400", icon: Target, bg: "bg-amber-500/10 border-amber-500/30" },
    "Potential Match": { color: "text-amber-400", icon: Target, bg: "bg-amber-500/10 border-amber-500/30" },
    "Not Recommended": { color: "text-red-400", icon: XCircle, bg: "bg-red-500/10 border-red-500/30" },
};

function ScoreRing({ score }: { score: number }) {
    const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
    return (
        <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="absolute" width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle
                    cx="40" cy="40" r="34" fill="none"
                    stroke={color} strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(score / 100) * 213.6} 213.6`}
                    transform="rotate(-90 40 40)"
                    style={{ transition: "stroke-dasharray 1s ease" }}
                />
            </svg>
            <div className="text-center">
                <span className="text-xl font-bold" style={{ color }}>{score}</span>
                <p className="text-[9px] text-muted-foreground">/ 100</p>
            </div>
        </div>
    );
}

function CandidateCard({ result, rank }: { result: Evaluation; rank: number }) {
    const [expanded, setExpanded] = useState(false);
    const config = recommendationConfig[result.recommendation] || recommendationConfig["Potential Match"];
    const Icon = config.icon;

    return (
        <Card className={`border-border/50 transition-all ${rank === 1 ? "border-amber-500/40 shadow-lg shadow-amber-500/5" : ""}`}>
            <CardContent className="p-5">
                {/* Header Row */}
                <div className="flex items-start gap-4">
                    <div className="relative">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${rank === 1 ? "bg-amber-500 text-black" :
                            rank === 2 ? "bg-gray-400 text-black" :
                                rank === 3 ? "bg-amber-700 text-white" : "bg-muted text-muted-foreground"
                            }`}>#{rank}</div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-semibold">{result.candidate_name}</h3>
                            {rank === 1 && <Badge className="bg-amber-500/20 text-amber-400 text-[10px]">🏆 Top Candidate</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>🎓 {result.education || "N/A"}</span>
                            <span>⏱ {result.years_of_experience} exp</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{result.summary}</p>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                        <ScoreRing score={result.score} />
                        <Badge className={`text-[10px] ${config.bg} ${config.color} border flex items-center gap-1`}>
                            <Icon className="w-3 h-3" />
                            {result.recommendation}
                        </Badge>
                    </div>
                </div>

                {/* Skills Row */}
                <div className="mt-4 flex gap-4">
                    <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-400" /> Matched Skills
                        </p>
                        <div className="flex flex-wrap gap-1">
                            {result.skills_matched?.slice(0, 5).map((s, i) => (
                                <Badge key={i} className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">{s}</Badge>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-red-400" /> Missing Skills
                        </p>
                        <div className="flex flex-wrap gap-1">
                            {result.skills_missing?.slice(0, 3).map((s, i) => (
                                <Badge key={i} className="text-[10px] bg-red-500/10 text-red-400 border-red-500/20">{s}</Badge>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Expand Button */}
                <button
                    className="mt-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    onClick={() => setExpanded(!expanded)}
                >
                    {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {expanded ? "Less details" : "View full analysis + interview questions"}
                </button>

                {/* Expanded Content */}
                {expanded && (
                    <div className="mt-4 space-y-4 border-t border-border/50 pt-4">
                        {result.score_breakdown && result.score_breakdown.length > 0 && (
                            <ScoreBreakdown items={result.score_breakdown} totalScore={result.score} />
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-medium text-emerald-400 mb-2">✓ Strengths</p>
                                <ul className="space-y-1">
                                    {result.strengths?.map((s, i) => (
                                        <li key={i} className="text-xs text-muted-foreground flex gap-2">
                                            <span className="text-emerald-400 mt-0.5">•</span>{s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-red-400 mb-2">✗ Weaknesses</p>
                                <ul className="space-y-1">
                                    {result.weaknesses?.map((w, i) => (
                                        <li key={i} className="text-xs text-muted-foreground flex gap-2">
                                            <span className="text-red-400 mt-0.5">•</span>{w}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-medium text-blue-400 mb-2 flex items-center gap-1">
                                <Zap className="w-3 h-3" /> AI-Generated Interview Questions
                            </p>
                            <ol className="space-y-1.5">
                                {result.interview_questions?.map((q, i) => (
                                    <li key={i} className="text-xs text-muted-foreground flex gap-2">
                                        <span className="text-blue-400 font-medium shrink-0">{i + 1}.</span>{q}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function ResumeScreeningPage() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [selectedJob, setSelectedJob] = useState<any>(null);
    const [files, setFiles] = useState<File[]>([]);
    const [results, setResults] = useState<Evaluation[]>([]);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [step, setStep] = useState<"upload" | "results">("upload");

    useEffect(() => {
        api.get('/jobs').then(res => setJobs(res.data.data || []));
    }, []);

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const dropped = Array.from(e.dataTransfer.files).filter(f => f.type === "application/pdf");
        setFiles(prev => [...prev, ...dropped]);
    };

    const handleScreen = async () => {
        if (!selectedJob || files.length === 0) return;
        setLoading(true);
        setProgress(50); // Initial set to show it's working
        setResults([]);

        const formData = new FormData();
        files.forEach(file => formData.append("files", file));
        formData.append("job_title", selectedJob.title);
        formData.append("job_description", selectedJob.description || "");
        formData.append("required_skills", selectedJob.skills?.join(", ") || "");

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

            const res = await fetch(`${process.env.NEXT_PUBLIC_AI_URL || "http://localhost:8000"}/screen-multiple`, {
                method: "POST",
                body: formData,
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || "Bulk processing failed");
            }

            setResults(data.results || []);
            setStep("results");
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setLoading(false);
            setProgress(100);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Brain className="w-6 h-6 text-violet-400" />
                        Bulk Resume Import
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Optional utility for campus hiring, job fairs, or resume database imports — not the primary recruitment flow.
                    </p>
                    <p className="text-xs text-violet-400/80 mt-1">
                        Primary workflow: candidates apply via Career Portal → AI screens automatically → review in Recruitment dashboard.
                    </p>
                </div>
                {step === "results" && (
                    <Button variant="outline" size="sm" onClick={() => { setStep("upload"); setFiles([]); setResults([]); }}>
                        ← Screen More
                    </Button>
                )}
            </div>

            {step === "upload" ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Job Selection */}
                    <Card className="border-border/50">
                        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Briefcase className="w-4 h-4 text-blue-400" />Select Job Opening</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {jobs.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No job openings found. Create one first in Recruitment.</p>
                            ) : (
                                jobs.map(job => (
                                    <button
                                        key={job._id}
                                        onClick={() => setSelectedJob(job)}
                                        className={`w-full text-left p-3 rounded-lg border transition-all text-sm ${selectedJob?._id === job._id
                                            ? "border-violet-500/50 bg-violet-500/10"
                                            : "border-border/50 hover:border-border"
                                            }`}
                                    >
                                        <p className="font-medium">{job.title}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{job.department} · {job.type?.replace("_", " ")}</p>
                                        {job.skills?.length > 0 && (
                                            <div className="flex gap-1 mt-1.5 flex-wrap">
                                                {job.skills.slice(0, 3).map((s: string, i: number) => (
                                                    <Badge key={i} variant="secondary" className="text-[10px]">{s}</Badge>
                                                ))}
                                            </div>
                                        )}
                                    </button>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Right: Upload Zone */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Drop Zone */}
                        <div
                            onDragOver={e => e.preventDefault()}
                            onDrop={handleFileDrop}
                            className="border-2 border-dashed border-border/50 hover:border-violet-500/50 rounded-xl p-10 text-center transition-all cursor-pointer"
                            onClick={() => document.getElementById("file-input")?.click()}
                        >
                            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                            <p className="text-sm font-medium">Drag & drop PDF resumes here</p>
                            <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                            <input id="file-input" type="file" accept=".pdf" multiple hidden onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files || [])])} />
                        </div>

                        {/* File List */}
                        {files.length > 0 && (
                            <Card className="border-border/50">
                                <CardContent className="p-4 space-y-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-medium">{files.length} resume{files.length !== 1 ? "s" : ""} ready</p>
                                        <button className="text-xs text-muted-foreground hover:text-red-400" onClick={() => setFiles([])}>Clear all</button>
                                    </div>
                                    {files.map((f, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/30">
                                            <FileText className="w-4 h-4 text-violet-400 shrink-0" />
                                            <span className="flex-1 truncate">{f.name}</span>
                                            <span className="text-xs text-muted-foreground shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                                            <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}>
                                                <X className="w-3 h-3 text-muted-foreground hover:text-red-400" />
                                            </button>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {/* Screen Button */}
                        <Button
                            className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white h-12"
                            disabled={!selectedJob || files.length === 0 || loading}
                            onClick={handleScreen}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Analyzing {progress}%...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Brain className="w-4 h-4" />
                                    Screen {files.length > 0 ? `${files.length} Resume${files.length > 1 ? "s" : ""}` : "Resumes"} with AI
                                </span>
                            )}
                        </Button>

                        {!selectedJob && (
                            <p className="text-xs text-center text-amber-400">← Please select a job opening first</p>
                        )}
                    </div>
                </div>
            ) : (
                /* Results View */
                <div className="space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: "Total Screened", value: results.length, color: "text-foreground" },
                            { label: "Highly Recommended", value: results.filter(r => r.recommendation === "Highly Recommended").length, color: "text-emerald-400" },
                            { label: "Recommended", value: results.filter(r => r.recommendation === "Recommended").length, color: "text-blue-400" },
                            { label: "Avg Score", value: `${Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)}%`, color: "text-violet-400" },
                        ].map((stat, i) => (
                            <Card key={i} className="border-border/50">
                                <CardContent className="p-4 text-center">
                                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* AI Info Banner */}
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20 text-sm">
                        <Brain className="w-4 h-4 text-violet-400 shrink-0" />
                        <span className="text-violet-300">Ranked by ATS score (deterministic) · Job: <strong>{selectedJob?.title}</strong> · {results.length} candidates evaluated</span>
                    </div>

                    {/* Candidate Cards */}
                    <div className="space-y-3">
                        {results.map((result, i) => (
                            <CandidateCard key={i} result={result} rank={i + 1} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
