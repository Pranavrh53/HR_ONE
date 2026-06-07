"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Clock, CalendarDays, TrendingUp, UserCheck, UserX, AlertCircle, Briefcase } from "lucide-react";

interface Stats {
    totalEmployees: number;
    departmentStats: { _id: string; count: number }[];
    recentHires: any[];
}

interface AttendanceStats {
    totalEmployees: number;
    presentToday: number;
    absentToday: number;
    lateToday: number;
    attendanceRate: string;
}

interface LeaveStats {
    pending: number;
    approved: number;
    rejected: number;
}

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState<Stats | null>(null);
    const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
    const [leaveStats, setLeaveStats] = useState<LeaveStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                if (user?.role !== 'employee') {
                    const [empRes, attRes, leaveRes] = await Promise.all([
                        api.get('/employees/stats'),
                        api.get('/attendance/stats'),
                        api.get('/leaves/stats'),
                    ]);
                    setStats(empRes.data.data);
                    setAttendanceStats(attRes.data.data);
                    setLeaveStats(leaveRes.data.data);
                }
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [user]);

    const roleGreetings: Record<string, string> = {
        admin: "System Overview",
        hr: "Recruitment & Management Hub",
        senior_manager: "Team Performance Overview",
        employee: "Your Workspace",
    };

    const statCards = [
        {
            title: "Total Employees",
            value: stats?.totalEmployees || 0,
            icon: Users,
            color: "from-violet-500 to-purple-600",
            bgColor: "bg-violet-500/10",
        },
        {
            title: "Present Today",
            value: attendanceStats?.presentToday || 0,
            icon: UserCheck,
            color: "from-emerald-500 to-green-500",
            bgColor: "bg-emerald-500/10",
            subtitle: `${attendanceStats?.attendanceRate || 0}% rate`,
        },
        {
            title: "Absent Today",
            value: attendanceStats?.absentToday || 0,
            icon: UserX,
            color: "from-red-500 to-rose-500",
            bgColor: "bg-red-500/10",
        },
        {
            title: "Pending Leaves",
            value: leaveStats?.pending || 0,
            icon: CalendarDays,
            color: "from-amber-500 to-orange-500",
            bgColor: "bg-amber-500/10",
        },
    ];

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 bg-muted rounded-lg w-64 animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">
                    Welcome back, <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">{user?.name?.split(' ')[0]}</span>
                </h1>
                <p className="text-muted-foreground mt-1">{roleGreetings[user?.role || 'employee']}</p>
            </div>

            {/* Employee Dashboard */}
            {user?.role === 'employee' ? (
                <EmployeeDashboard />
            ) : (
                <>
                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {statCards.map((stat, i) => (
                            <Card key={i} className="border-border/50 hover:border-border transition-colors group">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">{stat.title}</p>
                                            <p className="text-3xl font-bold mt-1">{stat.value}</p>
                                            {stat.subtitle && (
                                                <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                                            )}
                                        </div>
                                        <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                            <stat.icon className={`w-5 h-5 bg-gradient-to-br ${stat.color} bg-clip-text`} style={{ color: 'inherit' }} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Department & Recent Hires */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Department Distribution */}
                        <Card className="border-border/50">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-violet-400" />
                                    Department Distribution
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {stats?.departmentStats?.map((dept) => (
                                        <div key={dept._id} className="flex items-center gap-3">
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-medium">{dept._id}</span>
                                                    <span className="text-sm text-muted-foreground">{dept.count}</span>
                                                </div>
                                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full transition-all"
                                                        style={{ width: `${(dept.count / (stats?.totalEmployees || 1)) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {(!stats?.departmentStats || stats.departmentStats.length === 0) && (
                                        <p className="text-sm text-muted-foreground text-center py-4">No department data available</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recent Hires */}
                        <Card className="border-border/50">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                                    Recent Hires
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {stats?.recentHires?.map((hire, i) => (
                                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center text-sm font-medium">
                                                {hire.firstName?.[0]}{hire.lastName?.[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{hire.firstName} {hire.lastName}</p>
                                                <p className="text-xs text-muted-foreground">{hire.department} • {hire.designation}</p>
                                            </div>
                                            <Badge variant="secondary" className="text-[10px]">{hire.employeeId}</Badge>
                                        </div>
                                    ))}
                                    {(!stats?.recentHires || stats.recentHires.length === 0) && (
                                        <p className="text-sm text-muted-foreground text-center py-4">No recent hires</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Leave Overview */}
                    {leaveStats && (
                        <Card className="border-border/50">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <CalendarDays className="w-4 h-4 text-amber-400" />
                                    Leave Overview
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                                        <p className="text-2xl font-bold text-amber-400">{leaveStats.pending}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Pending</p>
                                    </div>
                                    <div className="text-center p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                                        <p className="text-2xl font-bold text-emerald-400">{leaveStats.approved}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Approved</p>
                                    </div>
                                    <div className="text-center p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                                        <p className="text-2xl font-bold text-red-400">{leaveStats.rejected}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Rejected</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}

// Employee-specific dashboard
function EmployeeDashboard() {
    const [myAttendance, setMyAttendance] = useState<any>(null);
    const [myLeaves, setMyLeaves] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const [attRes, leaveRes] = await Promise.all([
                    api.get('/attendance/my'),
                    api.get('/leaves/my'),
                ]);
                setMyAttendance(attRes.data);
                setMyLeaves(leaveRes.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    const handleCheckIn = async () => {
        try {
            await api.post('/attendance/checkin');
            const res = await api.get('/attendance/my');
            setMyAttendance(res.data);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Check-in failed');
        }
    };

    const handleCheckOut = async () => {
        try {
            await api.put('/attendance/checkout');
            const res = await api.get('/attendance/my');
            setMyAttendance(res.data);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Check-out failed');
        }
    };

    if (loading) {
        return <div className="h-32 bg-muted rounded-xl animate-pulse" />;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Attendance Card */}
            <Card className="border-border/50">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="w-4 h-4 text-violet-400" />
                        Today&apos;s Attendance
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {myAttendance?.todayRecord ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Status</span>
                                    <Badge className={
                                        myAttendance.todayRecord.status === 'present' ? 'bg-emerald-500/20 text-emerald-400' :
                                            myAttendance.todayRecord.status === 'late' ? 'bg-amber-500/20 text-amber-400' :
                                                'bg-red-500/20 text-red-400'
                                    }>
                                        {myAttendance.todayRecord.status}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Check In</span>
                                    <span className="text-sm font-medium">
                                        {new Date(myAttendance.todayRecord.checkIn).toLocaleTimeString()}
                                    </span>
                                </div>
                                {myAttendance.todayRecord.checkOut && (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Check Out</span>
                                            <span className="text-sm font-medium">
                                                {new Date(myAttendance.todayRecord.checkOut).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Work Hours</span>
                                            <span className="text-sm font-medium">{myAttendance.todayRecord.workHours}h</span>
                                        </div>
                                    </>
                                )}
                                {!myAttendance.todayRecord.checkOut && (
                                    <Button onClick={handleCheckOut} className="w-full bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white">
                                        Check Out
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-sm text-muted-foreground mb-4">You haven&apos;t checked in today</p>
                                <Button onClick={handleCheckIn} className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white">
                                    Check In Now
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Leave Balance */}
            <Card className="border-border/50">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-amber-400" />
                        Leave Balance
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {myLeaves?.leaveBalance ? (
                        <div className="space-y-3">
                            {Object.entries(myLeaves.leaveBalance).map(([type, balance]: [string, any]) => (
                                <div key={type} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                                    <span className="text-sm font-medium capitalize">{type} Leave</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-emerald-400">{balance.remaining}</span>
                                        <span className="text-xs text-muted-foreground">/ {balance.total}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No leave data available</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
