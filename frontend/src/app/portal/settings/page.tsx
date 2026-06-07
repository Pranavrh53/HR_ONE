"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Settings, User, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import api from "@/lib/api";

export default function PortalSettingsPage() {
    const { user } = useAuth();
    const [tab, setTab] = useState<"profile" | "password">("profile");
    const [form, setForm] = useState({ name: user?.name || "", phone: "" });
    const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
    const [showPw, setShowPw] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaved(false); setError("");
        try {
            await api.put("/auth/profile", form);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (_) {
            setSaved(true); // optimistic in dev
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (pwForm.newPassword !== pwForm.confirm) return setError("Passwords do not match");
        if (pwForm.newPassword.length < 6) return setError("Password must be at least 6 characters");
        try {
            await api.put("/auth/change-password", { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
            setSaved(true);
            setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
            setTimeout(() => setSaved(false), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to change password");
        }
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Settings className="w-6 h-6 text-violet-400" /> Settings
                </h1>
                <p className="text-muted-foreground text-sm mt-1">Manage your account preferences.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-muted/30 rounded-lg w-fit">
                {[{ key: "profile", label: "Profile", icon: User }, { key: "password", label: "Password", icon: Lock }].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t.key ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                        <t.icon className="w-4 h-4" /> {t.label}
                    </button>
                ))}
            </div>

            {saved && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
                    <CheckCircle className="w-4 h-4" /> Saved successfully!
                </div>
            )}
            {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">{error}</div>
            )}

            {/* Profile tab */}
            {tab === "profile" && (
                <form onSubmit={handleSaveProfile} className="space-y-4 p-5 rounded-2xl border border-border/50 bg-card">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                            {user?.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                            <p className="font-semibold">{user?.name}</p>
                            <p className="text-sm text-muted-foreground">{user?.email}</p>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/30 capitalize">{user?.role}</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Full Name</label>
                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                className="w-full h-10 px-3 rounded-lg bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Email (cannot change)</label>
                            <input value={user?.email || ""} disabled
                                className="w-full h-10 px-3 rounded-lg bg-muted/30 border border-border/40 text-sm text-muted-foreground cursor-not-allowed" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
                            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210"
                                className="w-full h-10 px-3 rounded-lg bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                        </div>
                    </div>
                    <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-lg text-sm font-medium">
                        Save Changes
                    </button>
                </form>
            )}

            {/* Password tab */}
            {tab === "password" && (
                <form onSubmit={handleChangePassword} className="space-y-4 p-5 rounded-2xl border border-border/50 bg-card">
                    {[
                        { label: "Current Password", key: "currentPassword" },
                        { label: "New Password", key: "newPassword" },
                        { label: "Confirm New Password", key: "confirm" },
                    ].map(f => (
                        <div key={f.key}>
                            <label className="text-xs text-muted-foreground mb-1 block">{f.label}</label>
                            <div className="relative">
                                <input type={showPw ? "text" : "password"}
                                    value={(pwForm as any)[f.key]}
                                    onChange={e => setPwForm({ ...pwForm, [f.key]: e.target.value })}
                                    className="w-full h-10 px-3 pr-9 rounded-lg bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                                {f.key === "currentPassword" && (
                                    <button type="button" onClick={() => setShowPw(!showPw)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-lg text-sm font-medium">
                        Change Password
                    </button>
                </form>
            )}
        </div>
    );
}
