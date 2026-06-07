"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
    LayoutDashboard, FileText, Mic, Bell, Settings, User, LogOut,
    Brain, Menu, X, Briefcase, ChevronRight
} from "lucide-react";

const navItems = [
    { label: "Dashboard", href: "/portal", icon: LayoutDashboard },
    { label: "Job Openings", href: "/portal/jobs", icon: Briefcase },
    { label: "My Applications", href: "/portal/applications", icon: FileText },
    { label: "My Interviews", href: "/portal/interviews", icon: Mic },
    { label: "Offers", href: "/portal/offers", icon: FileText },
    { label: "HR Assistant", href: "/portal/chat", icon: Brain },
    { label: "Notifications", href: "/portal/notifications", icon: Bell },
    { label: "Settings", href: "/portal/settings", icon: Settings },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
    const { user, logout, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.replace("/login");
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            </div>
        );
    }

    const handleLogout = () => { logout(); router.push("/login"); };

    const Sidebar = () => (
        <div className="flex flex-col h-full bg-card border-r border-border/60">
            {/* Logo */}
            <div className="flex items-center gap-3 px-5 py-5 border-b border-border/60">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0">
                    <Brain className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                    <p className="font-bold text-sm leading-none">TalentSphere</p>
                    <p className="text-[10px] text-violet-400 mt-0.5">Candidate Portal</p>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navItems.map(item => {
                    const active = pathname === item.href || (item.href !== "/portal" && pathname.startsWith(item.href));
                    return (
                        <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? "bg-violet-500/15 text-violet-400 border border-violet-500/20" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
                            <item.icon className="w-4 h-4 shrink-0" />
                            {item.label}
                            {active && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
                        </Link>
                    );
                })}
            </nav>

            {/* User */}
            <div className="px-3 py-4 border-t border-border/60 space-y-1">
                <Link href="/portal/profile"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
                    <User className="w-4 h-4" />
                    Profile
                </Link>
                <div className="px-3 py-2.5 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {user.name?.[0]?.toUpperCase() || "C"}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{user.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <button onClick={handleLogout} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background flex" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Desktop sidebar */}
            <div className="hidden md:flex w-64 shrink-0 fixed inset-y-0 left-0 z-30">
                <Sidebar />
            </div>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
                    <div className="absolute inset-y-0 left-0 w-64">
                        <Sidebar />
                    </div>
                </div>
            )}

            {/* Main */}
            <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
                {/* Topbar */}
                <header className="sticky top-0 z-20 h-14 bg-background/80 backdrop-blur border-b border-border/60 flex items-center px-4 gap-3">
                    <button onClick={() => setSidebarOpen(true)} className="md:hidden text-muted-foreground hover:text-foreground">
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex-1" />
                    <span className="text-xs text-muted-foreground hidden sm:block">Candidate Portal</span>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                        {user.name?.[0]?.toUpperCase() || "C"}
                    </div>
                </header>
                <main className="flex-1 p-4 md:p-6 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
