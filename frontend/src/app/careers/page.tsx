"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, MapPin } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function CareersPage() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const res = await fetch(`${API_BASE}/careers/jobs`);
                const data = await res.json();
                setJobs(data.data || []);
            } catch {
                setJobs([]);
            } finally {
                setLoading(false);
            }
        };
        fetchJobs();
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Open Positions</h1>
                <p className="text-muted-foreground mt-1 text-sm">Apply instantly — AI screening runs in the background.</p>
            </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : jobs.length === 0 ? (
                    <Card className="border-border/50 border-dashed">
                        <CardContent className="py-16 text-center">
                            <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-1">No open roles right now</h3>
                            <p className="text-sm text-muted-foreground">Please check back soon.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {jobs.map((job) => (
                            <Card key={job._id} className="border-border/50 hover:border-violet-500/30 transition-all">
                                <CardContent className="p-5 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <Badge className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">{job.status}</Badge>
                                        <Badge variant="secondary" className="text-xs">{job.type?.replace("_", " ")}</Badge>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold">{job.title}</h3>
                                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{job.description}</p>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{job.department}</span>
                                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                                    </div>
                                    <Link href={`/careers/${job._id}`} className="text-sm text-violet-400 hover:text-violet-300">
                                        View details →
                                    </Link>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

        </div>
    );
}
