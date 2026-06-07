"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Briefcase, Plus, MapPin, Users, X, Brain, ChevronRight, CheckCircle, AlertCircle } from "lucide-react";

const departments = ['Engineering', 'HR', 'Marketing', 'Sales', 'Finance', 'Operations', 'Design', 'Product', 'Support', 'Legal'];

export default function RecruitmentPage() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [jobStats, setJobStats] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [formData, setFormData] = useState({
        title: "", description: "", department: "Engineering",
        skills: "", requirements: "", education: "",
        experienceMin: "", experienceMax: "",
        location: "Bangalore, India", type: "full_time",
    });

    useEffect(() => { fetchJobs(); }, []);

    const fetchJobs = async () => {
        try {
            const res = await api.get('/jobs');
            const list = res.data.data || [];
            setJobs(list);
            const statsEntries = await Promise.all(
                list.map(async (job: any) => {
                    try {
                        const s = await api.get('/resumes/stats', { params: { jobId: job._id } });
                        return [job._id, s.data.data] as const;
                    } catch {
                        return [job._id, null] as const;
                    }
                })
            );
            setJobStats(Object.fromEntries(statsEntries));
        } catch { setJobs([]); } finally { setLoading(false); }
    };

    const handleAddJob = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/jobs', {
                ...formData,
                status: 'open',
                skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
                requirements: formData.requirements.split(',').map(r => r.trim()).filter(Boolean),
                experience: {
                    min: Number(formData.experienceMin || 0),
                    max: Number(formData.experienceMax || 0),
                },
            });
            setShowAddModal(false);
            setFormData({
                title: "", description: "", department: "Engineering",
                skills: "", requirements: "", education: "",
                experienceMin: "", experienceMax: "",
                location: "Bangalore, India", type: "full_time",
            });
            fetchJobs();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Error creating job');
        }
    };

    const statusColors: Record<string, string> = {
        open: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        closed: "bg-red-500/20 text-red-400 border-red-500/30",
        on_hold: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Briefcase className="w-6 h-6 text-blue-400" /> AI Recruitment Hub
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Create jobs, publish to the career portal, and review AI-ranked candidates — screening runs automatically on every application.
                    </p>
                </div>
                <Button onClick={() => setShowAddModal(true)} className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white">
                    <Plus className="w-4 h-4 mr-2" /> Create Job
                </Button>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-blue-500/10 border border-violet-500/20">
                <p className="text-xs font-semibold text-violet-300 mb-3 flex items-center gap-2">
                    <Brain className="w-4 h-4" /> Unified AI Recruitment Pipeline
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {["HR Creates Job", "Published", "Candidate Applies", "Auto AI Screen", "Shortlist", "🎙 AI Interview", "Hire Decision"].map((step, i) => (
                        <span key={step} className="flex items-center gap-2">
                            {i > 0 && <ChevronRight className="w-3 h-3 opacity-40" />}
                            <span className={`px-2 py-1 rounded-md border border-border/50 ${step.startsWith("🎙") ? "bg-violet-500/20 text-violet-300 border-violet-500/30" : "bg-background/60"}`}>{step}</span>
                        </span>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />)}
                </div>
            ) : jobs.length === 0 ? (
                <Card className="border-border/50 border-dashed">
                    <CardContent className="py-16 text-center">
                        <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-1">No job openings yet</h3>
                        <p className="text-sm text-muted-foreground">Create your first job opening to start recruiting</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {jobs.map((job) => (
                        <Card key={job._id} className="border-border/50 hover:border-violet-500/30 transition-all group">
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <Badge className={`text-xs ${statusColors[job.status]}`}>{job.status}</Badge>
                                    <Badge variant="secondary" className="text-xs">{job.type?.replace('_', ' ')}</Badge>
                                </div>
                                <h3 className="text-lg font-semibold group-hover:text-violet-400 transition-colors">{job.title}</h3>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{job.description}</p>
                                <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{job.department}</span>
                                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                                </div>
                                {job.skills?.length > 0 && (
                                    <div className="flex gap-1 flex-wrap mt-3">
                                        {job.skills.slice(0, 4).map((skill: string, i: number) => (
                                            <Badge key={i} variant="outline" className="text-[10px] px-1.5">{skill}</Badge>
                                        ))}
                                    </div>
                                )}
                                {jobStats[job._id] && (
                                    <div className="grid grid-cols-2 gap-2 mt-3 text-[10px]">
                                        <span className="flex items-center gap-1 text-muted-foreground">
                                            <Users className="w-3 h-3" /> {jobStats[job._id].applicationsReceived} received
                                        </span>
                                        <span className="flex items-center gap-1 text-emerald-400">
                                            <CheckCircle className="w-3 h-3" /> {jobStats[job._id].aiShortlisted} AI shortlisted
                                        </span>
                                        <span className="flex items-center gap-1 text-amber-400">
                                            <AlertCircle className="w-3 h-3" /> {jobStats[job._id].needsReview} needs review
                                        </span>
                                        <span className="text-muted-foreground">{jobStats[job._id].pendingScreening || 0} pending AI</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/50">
                                    <span className="text-xs text-muted-foreground">{new Date(job.createdAt).toLocaleDateString()}</span>
                                    <span className="flex-1" />
                                    <Link href={`/dashboard/recruitment/${job._id}`} className="text-xs text-violet-400 hover:text-violet-300 font-medium">
                                        Open AI dashboard →
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add Job Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="fixed inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />
                    <div className="relative z-50 w-full max-w-lg mx-4 bg-popover rounded-xl p-6 shadow-xl border border-border max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Create Job Opening</h2>
                            <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-muted rounded-md"><X className="w-4 h-4" /></button>
                        </div>
                        <form onSubmit={handleAddJob} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label>Job Title</Label>
                                <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required placeholder="e.g. Senior Software Engineer" />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Description</Label>
                                <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required rows={3} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>Department</Label>
                                    <select value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-muted/50 border border-border text-sm">
                                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Type</Label>
                                    <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-muted/50 border border-border text-sm">
                                        <option value="full_time">Full Time</option>
                                        <option value="part_time">Part Time</option>
                                        <option value="contract">Contract</option>
                                        <option value="internship">Internship</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Required Skills (comma-separated)</Label>
                                <Input value={formData.skills} onChange={e => setFormData({ ...formData, skills: e.target.value })} placeholder="React, Node.js, Python" />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Requirements (comma-separated)</Label>
                                <Input value={formData.requirements} onChange={e => setFormData({ ...formData, requirements: e.target.value })} placeholder="2+ years, REST APIs" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>Experience (min years)</Label>
                                    <Input type="number" min="0" value={formData.experienceMin} onChange={e => setFormData({ ...formData, experienceMin: e.target.value })} placeholder="2" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Experience (max years)</Label>
                                    <Input type="number" min="0" value={formData.experienceMax} onChange={e => setFormData({ ...formData, experienceMax: e.target.value })} placeholder="5" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Education</Label>
                                <Input value={formData.education} onChange={e => setFormData({ ...formData, education: e.target.value })} placeholder="B.E / B.Tech" />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Location</Label>
                                <Input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                            </div>
                            <Button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-blue-600 text-white">Publish Job</Button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
