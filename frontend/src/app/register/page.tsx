"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { LayoutDashboard, Eye, EyeOff, User, Mail, Lock, Phone, ChevronRight } from "lucide-react";

type Role = "candidate" | "employee" | "hr" | "senior_manager" | "admin";

const roles: { value: Role; label: string; desc: string; color: string }[] = [
    { value: "candidate", label: "Job Candidate", desc: "Browse jobs & track applications", color: "bg-slate-700" },
    { value: "admin", label: "Management Admin", desc: "System configuration & oversight", color: "bg-slate-700" },
    { value: "hr", label: "HR Recruiter", desc: "Manage talent & recruitment", color: "bg-slate-700" },
    { value: "senior_manager", label: "Senior Manager", desc: "Team analytics & approvals", color: "bg-slate-700" },
];

export default function RegisterPage() {
    const auth = useAuth();
    const register = auth?.register;
    const router = useRouter();

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const [step, setStep] = useState<1 | 2>(1);
    const [role, setRole] = useState<Role>("candidate");
    const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", phone: "" });
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    if (!mounted) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (form.password !== form.confirmPassword) return setError("Passwords do not match");
        if (form.password.length < 6) return setError("Password must be at least 6 characters");
        setLoading(true);
        try {
            await register({ name: form.name, email: form.email, password: form.password, phone: form.phone, role });
            router.push(role === "candidate" ? "/portal" : "/dashboard");
        } catch (err: any) {
            setError(err.response?.data?.message || "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-background font-sans">
            {/* Left branding */}
            <div className="hidden lg:flex lg:w-2/5 bg-slate-950 relative overflow-hidden flex-col justify-center px-14 text-white">
                <div className="absolute inset-0">
                    <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-slate-800 rounded-full blur-3xl opacity-50" />
                    <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-slate-900 rounded-full blur-3xl opacity-50" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center">
                            <LayoutDashboard className="w-6 h-6 text-slate-950" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">TalentSphere</h1>
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Enterprise HRMS</p>
                        </div>
                    </div>
                    <h2 className="text-4xl font-bold leading-tight mb-4">
                        Join the Future of<br />
                        <span className="text-slate-400">Workforce Excellence.</span>
                    </h2>
                    <p className="text-slate-400 mb-8 leading-relaxed">
                        The most comprehensive platform for recruitment, employee lifecycle management, and organizational intelligence.
                    </p>
                    <div className="space-y-3">
                        {["End-to-End Recruitment", "Automated Payroll Management", "Advanced Workforce Analytics", "Employee Self-Service Portal"].map((f, i) => (
                            <div key={i} className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-2.5 border border-white/10 text-xs text-slate-300 font-medium">
                                <div className="w-1 h-1 rounded-full bg-slate-500" />
                                {f}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right form */}
            <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
                <div className="w-full max-w-md space-y-6">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold tracking-tight">Create account</h2>
                        <p className="text-muted-foreground text-sm mt-2">
                            Already have an account? <Link href="/login" className="text-slate-950 dark:text-white font-bold underline underline-offset-4">Sign in</Link>
                        </p>
                    </div>

                    {/* Step indicator */}
                    <div className="flex items-center gap-2">
                        {[1, 2].map(s => (
                            <div key={s} className={`h-1 flex-1 rounded-full transition-all ${s <= step ? 'bg-slate-900 dark:bg-white' : 'bg-slate-200 dark:bg-slate-800'}`} />
                        ))}
                    </div>

                    {/* Step 1 — Role Selection */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Select Profile Type</p>
                            <div className="grid grid-cols-1 gap-3">
                                {roles.map(r => (
                                    <button key={r.value} onClick={() => setRole(r.value)}
                                        className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${role === r.value ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-900' : 'border-border hover:bg-slate-50 dark:hover:bg-slate-900'}`}>
                                        <div className={`w-10 h-10 rounded-lg ${r.color} flex items-center justify-center shrink-0`}>
                                            <User className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm">{r.label}</p>
                                            <p className="text-[11px] text-muted-foreground">{r.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setStep(2)}
                                className="w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all">
                                Continue to details <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Step 2 — Account Details */}
                    {step === 2 && (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <button type="button" onClick={() => setStep(1)} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 flex items-center gap-1 mb-2">
                                ← Change account type ({roles.find(r => r.value === role)?.label})
                            </button>

                            {error && <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-xs font-medium">{error}</div>}

                            <div className="space-y-3">
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input type="text" placeholder="Full Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                        className="w-full h-11 pl-9 pr-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-border text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-900" />
                                </div>

                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input type="email" placeholder="Email address" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                                        className="w-full h-11 pl-9 pr-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-border text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-900" />
                                </div>

                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input type="tel" placeholder="Phone number (optional)" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                                        className="w-full h-11 pl-9 pr-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-border text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-900" />
                                </div>

                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input type={showPw ? "text" : "password"} placeholder="Password (min 6 chars)" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                                        className="w-full h-11 pl-9 pr-10 rounded-lg bg-slate-50 dark:bg-slate-900 border border-border text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-900" />
                                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>

                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input type="password" placeholder="Confirm password" required value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                                        className="w-full h-11 pl-9 pr-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-border text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-900" />
                                </div>
                            </div>

                            <button type="submit" disabled={loading}
                                className="w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all mt-6 shadow-sm">
                                {loading ? <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Creating account...</> : "Create Account"}
                            </button>

                            <p className="text-[10px] text-muted-foreground text-center uppercase tracking-widest font-semibold mt-4">
                                Secure Enterprise Registration
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
