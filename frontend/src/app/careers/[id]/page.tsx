"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Briefcase, MapPin, FileText } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const jobId = resolvedParams.id;
    const [job, setJob] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");
    const [submitted, setSubmitted] = useState(false);

    const [formData, setFormData] = useState({
        candidateName: "",
        candidateEmail: "",
        candidatePhone: "",
    });
    const [resumeFile, setResumeFile] = useState<File | null>(null);

    useEffect(() => {
        const fetchJob = async () => {
            try {
                const res = await fetch(`${API_BASE}/careers/jobs/${jobId}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Job not found");
                setJob(data.data);
            } catch {
                setJob(null);
            } finally {
                setLoading(false);
            }
        };
        fetchJob();
    }, [jobId]);

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resumeFile) {
            setMessage("Please upload a PDF resume.");
            return;
        }
        setSubmitting(true);
        setMessage("");
        setSubmitted(false);

        const body = new FormData();
        body.append("candidateName", formData.candidateName);
        body.append("candidateEmail", formData.candidateEmail);
        body.append("candidatePhone", formData.candidatePhone);
        body.append("resume", resumeFile);

        try {
            const res = await fetch(`${API_BASE}/careers/jobs/${jobId}/apply`, {
                method: "POST",
                body,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Application failed");
            setSubmitted(true);
            setMessage(data.message || "Application submitted successfully!");
            setFormData({ candidateName: "", candidateEmail: "", candidatePhone: "" });
            setResumeFile(null);
        } catch (error: any) {
            setMessage(error.message || "Application failed");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-background px-6 py-10">Loading...</div>;
    }

    if (!job) {
        return (
            <div className="min-h-screen bg-background px-6 py-10">
                <p className="text-sm text-muted-foreground">This job is no longer available.</p>
                <Button onClick={() => router.push("/careers")} className="mt-4">Back to careers</Button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="border-border/50 lg:col-span-2">
                    <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-2">
                            <Badge className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">{job.status}</Badge>
                            <Badge variant="secondary" className="text-xs">{job.type?.replace("_", " ")}</Badge>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">{job.title}</h1>
                            <p className="text-sm text-muted-foreground mt-1">{job.description}</p>
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{job.department}</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                            {(job.experience?.min || job.experience?.max) && (
                                <span>Experience: {job.experience?.min || 0}-{job.experience?.max || 0} yrs</span>
                            )}
                            {job.education && <span>Education: {job.education}</span>}
                        </div>
                        {job.skills?.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {job.skills.map((skill: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-[10px]">{skill}</Badge>
                                ))}
                            </div>
                        )}
                        {job.requirements?.length > 0 && (
                            <div>
                                <p className="text-sm font-medium">Requirements</p>
                                <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                                    {job.requirements.map((req: string, i: number) => (
                                        <li key={i}>{req}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-border/50">
                    <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-violet-400" />
                            <h2 className="text-lg font-semibold">Apply Now</h2>
                        </div>
                        {message && (
                            <div className={`text-sm rounded-lg p-3 border ${submitted ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-border text-muted-foreground"}`}>
                                {message}
                                {submitted && (
                                    <p className="mt-2 text-xs">
                                        <a href="/careers/status" className="text-violet-400 hover:underline">Track your application status →</a>
                                    </p>
                                )}
                            </div>
                        )}
                        <form onSubmit={handleApply} className="space-y-3">
                            <div className="space-y-1">
                                <Label>Name</Label>
                                <Input value={formData.candidateName} onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })} required />
                            </div>
                            <div className="space-y-1">
                                <Label>Email</Label>
                                <Input type="email" value={formData.candidateEmail} onChange={(e) => setFormData({ ...formData, candidateEmail: e.target.value })} required />
                            </div>
                            <div className="space-y-1">
                                <Label>Phone</Label>
                                <Input value={formData.candidatePhone} onChange={(e) => setFormData({ ...formData, candidatePhone: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <Label>Resume (PDF)</Label>
                                <Input type="file" accept="application/pdf" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} required />
                            </div>
                            <Button type="submit" className="w-full" disabled={submitting || submitted}>
                                {submitting ? "Submitting..." : submitted ? "Application Submitted" : "Submit Application"}
                            </Button>
                        </form>
                        <p className="text-xs text-muted-foreground">Our HR team will review your application and contact you with updates.</p>
                    </CardContent>
                </Card>
        </div>
    );
}
