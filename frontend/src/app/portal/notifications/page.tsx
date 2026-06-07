"use client";

import { Bell, CheckCircle, Briefcase, Mic, Star, AlertCircle, Info } from "lucide-react";

const mockNotifications = [
    { id: 1, type: "success", icon: CheckCircle, color: "text-emerald-400 bg-emerald-500/10", title: "Application Submitted", message: "Your application for AI Engineer has been received.", time: "Just now" },
    { id: 2, type: "info", icon: Briefcase, color: "text-blue-400 bg-blue-500/10", title: "AI Screening Completed", message: "Your resume has been analyzed. Score: 88/100.", time: "2 hours ago" },
    { id: 3, type: "success", icon: Star, color: "text-violet-400 bg-violet-500/10", title: "Shortlisted!", message: "Congratulations! You've been shortlisted for AI Engineer.", time: "1 day ago" },
    { id: 4, type: "warning", icon: Mic, color: "text-amber-400 bg-amber-500/10", title: "Interview Assigned", message: "Your AI Interview is now available. Please complete it within 7 days.", time: "1 day ago" },
    { id: 5, type: "info", icon: Info, color: "text-cyan-400 bg-cyan-500/10", title: "Profile Tip", message: "Complete your profile to improve your chances of getting shortlisted.", time: "3 days ago" },
];

export default function NotificationsPage() {
    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Bell className="w-6 h-6 text-violet-400" /> Notifications
                </h1>
                <p className="text-muted-foreground text-sm mt-1">Stay updated on your application progress.</p>
            </div>

            <div className="space-y-3">
                {mockNotifications.map(n => (
                    <div key={n.id} className="flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-card hover:border-violet-500/20 transition-all">
                        <div className={`w-9 h-9 rounded-lg ${n.color} flex items-center justify-center shrink-0`}>
                            <n.icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                                <p className="font-medium text-sm">{n.title}</p>
                                <span className="text-xs text-muted-foreground shrink-0">{n.time}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                        </div>
                    </div>
                ))}
            </div>

            <p className="text-xs text-muted-foreground text-center">
                Real-time notifications will be implemented in a future update via WebSockets.
            </p>
        </div>
    );
}
