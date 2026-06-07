"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, Eye, EyeOff, Shield, Users, BarChart3 } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const userData = await login(email, password);
            // Route candidates to their portal, staff to dashboard
            const role = (userData as any)?.role || '';
            router.push(role === 'candidate' ? '/portal' : '/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || "Login failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const demoLogins = [
        { role: "Management Admin", email: "admin@talentsphere.com", password: "admin123", icon: Shield, color: "bg-slate-700" },
        { role: "HR Recruiter", email: "hr@talentsphere.com", password: "hr123456", icon: Users, color: "bg-slate-700" },
        { role: "Senior Manager", email: "manager@talentsphere.com", password: "manager123", icon: BarChart3, color: "bg-slate-700" },
        { role: "Employee", email: "amit@talentsphere.com", password: "employee123", icon: Users, color: "bg-slate-700" },
    ];

    return (
        <div className="min-h-screen flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-950">
                {/* Subtle Background */}
                <div className="absolute inset-0">
                    <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-slate-800 rounded-full blur-3xl opacity-50" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-900 rounded-full blur-3xl opacity-50" />
                </div>

                <div className="relative z-10 flex flex-col justify-center px-16 text-white w-full">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center font-bold text-slate-950">
                            <LayoutDashboard className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">TalentSphere</h1>
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Enterprise HRMS</p>
                        </div>
                    </div>

                    <h2 className="text-4xl font-bold leading-tight mb-6">
                        The Operating System for<br />
                        <span className="text-slate-400">Modern Workforce.</span>
                    </h2>
                    <p className="text-lg text-slate-400 mb-12 max-w-md leading-relaxed">
                        A unified platform for recruitment, payroll, and employee lifecycle management. Built for enterprise scale and operational excellence.
                    </p>

                    <div className="grid grid-cols-2 gap-4 max-w-lg">
                        {[
                            { title: "Core HR", desc: "Centralized employee records" },
                            { title: "Recruitment", desc: "End-to-end hiring pipeline" },
                            { title: "Payroll", desc: "Automated global disbursements" },
                            { title: "Analytics", desc: "Deep workforce intelligence" },
                        ].map((feature, i) => (
                            <div key={i} className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                                <p className="text-sm font-bold text-white mb-1">{feature.title}</p>
                                <p className="text-xs text-slate-500">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-background">
                <div className="w-full max-w-md space-y-8">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center gap-3 justify-center mb-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
                            <LayoutDashboard className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-xl font-bold">TalentSphere</h1>
                    </div>

                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
                        <p className="text-muted-foreground mt-2">Sign in to your account to continue</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="h-11"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="h-11 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <Button type="submit" className="w-full h-11 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white" disabled={loading}>
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Signing in...
                                </span>
                            ) : (
                                "Sign In"
                            )}
                        </Button>
                    </form>

                    <div className="flex items-center justify-between text-sm">
                        <Link href="/register" className="text-violet-400 hover:text-violet-300">Create an account</Link>
                        <Link href="/forgot-password" className="text-muted-foreground hover:text-foreground">Forgot password?</Link>
                    </div>

                    {/* Demo Login Cards */}
                    <div className="pt-4">
                        <p className="text-sm text-muted-foreground text-center mb-4">Quick demo access</p>
                        <div className="grid grid-cols-2 gap-2">
                            {demoLogins.map((demo) => (
                                <button
                                    key={demo.role}
                                    onClick={() => { setEmail(demo.email); setPassword(demo.password); }}
                                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border hover:border-violet-500/50 hover:bg-violet-500/5 transition-all text-left group"
                                >
                                    <div className={`w-8 h-8 rounded-md bg-gradient-to-br ${demo.color} flex items-center justify-center flex-shrink-0`}>
                                        <demo.icon className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium group-hover:text-violet-400 transition-colors">{demo.role}</p>
                                        <p className="text-[10px] text-muted-foreground truncate">{demo.email}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
