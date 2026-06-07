"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { Briefcase, Search, MapPin, Clock, ChevronRight, Sparkles } from "lucide-react";

export default function PortalJobsPage() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        api.get("/careers/jobs").then(r => setJobs(r.data.data || [])).catch(console.error).finally(() => setLoading(false));
    }, []);

    const filtered = jobs.filter(j =>
        j.title?.toLowerCase().includes(search.toLowerCase()) ||
        j.department?.toLowerCase().includes(search.toLowerCase()) ||
        j.location?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Briefcase className="w-6 h-6 text-violet-400" /> Open Positions
                </h1>
                <p className="text-muted-foreground text-sm mt-1">Apply to jobs — AI will screen your resume automatically.</p>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text" placeholder="Search by title, department, or location..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full h-11 pl-9 pr-4 rounded-xl bg-card border border-border/60 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
            </div>

            {loading ? (
                <div className="space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted/30 rounded-2xl animate-pulse" />)}</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No open positions found</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(job => (
                        <Link key={job._id} href={`/careers/${job._id}`}>
                            <div className="flex items-center gap-4 p-4 rounded-2xl border border-border/50 bg-card hover:border-violet-500/40 hover:bg-violet-500/5 transition-all cursor-pointer group">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/20 flex items-center justify-center shrink-0">
                                    <Briefcase className="w-5 h-5 text-violet-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold group-hover:text-violet-300 transition-colors">{job.title}</p>
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                        <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{job.department}</span>
                                        {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
                                        {job.employmentType && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{job.employmentType}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="hidden sm:flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                        <Sparkles className="w-3 h-3" /> AI Screened
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-violet-400 transition-colors" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
