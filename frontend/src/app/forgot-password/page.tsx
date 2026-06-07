"use client";
import { useState } from "react";
import api from "@/lib/api";
import Link from "next/link";
import { Brain, Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [resetUrl, setResetUrl] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(""); setLoading(true);
        try {
            const res = await api.post("/auth/forgot-password", { email });
            setResetUrl(res.data.resetUrl || "");
            setSent(true);
        } catch (err: any) {
            setError(err.response?.data?.message || "Something went wrong");
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

                {!sent ? (
                    <>
                        <div>
                            <h1 className="text-2xl font-bold">Forgot Password</h1>
                            <p className="text-muted-foreground text-sm mt-1">Enter your email to receive a reset link.</p>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">{error}</div>}
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input type="email" placeholder="your@email.com" required value={email} onChange={e => setEmail(e.target.value)}
                                    className="w-full h-11 pl-9 pr-3 rounded-lg bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                            </div>
                            <button type="submit" disabled={loading}
                                className="w-full py-3 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-xl font-medium disabled:opacity-60">
                                {loading ? "Sending..." : "Send Reset Link"}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="text-center space-y-4 py-6">
                        <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto" />
                        <h2 className="text-xl font-bold">Reset Link Sent!</h2>
                        <p className="text-muted-foreground text-sm">Check your email for the password reset link.</p>
                        {/* Dev-only: show the link directly */}
                        {resetUrl && (
                            <div className="p-3 bg-muted/30 rounded-lg text-left text-xs text-muted-foreground break-all">
                                <p className="font-medium text-foreground mb-1">Development mode — reset link:</p>
                                <Link href={resetUrl} className="text-violet-400 hover:underline">{resetUrl}</Link>
                            </div>
                        )}
                    </div>
                )}

                <Link href="/login" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-4 h-4" /> Back to login
                </Link>
            </div>
        </div>
    );
}
