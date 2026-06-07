"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Mic, Loader2, AlertCircle } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const screeningLabel: Record<string, string> = {
    pending: "AI Screening Pending",
    in_progress: "AI Screening In Progress",
    completed: "AI Screening Completed",
    failed: "Screening Failed — HR will review",
};

const statusLabel: Record<string, string> = {
    applied: "Applied",
    pending: "Applied",
    screened: "AI Screened",
    shortlisted: "Shortlisted",
    interview: "Interview In Progress",
    interviewed: "Interview Completed",
    rejected: "Not Selected",
    selected: "Selected",
};

export default function ApplicationStatusPage() {
    const [email, setEmail] = useState("");
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const fetchStatus = async () => {
        if (!email) return;
        setLoading(true);
        setMessage("");
        try {
            const res = await fetch(`${API_BASE}/careers/applications?email=${encodeURIComponent(email)}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "No applications found");
            setApplications(data.data || []);
            if ((data.data || []).length === 0) setMessage("No applications found for this email.");
        } catch (error: any) {
            setApplications([]);
            setMessage(error.message || "No applications found");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Track Your Application</h1>
                <p className="text-muted-foreground mt-1 text-sm">Enter the email you used when applying.</p>
            </div>

            <Card className="border-border/50">
                <CardContent className="p-5 space-y-4">
                    <div className="space-y-1">
                        <Label>Email</Label>
                        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" onKeyDown={(e) => e.key === "Enter" && fetchStatus()} />
                    </div>
                    <Button onClick={fetchStatus} disabled={loading}>
                        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Checking...</> : "Check Status"}
                    </Button>
                    {message && <p className="text-sm text-muted-foreground">{message}</p>}
                </CardContent>
            </Card>

            {applications.map((app) => (
                <Card key={app._id} className="border-border/50">
                    <CardContent className="p-5 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold">{app.job?.title}</h2>
                                <p className="text-xs text-muted-foreground">Applied {new Date(app.createdAt).toLocaleDateString()}</p>
                            </div>
                            <Badge className="text-xs capitalize">{statusLabel[app.status] || app.status}</Badge>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                            {app.screeningStatus === "in_progress" && <Loader2 className="w-4 h-4 animate-spin text-amber-400" />}
                            {app.screeningStatus === "completed" && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                            {app.screeningStatus === "failed" && <AlertCircle className="w-4 h-4 text-red-400" />}
                            <span className="text-muted-foreground">{screeningLabel[app.screeningStatus] || "Processing"}</span>
                        </div>

                        {app.interviewReady && app.interviewUrl && (
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                                <p className="text-sm font-medium text-emerald-300">Congratulations! You have been shortlisted.</p>
                                <p className="text-xs text-muted-foreground">Your AI interview is ready. Complete it from your candidate portal.</p>
                                <Link href={app.interviewUrl}>
                                    <Button className="bg-gradient-to-r from-violet-600 to-blue-600 text-white gap-2">
                                        <Mic className="w-4 h-4" /> Start AI Interview
                                    </Button>
                                </Link>
                            </div>
                        )}

                        {app.interviewCompleted && (
                            <p className="text-xs text-violet-300">AI interview completed — HR is reviewing your results.</p>
                        )}

                        {app.status === "rejected" && (
                            <p className="text-sm text-red-400">Thank you for applying. This role was not a match at this time.</p>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
