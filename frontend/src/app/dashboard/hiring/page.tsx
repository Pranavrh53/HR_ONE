"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Award, Clock, TrendingUp, Users, FileText, Send, XCircle, Layers3 } from "lucide-react";
import Link from "next/link";

const statusColors: Record<string, string> = {
    awaiting_hr_review: "bg-sky-500/10 text-sky-400 border-sky-500/30",
    top_candidate: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    recommended: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    needs_hr_review: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    not_recommended: "bg-red-500/10 text-red-400 border-red-500/30",
    selected: "bg-violet-500/10 text-violet-400 border-violet-500/30",
    rejected: "bg-red-500/10 text-red-400 border-red-500/30",
    offer_generated: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    offer_accepted: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    offer_declined: "bg-red-500/10 text-red-400 border-red-500/30",
    onboarding_started: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    employee_created: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
};

export default function HiringDashboardPage() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [selectedJobId, setSelectedJobId] = useState<string>("");
    const [decisions, setDecisions] = useState<any[]>([]);
    const [ranking, setRanking] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                const jobsRes = await api.get('/jobs');
                const list = jobsRes.data.data || [];
                setJobs(list);
                const firstJob = list[0]?._id || '';
                setSelectedJobId(firstJob);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    useEffect(() => {
        if (!selectedJobId) return;
        const load = async () => {
            const [decisionRes, rankingRes] = await Promise.all([
                api.get('/hiring/decisions', { params: { jobId: selectedJobId } }),
                api.get(`/hiring/rankings/${selectedJobId}`).catch(() => ({ data: { data: null } })),
            ]);
            setDecisions(decisionRes.data.data || []);
            setRanking(rankingRes.data.data || null);
        };
        load().catch(console.error);
    }, [selectedJobId]);

    const selectedJob = useMemo(() => jobs.find(job => job._id === selectedJobId), [jobs, selectedJobId]);

    const summaryCards = [
        { label: 'Priority Review', value: decisions.filter(d => d.classification === 'Top Candidate').length, icon: Award },
        { label: 'Pending HR Review', value: decisions.filter(d => d.status === 'awaiting_hr_review').length, icon: Clock },
        { label: 'Offers Issued', value: decisions.filter(d => d.status === 'offer_generated' || d.status === 'selected').length, icon: Send },
        { label: 'Joining Soon', value: decisions.filter(d => d.status === 'onboarding_started').length, icon: Layers3 },
    ];

    const handleOffer = async (decisionId: string) => {
        setBusyId(decisionId);
        try {
            await api.post(`/hiring/decisions/${decisionId}/offer`, {
                salary: selectedJob?.salaryRange?.max || selectedJob?.salaryRange?.min || 0,
                joiningDate: new Date().toISOString(),
                reportingManager: 'HR Manager',
                companyDetails: `${selectedJob?.department || 'HR'} hiring pipeline`,
            });
            const res = await api.get('/hiring/decisions', { params: { jobId: selectedJobId } });
            setDecisions(res.data.data || []);
        } finally {
            setBusyId(null);
        }
    };

    const handleReject = async (decisionId: string) => {
        setBusyId(decisionId);
        try {
            await api.post(`/hiring/decisions/${decisionId}/reject`, { notes: 'Rejected by HR review' });
            const res = await api.get('/hiring/decisions', { params: { jobId: selectedJobId } });
            setDecisions(res.data.data || []);
        } finally {
            setBusyId(null);
        }
    };

    if (loading) {
        return <div className="h-48 rounded-2xl bg-muted/30 animate-pulse" />;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Briefcase className="w-6 h-6 text-violet-400" /> Hiring Decisions
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">Review ranked candidates, generate offer letters, and move accepted offers into onboarding.</p>
                </div>
                <div className="w-full sm:w-72">
                    <select
                        value={selectedJobId}
                        onChange={(e) => setSelectedJobId(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-card border border-border text-sm"
                    >
                        {jobs.map(job => <option key={job._id} value={job._id}>{job.title}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {summaryCards.map((card) => (
                    <Card key={card.label} className="border-border/50">
                        <CardContent className="p-4">
                            <card.icon className="w-4 h-4 text-violet-400 mb-2" />
                            <p className="text-2xl font-bold">{card.value}</p>
                            <p className="text-xs text-muted-foreground">{card.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {ranking && (
                <Card className="border-border/50">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" />Candidate Ranking</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {ranking.rankings?.slice(0, 6).map((item: any) => (
                            <div key={item.decision} className="p-4 rounded-xl border border-border/40 bg-muted/20">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold">#{item.rank} {item.candidateName}</p>
                                        <p className="text-xs text-muted-foreground">{item.classification}</p>
                                    </div>
                                    <Badge className={`text-xs border ${statusColors[item.classification?.toLowerCase?.().replaceAll(' ', '_')] || 'bg-muted/30'}`}>
                                        {item.finalScore}/100
                                    </Badge>
                                </div>
                                <div className="mt-3 text-xs text-muted-foreground space-y-1">
                                    <p>Resume: {item.resumeScore}</p>
                                    <p>Interview: {item.interviewScore}</p>
                                    <p>Technical: {item.technicalScore}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <div className="space-y-4">
                {decisions.map((decision) => {
                    const statusClass = statusColors[decision.status] || 'bg-muted/30 text-muted-foreground border-border/40';
                    return (
                        <Card key={decision._id} className="border-border/50">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-lg font-bold">{decision.candidateName}</p>
                                        <p className="text-sm text-muted-foreground">{decision.job?.title} · {decision.job?.department}</p>
                                    </div>
                                    <Badge className={`text-xs border ${statusClass}`}>{decision.statusLabel || decision.status}</Badge>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
                                    <div className="p-3 rounded-xl bg-muted/20 border border-border/30"><p className="text-xs text-muted-foreground">Resume</p><p className="font-semibold">{decision.resumeScore}</p></div>
                                    <div className="p-3 rounded-xl bg-muted/20 border border-border/30"><p className="text-xs text-muted-foreground">Interview</p><p className="font-semibold">{decision.interviewScore}</p></div>
                                    <div className="p-3 rounded-xl bg-muted/20 border border-border/30"><p className="text-xs text-muted-foreground">Final</p><p className="font-semibold">{decision.finalScore}</p></div>
                                    <div className="p-3 rounded-xl bg-muted/20 border border-border/30"><p className="text-xs text-muted-foreground">Recommendation</p><p className="font-semibold">{decision.classification}</p></div>
                                    <div className="p-3 rounded-xl bg-muted/20 border border-border/30"><p className="text-xs text-muted-foreground">Rank</p><p className="font-semibold">{decision.rank || '—'}</p></div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {decision.interviewSession?._id && (
                                        <Link href={`/dashboard/interview/report/${decision.interviewSession._id}`} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 text-sm hover:bg-muted/40 transition-colors">
                                            <FileText className="w-4 h-4" /> View Interview Report
                                        </Link>
                                    )}
                                    <Button size="sm" onClick={() => handleOffer(decision._id)} disabled={busyId === decision._id || decision.status === 'rejected'} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                        <Send className="w-4 h-4 mr-2" /> Generate Offer Letter
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => handleReject(decision._id)} disabled={busyId === decision._id || decision.status === 'rejected'} className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                                        <XCircle className="w-4 h-4 mr-2" /> Reject Candidate
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}