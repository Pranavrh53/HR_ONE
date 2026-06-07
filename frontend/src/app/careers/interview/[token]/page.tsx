"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, CheckCircle, Brain, ArrowLeft } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function CandidateInterviewPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    const [info, setInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [started, setStarted] = useState(false);
    const [qIndex, setQIndex] = useState(0);
    const [answer, setAnswer] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [result, setResult] = useState<any>(null);

    useEffect(() => {
        fetch(`${API_BASE}/careers/interview/${token}`)
            .then((r) => r.json())
            .then((d) => { setInfo(d.data); if (d.data?.status === "completed") setDone(true); })
            .catch(() => setInfo(null))
            .finally(() => setLoading(false));
    }, [token]);

    const handleStart = async () => {
        const res = await fetch(`${API_BASE}/careers/interview/${token}/start`, { method: "POST" });
        const data = await res.json();
        if (data.success) {
            setInfo((prev: any) => ({ ...prev, questions: data.data.questions, status: "in_progress" }));
            setStarted(true);
        }
    };

    const handleSubmitAnswer = async () => {
        if (!answer.trim() || !info?.questions?.[qIndex]) return;
        setSubmitting(true);
        await fetch(`${API_BASE}/careers/interview/${token}/evaluate-answer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: info.questions[qIndex], answer, questionType: "technical" }),
        });
        setSubmitting(false);
        setAnswer("");
        if (qIndex + 1 >= info.questions.length) {
            const fin = await fetch(`${API_BASE}/careers/interview/${token}/finish`, { method: "POST" });
            const finData = await fin.json();
            setResult(finData.data);
            setDone(true);
        } else {
            setQIndex((i) => i + 1);
        }
    };

    if (loading) return <p className="text-muted-foreground">Loading interview...</p>;
    if (!info) return <p className="text-red-400">Interview not found.</p>;

    if (done) {
        return (
            <Card className="border-emerald-500/30 bg-emerald-500/5">
                <CardContent className="p-8 text-center space-y-4">
                    <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
                    <h1 className="text-2xl font-bold">Interview Complete!</h1>
                    <p className="text-muted-foreground">Thank you, {info.candidateName}. Our HR team will review your results.</p>
                    {result && (
                        <p className="text-sm text-violet-300">Combined score recorded. Recommendation: <strong>{result.recommendation}</strong></p>
                    )}
                    <Link href="/careers/status"><Button variant="outline">Track Application Status</Button></Link>
                </CardContent>
            </Card>
        );
    }

    if (!started) {
        return (
            <div className="space-y-6">
                <Link href="/careers/status" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4" /> Back to applications
                </Link>
                <Card className="border-violet-500/30 bg-violet-500/5">
                    <CardContent className="p-8 space-y-4">
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Shortlisted</Badge>
                        <h1 className="text-2xl font-bold">Congratulations, {info.candidateName}!</h1>
                        <p className="text-muted-foreground">
                            You have been shortlisted for <strong>{info.jobTitle}</strong>.
                            Your AI interview is ready — answer {info.questions?.length || 5} questions at your own pace.
                        </p>
                        <div className="flex items-center gap-2 text-sm text-violet-300">
                            <Brain className="w-4 h-4" /> Resume score: {info.resumeScore}/100
                        </div>
                        <Button onClick={handleStart} className="bg-gradient-to-r from-violet-600 to-blue-600 text-white gap-2">
                            <Mic className="w-4 h-4" /> Start AI Interview
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <Card className="border-border/50">
            <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Question {qIndex + 1} of {info.questions?.length}</p>
                    <Badge variant="outline">{info.jobTitle}</Badge>
                </div>
                <p className="text-lg font-medium">{info.questions[qIndex]}</p>
                <textarea
                    className="w-full min-h-[120px] p-3 rounded-lg bg-muted/30 border border-border text-sm"
                    placeholder="Type your answer here..."
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                />
                <Button onClick={handleSubmitAnswer} disabled={submitting || !answer.trim()} className="w-full">
                    {submitting ? "Submitting..." : qIndex + 1 >= info.questions.length ? "Finish Interview" : "Next Question"}
                </Button>
            </CardContent>
        </Card>
    );
}
