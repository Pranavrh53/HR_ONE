"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import {
    LayoutDashboard, Users, Clock, CalendarDays, Briefcase, FileText,
    BarChart3, MessageSquare, Brain, LogOut, Menu, X, ChevronDown,
    Settings, Bell, Search, UserCircle, Mic, Target, DollarSign, Rocket
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface NavItem {
    label: string;
    href: string;
    icon: any;
    roles: string[];
    badge?: string;
}

const navItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "senior_manager", "hr", "employee"] },
    { label: "Employees", href: "/dashboard/employees", icon: Users, roles: ["admin", "hr", "senior_manager"] },
    { label: "Attendance", href: "/dashboard/attendance", icon: Clock, roles: ["admin", "hr", "senior_manager", "employee"] },
    { label: "Leave Management", href: "/dashboard/leaves", icon: CalendarDays, roles: ["admin", "hr", "senior_manager", "employee"] },
    { label: "Onboarding", href: "/dashboard/onboarding", icon: Rocket, roles: ["admin", "hr", "employee"] },
    { label: "Payroll", href: "/dashboard/payroll", icon: DollarSign, roles: ["admin", "hr", "employee"] },
    { label: "Career Portal", href: "/careers", icon: Briefcase, roles: ["employee"] },
    { label: "Track Application", href: "/careers/status", icon: FileText, roles: ["admin", "hr", "senior_manager", "employee"] },
    { label: "Recruitment", href: "/dashboard/recruitment", icon: Briefcase, roles: ["hr"] },
    { label: "Hiring Decisions", href: "/dashboard/hiring", icon: Target, roles: ["admin", "hr"] },
    { label: "Bulk Resume Import", href: "/dashboard/resume-screening", icon: FileText, roles: ["hr"] },
    { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3, roles: ["admin", "hr", "senior_manager"] },
    { label: "HR Assistant", href: "/dashboard/chat", icon: MessageSquare, roles: ["admin", "hr", "employee", "senior_manager"] },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
    const { user, logout, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted && !loading) {
            if (!user) {
                router.push("/login");
            } else if (user.role === 'candidate') {
                router.push("/portal");
            }
        }
    }, [user, loading, mounted, router]);

    if (!mounted || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background" suppressHydrationWarning>
                <div className="flex flex-col items-center gap-4" suppressHydrationWarning>
                    <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center animate-pulse">
                        <LayoutDashboard className="w-7 h-7 text-slate-500" />
                    </div>
                    <p className="text-muted-foreground animate-pulse">TalentSphere HRMS</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    const filteredNav = navItems.filter((item) => item.roles.includes(user.role));

    const roleColors: Record<string, string> = {
        admin: "bg-slate-700",
        senior_manager: "bg-slate-700",
        hr: "bg-slate-700",
        employee: "bg-slate-700",
    };

    const roleLabels: Record<string, string> = {
        admin: "Management Admin",
        hr: "HR Recruiter",
        senior_manager: "Senior Manager",
        employee: "Employee",
    };

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    return (
        <div className="min-h-screen flex bg-background font-sans">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-screen
        ${collapsed ? "w-[70px]" : "w-64"} 
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        transition-all duration-300 ease-in-out
        bg-card border-r border-border flex flex-col
      `} suppressHydrationWarning>
                {/* Logo */}
                <div className="h-16 flex items-center px-4 border-b border-border gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-900 dark:bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <LayoutDashboard className="w-5 h-5 text-white dark:text-slate-900" />
                    </div>
                    {!collapsed && (
                        <div className="overflow-hidden">
                            <h1 className="text-sm font-bold tracking-tight whitespace-nowrap text-foreground">TalentSphere</h1>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Enterprise HRMS</p>
                        </div>
                    )}
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                    {filteredNav.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${isActive
                                        ? "bg-slate-100 dark:bg-slate-800 text-foreground border border-border"
                                        : "text-muted-foreground hover:text-foreground hover:bg-slate-50 dark:hover:bg-slate-900"
                                    }
                `}
                            >
                                <item.icon className="w-4 h-4 flex-shrink-0" />
                                {!collapsed && (
                                    <>
                                        <span className="flex-1">{item.label}</span>
                                        {item.badge && (
                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-violet-500/20 text-violet-400 border-violet-500/30">
                                                {item.badge}
                                            </Badge>
                                        )}
                                    </>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Section */}
                {!collapsed && (
                    <div className="p-3 border-t border-border">
                        <div className="flex items-center gap-3 px-2 py-2">
                            <Avatar className="w-8 h-8">
                                <AvatarFallback className={`bg-gradient-to-br ${roleColors[user.role]} text-white text-xs`}>
                                    {user.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{user.name}</p>
                                <p className="text-[10px] text-muted-foreground">{roleLabels[user.role]}</p>
                            </div>
                        </div>
                    </div>
                )}
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Bar */}
                <header className="h-16 sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border flex items-center px-4 lg:px-6 gap-4">
                    <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-muted rounded-lg">
                        <Menu className="w-5 h-5" />
                    </button>

                    <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:flex p-2 hover:bg-muted rounded-lg">
                        <Menu className="w-5 h-5" />
                    </button>

                    {/* Search */}
                    <div className="hidden md:flex items-center flex-1 max-w-md">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search employees, jobs, reports..."
                                className="w-full h-9 pl-9 pr-4 rounded-lg bg-muted/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50"
                            />
                        </div>
                    </div>

                    <div className="flex-1 md:flex-none" />

                    {/* Right section */}
                    <div className="flex items-center gap-2">
                        <button className="relative p-2 hover:bg-muted rounded-lg transition-colors">
                            <Bell className="w-4 h-4" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-violet-500 rounded-full" />
                        </button>

                        <Separator orientation="vertical" className="h-6 hidden sm:block" />

                        {/* User dropdown - custom implementation */}
                        <div className="relative">
                            <button
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
                            >
                                <Avatar className="w-7 h-7">
                                    <AvatarFallback className={`bg-gradient-to-br ${roleColors[user.role]} text-white text-[10px]`}>
                                        {user.name.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="hidden sm:block text-left">
                                    <p className="text-xs font-medium">{user.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{roleLabels[user.role]}</p>
                                </div>
                                <ChevronDown className="w-3 h-3 text-muted-foreground hidden sm:block" />
                            </button>

                            {userMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                                    <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg bg-popover border border-border shadow-lg p-1">
                                        <button
                                            className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors"
                                            onClick={() => setUserMenuOpen(false)}
                                        >
                                            <UserCircle className="w-4 h-4" /> Profile
                                        </button>
                                        <button
                                            className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors"
                                            onClick={() => setUserMenuOpen(false)}
                                        >
                                            <Settings className="w-4 h-4" /> Settings
                                        </button>
                                        <div className="h-px bg-border my-1" />
                                        <button
                                            className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                                            onClick={handleLogout}
                                        >
                                            <LogOut className="w-4 h-4" /> Logout
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 lg:p-6 overflow-auto" suppressHydrationWarning>
                    {children}
                </main>
            </div>
        </div>
    );
}
