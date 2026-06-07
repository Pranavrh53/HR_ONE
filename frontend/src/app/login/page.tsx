"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Eye, EyeOff, Sparkles, Shield, Users, BarChart3 } from "lucide-react";
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
            await login(email, password);
            router.push("/dashboard");
        } catch (err: any) {
            setError(err.response?.data?.message || "Login failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const demoLogins = [
        { role: "Admin", email: "admin@talentsphere.com", password: "admin123", icon: Shield, color: "from-violet-500 to-purple-600" },
        { role: "HR Recruiter", email: "hr@talentsphere.com", password: "hr123456", icon: Users, color: "from-blue-500 to-cyan-500" },
        { role: "Manager", email: "manager@talentsphere.com", password: "manager123", icon: BarChart3, color: "from-emerald-500 to-green-500" },
        { role: "Employee", email: "amit@talentsphere.com", password: "employee123", icon: Sparkles, color: "from-orange-500 to-amber-500" },
    ];

    return (
        <div className="min-h-screen flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900">
                {/* Animated Background */}
                <div className="absolute inset-0">
                    <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl animate-pulse delay-1000" />
                    <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-500" />
                </div>

                {/* Grid pattern */}
                <div className="absolute inset-0 opacity-5"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                        backgroundSize: '50px 50px'
                    }}
                />

                <div className="relative z-10 flex flex-col justify-center px-16 text-white">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                            <Brain className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">TalentSphere AI</h1>
                            <p className="text-sm text-violet-300">Intelligent HR Management</p>
                        </div>
                    </div>

                    <h2 className="text-4xl font-bold leading-tight mb-4">
                        Transform Your HR<br />
                        <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                            With AI Intelligence
                        </span>
                    </h2>
                    <p className="text-lg text-slate-300 mb-10 max-w-md">
                        Automate recruitment, streamline employee management, and unlock workforce insights with cutting-edge AI technology.
                    </p>

                    <div className="space-y-4">
                        {[
                            { icon: "🤖", text: "AI-Powered Resume Screening & Ranking" },
                            { icon: "📊", text: "Real-Time Analytics Dashboard" },
                            { icon: "💬", text: "Smart HR Chatbot Assistant" },
                            { icon: "🎯", text: "Attrition Risk Prediction" },
                        ].map((feature, i) => (
                            <div key={i} className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/10">
                                <span className="text-xl">{feature.icon}</span>
                                <span className="text-sm text-slate-200">{feature.text}</span>
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
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                            <Brain className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-xl font-bold">TalentSphere AI</h1>
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

                    <p className="text-sm text-muted-foreground text-center">
                        Looking to apply? <Link href="/careers" className="text-violet-400 hover:text-violet-300">Visit the Career Portal</Link>
                    </p>

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
