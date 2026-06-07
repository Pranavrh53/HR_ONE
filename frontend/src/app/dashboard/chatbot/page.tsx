"use client";

import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ChatbotPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-blue-400" />
                    HR Chatbot
                    <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30 text-xs">AI Powered</Badge>
                </h1>
                <p className="text-muted-foreground mt-1">AI-powered assistant for HR queries and employee support</p>
            </div>

            <Card className="border-border/50 border-dashed">
                <CardContent className="py-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                        <Brain className="w-8 h-8 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">HR AI Assistant</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                        The HR chatbot will be powered by Gemini API to answer leave queries, payroll questions, HR policies, and employee information.
                    </p>
                    <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">💬 Leave Queries</span>
                        <span className="flex items-center gap-1">💰 Payroll Info</span>
                        <span className="flex items-center gap-1">📋 HR Policies</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4 italic">Coming in Phase 2 — AI Service integration</p>
                </CardContent>
            </Card>
        </div>
    );
}
