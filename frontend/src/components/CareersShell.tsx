"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Search, ClipboardList, Sparkles } from "lucide-react";

const nav = [
    { href: "/careers", label: "Open Positions", icon: Briefcase },
    { href: "/careers/status", label: "Track Application", icon: ClipboardList },
];

export default function CareersShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-violet-950/20">
            <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/careers" className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="font-bold text-sm leading-tight">TalentSphere</p>
                            <p className="text-[10px] text-muted-foreground">Career Portal</p>
                        </div>
                    </Link>
                    <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground">
                        HR Login →
                    </Link>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-6 py-8 flex gap-8">
                <aside className="hidden md:block w-56 shrink-0">
                    <nav className="space-y-1 sticky top-24">
                        {nav.map((item) => {
                            const active = pathname === item.href || (item.href !== "/careers" && pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${active
                                        ? "bg-violet-500/15 text-violet-300 border border-violet-500/30 font-medium"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                        }`}
                                >
                                    <item.icon className="w-4 h-4" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>
                    <div className="mt-6 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300">
                        <Search className="w-4 h-4 mb-2" />
                        Apply once — AI screens your resume automatically. Shortlisted candidates receive an AI interview invite here.
                    </div>
                </aside>

                <main className="flex-1 min-w-0">{children}</main>
            </div>
        </div>
    );
}
