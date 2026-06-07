"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Briefcase, Clock, FileText, CheckCircle2,
    XCircle, Send, LogOut, User, LayoutDashboard,
    Bell, Info
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function CandidatePortalPage() {
    const { user, logout, loading: authLoading } = useAuth();
    const router = useRouter();
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.push('/login');
            } else if (user.role !== 'candidate') {
                router.push('/dashboard');
            }
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        const fetchApps = async () => {
            try {
                const res = await api.get('/hiring/my-applications');
                setApplications(res.data.data || []);
            } catch (err) {
                console.error("Failed to fetch applications", err);
            } finally {
                setLoading(false);
            }
        };
        fetchApps();
    }, []);

    const handleOfferResponse = async (offerId: string, response: 'accepted' | 'declined') => {
        try {
            await api.post(`/hiring/offers/${offerId}/respond`, { response });
            // Refresh list
            const res = await api.get('/hiring/my-applications');
            setApplications(res.data.data || []);

            if (response === 'accepted') {
                alert("Congratulations! You have accepted the offer. Your account is being converted to an employee account. Please log in again to access the Employee Dashboard.");
                logout();
                router.push('/login');
            }
        } catch (err) {
            console.error("Failed to respond to offer", err);
            alert("Failed to process offer response. Please try again or contact HR.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-slate-900/10 border-t-slate-900 rounded-full animate-spin" />
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Loading Portal...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
            {/* Top Navigation */}
            <nav className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-white flex items-center justify-center">
                        <LayoutDashboard className="w-5 h-5 text-white dark:text-slate-900" />
                    </div>
                    <span className="font-bold tracking-tight">TalentSphere <span className="text-slate-400 font-medium">Candidate Portal</span></span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <User className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-bold">{user?.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => logout()} className="text-slate-500 hover:text-red-500">
                        <LogOut className="w-4 h-4 mr-2" /> Sign Out
                    </Button>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto p-6 space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.name?.split(' ')[0]}</h1>
                        <p className="text-slate-500 mt-2">Track your job applications and manage your profile.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800" />
                            ))}
                        </div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Candidate Profile Active</p>
                    </div>
                </div>

                {/* Application Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { label: 'Active Applications', value: applications.length, icon: Briefcase, color: 'text-blue-500' },
                        { label: 'Pending Review', value: applications.filter(a => a.status === 'awaiting_hr_review').length, icon: Clock, color: 'text-amber-500' },
                        { label: 'Hiring Decisions', value: applications.filter(a => ['selected', 'offer_generated'].includes(a.status)).length, icon: CheckCircle2, color: 'text-emerald-500' },
                    ].map(stat => (
                        <Card key={stat.label} className="border-slate-200 dark:border-slate-800 shadow-sm">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className={`p-3 rounded-xl bg-slate-100 dark:bg-slate-900 ${stat.color}`}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{stat.value}</p>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Applications List */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Bell className="w-5 h-5 text-slate-400" />
                        Latest Updates
                    </h2>

                    {applications.length === 0 ? (
                        <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800">
                            <CardContent className="p-12 flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center mb-4">
                                    <Briefcase className="w-8 h-8 text-slate-300" />
                                </div>
                                <h3 className="text-lg font-bold">No active applications</h3>
                                <p className="text-sm text-slate-500 max-w-sm mt-2">You haven't applied to any roles yet. Check out our open positions to get started.</p>
                                <Button className="mt-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold">Browse Careers</Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {applications.map((app) => (
                                <Card key={app._id} className="border-slate-200 dark:border-slate-800 hover:border-slate-300 transition-all shadow-sm overflow-hidden">
                                    <CardContent className="p-0">
                                        <div className="flex flex-col md:flex-row">
                                            <div className="flex-1 p-6 space-y-4">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <h3 className="text-lg font-bold uppercase tracking-tight">{app.job?.title || 'Applied Position'}</h3>
                                                        <p className="text-sm text-slate-500 font-medium">{app.job?.department} · {app.job?.location || 'Remote'}</p>
                                                    </div>
                                                    <Badge className={`
                                                        px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border
                                                        ${app.status === 'offer_generated' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                            app.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' :
                                                                'bg-slate-100 text-slate-600 border-slate-200'}
                                                    `}>
                                                        {app.statusLabel || app.status?.replaceAll('_', ' ')}
                                                    </Badge>
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Application Date</p>
                                                        <p className="text-xs font-semibold">{new Date(app.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Interview Score</p>
                                                        <p className="text-xs font-semibold">{app.interviewScore || '—'}/100</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Resume Rank</p>
                                                        <p className="text-xs font-semibold">{app.aiRank || '—'}</p>
                                                    </div>
                                                </div>

                                                {app.status === 'offer_generated' && (
                                                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                                                                <CheckCircle2 className="w-6 h-6" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-emerald-900 dark:text-emerald-400">Action Required: Review Your Offer</p>
                                                                <p className="text-xs text-emerald-700/70 dark:text-emerald-500/70">Congratulations! An official offer has been extended to you.</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap gap-3">
                                                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={() => handleOfferResponse(app.offerLetter?._id || app.offerLetter, 'accepted')}>
                                                                Accept Offer Letter
                                                            </Button>
                                                            <Button size="sm" variant="outline" className="border-emerald-600/30 text-emerald-600 hover:bg-emerald-50 font-bold" onClick={() => handleOfferResponse(app.offerLetter?._id || app.offerLetter, 'declined')}>
                                                                Decline
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Status Steps */}
                                            <div className="w-full md:w-64 bg-slate-50 dark:bg-slate-900/50 border-l border-slate-200 dark:border-slate-800 p-6">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Stage Tracker</p>
                                                <div className="space-y-6">
                                                    {[
                                                        { label: 'Applied', done: true },
                                                        { label: 'AI Review', done: !!app.resumeScore },
                                                        { label: 'Interview', done: !!app.interviewScore },
                                                        { label: 'Offer', done: app.status === 'offer_generated' || app.status === 'offer_accepted' },
                                                    ].map((step, idx) => (
                                                        <div key={idx} className="flex gap-4 relative">
                                                            {idx < 3 && <div className={`absolute left-[7px] top-4 w-[1px] h-8 bg-slate-200 dark:bg-slate-800 ${step.done ? 'bg-slate-400' : ''}`} />}
                                                            <div className={`w-4 h-4 rounded-full border-2 transition-all shrink-0 mt-1 ${step.done ? 'bg-slate-900 border-slate-900' : 'border-slate-200 bg-white'}`}>
                                                                {step.done && <CheckCircle2 className="w-3 h-3 text-white m-[1px]" />}
                                                            </div>
                                                            <p className={`text-xs font-bold uppercase tracking-tight ${step.done ? 'text-slate-900 dark:text-white' : 'text-slate-300'}`}>{step.label}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-4">
                    <Info className="w-5 h-5 text-slate-400 shrink-0" />
                    <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">Need Assistance?</p>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Questions regarding your application? Contact our talent acquisition team at <span className="font-bold underline">careers@talentsphere.com</span>.
                            If you've accepted an offer, your portal will automatically transition to the Employee Dashboard upon next login.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
