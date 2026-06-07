"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Download, Calendar, ArrowRight, FileText } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function PayrollPage() {
    const { user } = useAuth();
    const [payrolls, setPayrolls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const isAdmin = user?.role === 'admin' || user?.role === 'hr';

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await api.get(isAdmin ? '/payroll/stats' : '/payroll/my');
                setPayrolls(res.data.data || []);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [isAdmin]);

    const handleGenerate = async () => {
        try {
            await api.post('/payroll/generate', { month: new Date().getMonth() + 1, year: new Date().getFullYear() });
            const res = await api.get('/payroll/stats');
            setPayrolls(res.data.data || []);
            alert("Payroll generated successfully for the current month!");
        } catch (error) {
            alert("Failed to generate payroll.");
        }
    };

    if (loading) return <div className="p-8 text-center animate-pulse">Loading Payroll...</div>;

    if (isAdmin) {
        return (
            <div className="space-y-6">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <DollarSign className="w-6 h-6 text-emerald-400" /> Payroll Management
                        </h1>
                        <p className="text-muted-foreground text-sm">Monitor company-wide salary disbursement</p>
                    </div>
                    <Button onClick={handleGenerate} className="bg-emerald-600 hover:bg-emerald-700">
                        Generate Monthly Payroll
                    </Button>
                </header>

                <div className="grid gap-4">
                    {payrolls.map((p, idx) => (
                        <Card key={idx} className="border-border/50">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="font-bold">Month {p._id.month}, {p._id.year}</p>
                                        <p className="text-xs text-muted-foreground">{p.count} Employees processed</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-emerald-400">${p.totalPayroll.toLocaleString()}</p>
                                    <p className="text-xs text-muted-foreground">Avg: ${Math.round(p.avgSalary).toLocaleString()}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {payrolls.length === 0 && <p className="text-center py-12 text-muted-foreground">No payroll records found. Generate now!</p>}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <FileText className="w-6 h-6 text-violet-400" /> My Payslips
                </h1>
                <p className="text-muted-foreground text-sm">View and download your monthly compensation details</p>
            </header>

            <div className="grid gap-4">
                {payrolls.map((p) => (
                    <Card key={p._id} className="border-border/50 hover:border-violet-500/30 transition-all">
                        <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                                    <Calendar className="w-6 h-6 text-violet-400" />
                                </div>
                                <div>
                                    <p className="font-bold text-lg">Payslip: Month {p.month}, {p.year}</p>
                                    <p className="text-xs text-muted-foreground">Net Pay: ${p.netSalary.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">PAID</Badge>
                                <Button size="sm" variant="secondary" className="gap-2">
                                    <Download className="w-4 h-4" /> Download PDF
                                </Button>
                                <Button size="sm" variant="ghost" className="gap-2">
                                    View Details <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {payrolls.length === 0 && (
                    <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl">
                        <DollarSign className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="text-lg font-medium">No payslips available</h3>
                        <p className="text-muted-foreground text-sm">Your payroll information will appear here once processed by HR.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
