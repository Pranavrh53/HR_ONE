"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Brain, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";

export default function ResetPasswordPage() {
    const { token } = useParams() as { token: string };
    const router = useRouter();
    const { login } = useAuth();

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirm) return setError("Passwords do not match");
        setError(""); setLoading(true);
        try {
            await api.put(`/auth/reset-password/${token}`, { password });
            setDone(true);
            setTimeout(() => router.push("/login"), 2000);
        } catch (err: any) {
            setError(err.response?.data?.message || "Reset failed — link may be expired");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                        <Brain className="w-6 h-6 text-white" />
                    </div>
                    <span className="font-bold text-lg">TalentSphere AI</span>
                </div>

                {done ? (
                    <div className="text-center py-8 space-y-3">
                        <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto" />
                        <h2 className="text-xl font-bold">Password Reset!</h2>
                        <p className="text-muted-foreground text-sm">Redirecting to login...</p>
                    </div>
                ) : (
                    <>
                        <div>
                            <h1 className="text-2xl font-bold">Set New Password</h1>
                            <p className="text-muted-foreground text-sm mt-1">Enter and confirm your new password.</p>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">{error}</div>}
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input type={showPw ? "text" : "password"} placeholder="New password" required value={password} onChange={e => setPassword(e.target.value)}
                                    className="w-full h-11 pl-9 pr-10 rounded-lg bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input type="password" placeholder="Confirm new password" required value={confirm} onChange={e => setConfirm(e.target.value)}
                                    className="w-full h-11 pl-9 pr-3 rounded-lg bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                            </div>
                            <button type="submit" disabled={loading}
                                className="w-full py-3 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-xl font-medium disabled:opacity-60">
                                {loading ? "Resetting..." : "Reset Password"}
                            </button>
                        </form>
                    </>
                )}
                <Link href="/login" className="block text-sm text-muted-foreground hover:text-foreground text-center">← Back to login</Link>
            </div>
        </div>
    );
}
