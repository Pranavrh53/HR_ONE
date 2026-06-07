"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { CalendarDays, Plus, Check, X } from "lucide-react";

export default function LeavesPage() {
    const { user } = useAuth();
    const [leaves, setLeaves] = useState<any[]>([]);
    const [myLeaves, setMyLeaves] = useState<any[]>([]);
    const [leaveBalance, setLeaveBalance] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [formData, setFormData] = useState({
        leaveType: "casual", startDate: "", endDate: "", reason: "",
    });

    const isManager = user?.role === 'admin' || user?.role === 'hr' || user?.role === 'senior_manager';

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            if (isManager) {
                const res = await api.get('/leaves', { params: { limit: 50 } });
                setLeaves(res.data.data);
            }
            try {
                const myRes = await api.get('/leaves/my');
                setMyLeaves(myRes.data.data);
                setLeaveBalance(myRes.data.leaveBalance);
            } catch { }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/leaves', formData);
            setShowApplyModal(false);
            setFormData({ leaveType: "casual", startDate: "", endDate: "", reason: "" });
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Error applying for leave');
        }
    };

    const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
        try {
            await api.put(`/leaves/${id}`, { status });
            fetchData();
        } catch (err) { console.error(err); }
    };

    const statusColors: Record<string, string> = {
        pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        rejected: "bg-red-500/20 text-red-400 border-red-500/30",
    };

    const leaveTypeColors: Record<string, string> = {
        casual: "bg-blue-500/20 text-blue-400",
        sick: "bg-red-500/20 text-red-400",
        earned: "bg-violet-500/20 text-violet-400",
        maternity: "bg-pink-500/20 text-pink-400",
        paternity: "bg-cyan-500/20 text-cyan-400",
        unpaid: "bg-gray-500/20 text-gray-400",
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <CalendarDays className="w-6 h-6 text-amber-400" />
                        Leave Management
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {isManager ? "Manage team leave requests" : "Apply and track your leaves"}
                    </p>
                </div>
                {user?.role === 'employee' && (
                    <Button onClick={() => setShowApplyModal(true)} className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white">
                        <Plus className="w-4 h-4 mr-2" /> Apply Leave
                    </Button>
                )}
            </div>

            {/* Leave Balance */}
            {leaveBalance && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {Object.entries(leaveBalance).map(([type, balance]: [string, any]) => (
                        <Card key={type} className="border-border/50">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground capitalize">{type} Leave</p>
                                        <p className="text-2xl font-bold mt-1">{balance.remaining} <span className="text-sm text-muted-foreground font-normal">/ {balance.total}</span></p>
                                    </div>
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{
                                        background: `conic-gradient(#8b5cf6 ${(balance.used / balance.total) * 360}deg, rgba(255,255,255,0.1) 0deg)`
                                    }}>
                                        <div className="w-9 h-9 rounded-full bg-card flex items-center justify-center text-xs font-medium">{balance.used}</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Leave Requests Table */}
            <Card className="border-border/50">
                <CardHeader>
                    <CardTitle className="text-lg">{isManager ? "All Leave Requests" : "My Leave Requests"}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {isManager && <TableHead>Employee</TableHead>}
                                <TableHead>Type</TableHead>
                                <TableHead>From</TableHead>
                                <TableHead>To</TableHead>
                                <TableHead>Days</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Status</TableHead>
                                {isManager && <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                [...Array(3)].map((_, i) => (
                                    <TableRow key={i}>
                                        {[...Array(isManager ? 8 : 6)].map((_, j) => (
                                            <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                (isManager ? leaves : myLeaves).map((leave: any) => (
                                    <TableRow key={leave._id} className="hover:bg-muted/30 transition-colors">
                                        {isManager && (
                                            <TableCell>
                                                <div>
                                                    <p className="text-sm font-medium">{leave.employee?.firstName} {leave.employee?.lastName}</p>
                                                    <p className="text-xs text-muted-foreground">{leave.employee?.employeeId}</p>
                                                </div>
                                            </TableCell>
                                        )}
                                        <TableCell><Badge className={`text-xs ${leaveTypeColors[leave.leaveType] || ''}`}>{leave.leaveType}</Badge></TableCell>
                                        <TableCell className="text-sm">{new Date(leave.startDate).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-sm">{new Date(leave.endDate).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-sm font-medium">{leave.totalDays}</TableCell>
                                        <TableCell className="text-sm max-w-[200px] truncate">{leave.reason}</TableCell>
                                        <TableCell><Badge className={`text-xs ${statusColors[leave.status]}`}>{leave.status}</Badge></TableCell>
                                        {isManager && (
                                            <TableCell className="text-right">
                                                {leave.status === 'pending' && (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button className="p-1.5 rounded-md text-emerald-400 hover:bg-emerald-500/10 transition-colors" onClick={() => handleUpdateStatus(leave._id, 'approved')}>
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10 transition-colors" onClick={() => handleUpdateStatus(leave._id, 'rejected')}>
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                            {!loading && (isManager ? leaves : myLeaves).length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={isManager ? 8 : 6} className="text-center py-8 text-muted-foreground">No leave requests found</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Apply Leave Modal */}
            {showApplyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="fixed inset-0 bg-black/50" onClick={() => setShowApplyModal(false)} />
                    <div className="relative z-50 w-full max-w-md mx-4 bg-popover rounded-xl p-6 shadow-xl border border-border">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Apply for Leave</h2>
                            <button onClick={() => setShowApplyModal(false)} className="p-1 hover:bg-muted rounded-md"><X className="w-4 h-4" /></button>
                        </div>
                        <form onSubmit={handleApply} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label>Leave Type</Label>
                                <select value={formData.leaveType} onChange={e => setFormData({ ...formData, leaveType: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-muted/50 border border-border text-sm">
                                    <option value="casual">Casual Leave</option>
                                    <option value="sick">Sick Leave</option>
                                    <option value="earned">Earned Leave</option>
                                    <option value="maternity">Maternity Leave</option>
                                    <option value="paternity">Paternity Leave</option>
                                    <option value="unpaid">Unpaid Leave</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>Start Date</Label>
                                    <Input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} required />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>End Date</Label>
                                    <Input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} required />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Reason</Label>
                                <Textarea value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} required placeholder="Provide reason for leave..." />
                            </div>
                            <Button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-blue-600 text-white">Submit Application</Button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
