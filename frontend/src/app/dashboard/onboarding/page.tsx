"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle2, Circle, Clock, Rocket,
    ShieldCheck, UserPlus, Info,
    FileCheck, Gift
} from "lucide-react";

export default function OnboardingPage() {
    const { user } = useAuth();
    const [onboarding, setOnboarding] = useState<any>(null);
    const [allOnboardings, setAllOnboardings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const isHr = user?.role === 'admin' || user?.role === 'hr';

    useEffect(() => {
        const fetch = async () => {
            try {
                if (isHr) {
                    const res = await api.get('/hiring/onboardings');
                    setAllOnboardings(res.data.data || []);
                } else {
                    const res = await api.get('/hiring/my-offers');
                    if (res.data.onboarding && res.data.onboarding.length > 0) {
                        setOnboarding(res.data.onboarding[0]);
                    }
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [isHr]);

    if (loading) return <div className="p-8 text-center animate-pulse">Initializing Onboarding Portal...</div>;

    if (isHr) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Onboarding Management</h1>
                    <p className="text-muted-foreground">Monitor and complete onboarding for new hires.</p>
                </div>

                <div className="grid gap-4">
                    {allOnboardings.length === 0 ? (
                        <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center">
                            <Rocket className="w-12 h-12 text-muted-foreground/30 mb-4" />
                            <p className="font-medium text-slate-500">No active onboardings found.</p>
                        </Card>
                    ) : (
                        allOnboardings.map((ob) => (
                            <Card key={ob._id} className="hover:border-slate-400 transition-all cursor-default">
                                <CardContent className="p-5 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-900 font-bold">
                                            {ob.candidateName?.split(' ').map((n: any) => n[0]).join('')}
                                        </div>
                                        <div>
                                            <p className="font-bold">{ob.candidateName}</p>
                                            <p className="text-xs text-muted-foreground">{ob.candidateEmail} · {ob.employee?.designation || 'New Hire'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Status</p>
                                            <Badge variant={ob.status === 'completed' ? 'default' : 'secondary'} className="mt-1">
                                                {ob.status?.toUpperCase() || 'PENDING'}
                                            </Badge>
                                        </div>
                                        <Button size="sm" variant="outline" onClick={() => {
                                            // Handle view details or complete
                                        }}>
                                            Review Profile
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        );
    }

    if (!onboarding) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <Rocket className="w-8 h-8 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-bold">No active onboarding</h2>
                <p className="text-muted-foreground max-w-xs">You'll see your onboarding tracker here once you accept an offer letter.</p>
            </div>
        );
    }

    const completedTasks = onboarding.tasks?.filter((t: any) => t.status === 'completed').length || 0;
    const totalTasks = onboarding.tasks?.length || 0;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return (
        <div className="space-y-8 max-w-5xl mx-auto font-sans">
            {/* Header / Welcome Kit */}
            <div className="rounded-2xl bg-slate-900 dark:bg-slate-50 border border-border p-8 md:p-12">
                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                    <div className="flex-1 space-y-4">
                        <Badge variant="outline" className="text-slate-400 border-slate-700 px-3 py-1 uppercase tracking-widest text-[10px]">Employee Onboarding</Badge>
                        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white dark:text-slate-900">
                            {onboarding.welcomeKit?.message || `Welcome to the team, ${onboarding.candidateName}!`}
                        </h1>
                        <p className="text-lg text-slate-400 dark:text-slate-600 leading-relaxed max-w-2xl">
                            {onboarding.welcomeKit?.teamIntroduction || 'We are excited to have you join our journey.'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Task Tracker */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            Joining Progress
                        </h2>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Status: {onboarding.status?.replace('_', ' ')}
                        </Badge>
                    </div>

                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-slate-900 dark:bg-white transition-all duration-1000"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    <div className="grid gap-3">
                        {onboarding.tasks?.map((task: any, idx: number) => (
                            <Card key={idx} className="border-border shadow-none">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        {task.status === 'completed' ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                        ) : (
                                            <Circle className="w-5 h-5 text-slate-300" />
                                        )}
                                        <span className={task.status === 'completed' ? 'text-slate-400' : 'font-medium text-slate-700 dark:text-slate-200'}>
                                            {task.title}
                                        </span>
                                    </div>
                                    {task.status !== 'completed' && (
                                        <Button size="sm" variant="outline" className="h-8 text-xs">
                                            Start Task
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Useful Info / Welcome Kit Details */}
                <div className="space-y-6">
                    <Card className="border-border/50">
                        <CardHeader className="pb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Gift className="w-4 h-4 text-violet-400" /> First Week Checklist
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {onboarding.welcomeKit?.firstWeekChecklist?.map((item: string, idx: number) => (
                                <div key={idx} className="flex items-start gap-3 text-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                                    <span>{item}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="border-border/50 bg-blue-500/5">
                        <CardHeader className="pb-3 text-sm font-bold uppercase tracking-widest text-blue-400">
                            <div className="flex items-center gap-2">
                                <Info className="w-4 h-4" /> Dept Overview
                            </div>
                        </CardHeader>
                        <CardContent className="text-sm text-slate-300 leading-relaxed">
                            {onboarding.welcomeKit?.departmentOverview}
                        </CardContent>
                    </Card>

                    <Card className="border-border/50 border-emerald-500/20 bg-emerald-500/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2 text-emerald-400">
                                <ShieldCheck className="w-4 h-4" /> Verification Required
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs space-y-2 text-muted-foreground">
                            <p>To finalize your activation, please submit photocopies of:</p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>Aadhaar Card / PAN Card</li>
                                <li>Highest degree certificate</li>
                                <li>Previous 3 months payslips</li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
