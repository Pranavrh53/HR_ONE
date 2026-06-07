"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    BarChart3, TrendingUp, Users, UserMinus,
    DollarSign, Briefcase, PieChart, Info
} from "lucide-react";

interface AnalyticsData {
    totalEmployees: number;
    departmentStats: { _id: string; count: number }[];
    recentHires: any[];
    attritionRisk?: { low: number; medium: number; high: number };
    turnoverRate?: string;
}

export default function AnalyticsPage() {
    const { user } = useAuth();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/employees/stats');
                setData(res.data.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="p-8 text-center animate-pulse">Loading Analytics...</div>;

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-slate-500" />
                        Executive Analytics
                    </h1>
                    <p className="text-muted-foreground mt-1">Enterprise-wide workforce intelligence and organizational health</p>
                </div>
            </header>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="Total Headcount" value={data?.totalEmployees || 0} icon={Users} color="text-slate-500" subtitle="Active Personnel" />
                <MetricCard title="Hiring Velocity" value="+4" icon={TrendingUp} color="text-slate-500" subtitle="Last 30 Days" />
                <MetricCard title="Turnover Rate" value={data?.turnoverRate || "1.2%"} icon={UserMinus} color="text-slate-500" subtitle="Company Average" />
                <MetricCard title="Avg. Tenure" value="2.4y" icon={Briefcase} color="text-slate-500" subtitle="Retention Index" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Departmental Analysis */}
                <Card className="border-border">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                            <PieChart className="w-5 h-5 text-slate-500" />
                            Workforce Distribution
                        </CardTitle>
                        <CardDescription>Headcount breakdown by department</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            {data?.departmentStats.map((dept) => (
                                <div key={dept._id} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{dept._id}</span>
                                        <span className="text-muted-foreground">{dept.count} Members ({Math.round((dept.count / (data?.totalEmployees || 1)) * 100)}%)</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-slate-600 dark:bg-slate-400 rounded-full"
                                            style={{ width: `${(dept.count / (data?.totalEmployees || 1)) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Attrition Risk Analysis */}
                <Card className="border-border">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                            <TrendingUp className="w-5 h-5 text-slate-500" />
                            Retention Risk Analysis
                        </CardTitle>
                        <CardDescription>Predictive turnover risk based on engagement metrics</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Critical Risk</span>
                                <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50">{data?.attritionRisk?.high || 0} employees</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Moderate Risk</span>
                                <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">{data?.attritionRisk?.medium || 0} employees</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Stable</span>
                                <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">{data?.attritionRisk?.low || 0} employees</Badge>
                            </div>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-border text-[10px] text-muted-foreground mt-4">
                            Note: Analysis is based on attendance patterns, engagement metrics, and recent leave frequencies.
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Payroll Statistics Placeholder */}
            <Card className="border-border/50">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-400" />
                        Finanical Overview (Payroll)
                    </CardTitle>
                    <CardDescription>Monthly disbursement and budget utilization</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-4 rounded-xl border border-border/50 bg-card">
                            <p className="text-xs text-muted-foreground uppercase mb-1">Total Payload (Jun 2026)</p>
                            <p className="text-2xl font-bold">$184,200</p>
                            <p className="text-xs text-emerald-400 mt-1">+2.4% vs last month</p>
                        </div>
                        <div className="p-4 rounded-xl border border-border/50 bg-card">
                            <p className="text-xs text-muted-foreground uppercase mb-1">Avg Salary</p>
                            <p className="text-2xl font-bold">$6,140</p>
                            <p className="text-xs text-muted-foreground mt-1">Market standard: $5,800</p>
                        </div>
                        <div className="p-4 rounded-xl border border-border/50 bg-card">
                            <p className="text-xs text-muted-foreground uppercase mb-1">Tax Disbursement</p>
                            <p className="text-2xl font-bold">$18,420</p>
                            <Badge variant="outline" className="mt-1">Generated</Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function MetricCard({ title, value, icon: Icon, color, subtitle }: any) {
    return (
        <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">{title}</p>
                    <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <h3 className="text-2xl font-bold">{value}</h3>
                <p className="text-[10px] text-muted-foreground mt-1">{subtitle}</p>
            </CardContent>
        </Card>
    );
}
