"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Clock, UserCheck, UserX, AlertTriangle, LogIn, LogOut } from "lucide-react";

export default function AttendancePage() {
    const { user } = useAuth();
    const [attendance, setAttendance] = useState<any[]>([]);
    const [myAttendance, setMyAttendance] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

    const isManager = user?.role === 'admin' || user?.role === 'hr' || user?.role === 'senior_manager';

    useEffect(() => {
        fetchData();
    }, [dateFilter]);

    const fetchData = async () => {
        try {
            setLoading(true);
            if (isManager) {
                const [attRes, statsRes] = await Promise.all([
                    api.get('/attendance', { params: { date: dateFilter } }),
                    api.get('/attendance/stats'),
                ]);
                setAttendance(attRes.data.data);
                setStats(statsRes.data.data);
            }
            try {
                const myRes = await api.get('/attendance/my');
                setMyAttendance(myRes.data);
            } catch (err) { }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async () => {
        try {
            await api.post('/attendance/checkin');
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Check-in failed');
        }
    };

    const handleCheckOut = async () => {
        try {
            await api.put('/attendance/checkout');
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Check-out failed');
        }
    };

    const statusColors: Record<string, string> = {
        present: "bg-emerald-500/20 text-emerald-400",
        late: "bg-amber-500/20 text-amber-400",
        absent: "bg-red-500/20 text-red-400",
        half_day: "bg-orange-500/20 text-orange-400",
        on_leave: "bg-blue-500/20 text-blue-400",
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Clock className="w-6 h-6 text-violet-400" />
                        Attendance Management
                    </h1>
                    <p className="text-muted-foreground mt-1">Track daily attendance and work hours</p>
                </div>
            </div>

            {/* Employee Check-in/out Card */}
            {user?.role === 'employee' && (
                <Card className="border-border/50 bg-gradient-to-br from-violet-500/5 to-blue-500/5">
                    <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            <div className="text-center sm:text-left flex-1">
                                <h2 className="text-lg font-semibold mb-1">Today&apos;s Attendance</h2>
                                <p className="text-3xl font-bold font-mono">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            </div>
                            <div className="flex gap-3">
                                {!myAttendance?.todayRecord ? (
                                    <Button onClick={handleCheckIn} size="lg" className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white gap-2">
                                        <LogIn className="w-5 h-5" /> Check In
                                    </Button>
                                ) : !myAttendance.todayRecord.checkOut ? (
                                    <Button onClick={handleCheckOut} size="lg" className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white gap-2">
                                        <LogOut className="w-5 h-5" /> Check Out
                                    </Button>
                                ) : (
                                    <div className="text-center">
                                        <Badge className="bg-emerald-500/20 text-emerald-400 text-sm px-3 py-1">✓ Completed</Badge>
                                        <p className="text-sm text-muted-foreground mt-1">{myAttendance.todayRecord.workHours}h worked</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {myAttendance?.todayRecord && (
                            <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-border/50">
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground">Check In</p>
                                    <p className="text-sm font-medium mt-1">{new Date(myAttendance.todayRecord.checkIn).toLocaleTimeString()}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground">Check Out</p>
                                    <p className="text-sm font-medium mt-1">{myAttendance.todayRecord.checkOut ? new Date(myAttendance.todayRecord.checkOut).toLocaleTimeString() : '--:--'}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground">Status</p>
                                    <Badge className={`mt-1 ${statusColors[myAttendance.todayRecord.status]}`}>{myAttendance.todayRecord.status}</Badge>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Stats Cards for managers */}
            {isManager && stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: "Total Employees", value: stats.totalEmployees, icon: Clock, color: "text-violet-400", bg: "bg-violet-500/10" },
                        { label: "Present Today", value: stats.presentToday, icon: UserCheck, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                        { label: "Absent Today", value: stats.absentToday, icon: UserX, color: "text-red-400", bg: "bg-red-500/10" },
                        { label: "Late Today", value: stats.lateToday, icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" },
                    ].map((stat, i) => (
                        <Card key={i} className="border-border/50">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{stat.value}</p>
                                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Attendance Table */}
            {isManager && (
                <Card className="border-border/50">
                    <CardHeader className="flex-row items-center justify-between">
                        <CardTitle className="text-lg">Attendance Records</CardTitle>
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={e => setDateFilter(e.target.value)}
                            className="h-9 px-3 rounded-lg bg-muted/50 border border-border text-sm"
                        />
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Check In</TableHead>
                                    <TableHead>Check Out</TableHead>
                                    <TableHead>Work Hours</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <TableRow key={i}>{[...Array(6)].map((_, j) => <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>)}</TableRow>
                                    ))
                                ) : attendance.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No attendance records for this date</TableCell></TableRow>
                                ) : (
                                    attendance.map((rec: any) => (
                                        <TableRow key={rec._id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell>
                                                <div>
                                                    <p className="text-sm font-medium">{rec.employee?.firstName} {rec.employee?.lastName}</p>
                                                    <p className="text-xs text-muted-foreground">{rec.employee?.employeeId}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">{rec.employee?.department}</TableCell>
                                            <TableCell className="text-sm">{rec.checkIn ? new Date(rec.checkIn).toLocaleTimeString() : '--'}</TableCell>
                                            <TableCell className="text-sm">{rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString() : '--'}</TableCell>
                                            <TableCell className="text-sm font-medium">{rec.workHours ? `${rec.workHours}h` : '--'}</TableCell>
                                            <TableCell><Badge className={`text-xs ${statusColors[rec.status]}`}>{rec.status}</Badge></TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* My Attendance History for employees */}
            {user?.role === 'employee' && myAttendance?.data && (
                <Card className="border-border/50">
                    <CardHeader>
                        <CardTitle className="text-lg">My Attendance History</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Check In</TableHead>
                                    <TableHead>Check Out</TableHead>
                                    <TableHead>Work Hours</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {myAttendance.data.map((rec: any) => (
                                    <TableRow key={rec._id}>
                                        <TableCell className="text-sm">{new Date(rec.date).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-sm">{rec.checkIn ? new Date(rec.checkIn).toLocaleTimeString() : '--'}</TableCell>
                                        <TableCell className="text-sm">{rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString() : '--'}</TableCell>
                                        <TableCell className="text-sm font-medium">{rec.workHours ? `${rec.workHours}h` : '--'}</TableCell>
                                        <TableCell><Badge className={`text-xs ${statusColors[rec.status]}`}>{rec.status}</Badge></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
