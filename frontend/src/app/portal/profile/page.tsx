"use client";

import { useAuth } from "@/context/AuthContext";
import { User, Mail, Phone, Briefcase, Shield, Calendar } from "lucide-react";

export default function PortalProfilePage() {
    const { user } = useAuth();

    const fields = [
        { label: "Full Name", value: user?.name, icon: User },
        { label: "Email", value: user?.email, icon: Mail },
        { label: "Role", value: user?.role, icon: Shield },
        { label: "Department", value: user?.department || "—", icon: Briefcase },
    ];

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <User className="w-6 h-6 text-violet-400" /> Profile
                </h1>
                <p className="text-muted-foreground text-sm mt-1">Your account information.</p>
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-5 p-5 rounded-2xl border border-border/50 bg-card">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-3xl font-bold shrink-0">
                    {user?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                    <h2 className="text-xl font-bold">{user?.name}</h2>
                    <p className="text-muted-foreground text-sm">{user?.email}</p>
                    <span className="mt-1 inline-block text-xs px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/30 capitalize">
                        {user?.role}
                    </span>
                </div>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fields.map(f => (
                    <div key={f.label} className="p-4 rounded-xl border border-border/50 bg-card">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                            <f.icon className="w-3.5 h-3.5" /> {f.label}
                        </div>
                        <p className="font-medium capitalize">{f.value || "—"}</p>
                    </div>
                ))}
            </div>

            <p className="text-xs text-muted-foreground">To update your profile, visit <a href="/portal/settings" className="text-violet-400 hover:text-violet-300">Settings →</a></p>
        </div>
    );
}
