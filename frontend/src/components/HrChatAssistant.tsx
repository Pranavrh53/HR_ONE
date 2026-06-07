"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { Brain, Send, User, Bot, Sparkles, MessageSquare, Clock, ShieldCheck, ChevronRight, X, Mic } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";

interface Message {
    id: string;
    text: string;
    sender: "user" | "bot";
    timestamp: Date;
}

const quickActions = [
    { label: "Leave Policy", icon: Clock },
    { label: "Payroll Help", icon: MessageSquare },
    { label: "Application Status", icon: ShieldCheck },
    { label: "Interview Help", icon: Mic },
    { label: "Onboarding Help", icon: Sparkles },
    { label: "Company Policies", icon: Brain },
];

export default function HrChatAssistant() {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            text: `Hello ${user?.name}! I'm your TalentSphere AI Assistant. How can I help you today?`,
            sender: "bot",
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (text: string = input) => {
        if (!text.trim() || loading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text,
            sender: "user",
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const res = await api.post("/hr-chat", { message: text });
            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: res.data.reply,
                sender: "bot",
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                text: "HR Assistant is temporarily unavailable. Please try again later.",
                sender: "bot",
                timestamp: new Date(),
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm relative">
            {/* Header */}
            <div className="p-4 border-b border-border/60 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-100 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-white dark:text-slate-900" />
                    </div>
                    <div>
                        <h2 className="font-bold text-sm text-foreground">TalentSphere Support</h2>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Internal Virtual Assistant</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth bg-white dark:bg-slate-950">
                {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`flex items-end gap-2 max-w-[85%] ${m.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>
                            <div className={`
                                p-3 text-sm rounded-xl
                                ${m.sender === "user"
                                    ? "bg-slate-900 text-white rounded-tr-none"
                                    : "bg-slate-100 dark:bg-slate-800 text-foreground rounded-tl-none border border-border"
                                }
                            `}>
                                {m.text}
                                <p className={`text-[10px] mt-1.5 ${m.sender === "user" ? "text-slate-400" : "text-muted-foreground"}`}>
                                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex items-start gap-2">
                        <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl rounded-tl-none border border-border flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" />
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:0.2s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:0.4s]" />
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Actions (Floating) */}
            {messages.length < 5 && (
                <div className="px-4 pb-2 bg-white dark:bg-slate-950">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 ml-1">Suggested Inquiries</p>
                    <div className="flex flex-wrap gap-2">
                        {quickActions.map(action => (
                            <button
                                key={action.label}
                                onClick={() => handleSend(action.label)}
                                disabled={loading}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-50 dark:bg-slate-900 border border-border hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-all active:scale-95 disabled:opacity-50"
                            >
                                <action.icon className="w-3 h-3 text-slate-500" />
                                {action.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-border bg-slate-50 dark:bg-slate-900">
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex items-center gap-2 bg-white dark:bg-slate-950 border border-border p-1 rounded-lg"
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-3 h-10"
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="w-10 h-10 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center transition-all disabled:opacity-50 active:scale-95"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
                <p className="text-[10px] text-center text-muted-foreground mt-3 uppercase tracking-widest font-semibold">
                    TalentSphere Enterprise Virtual Assistant
                </p>
            </div>
        </div>
    );
}
