"use client";

import HrChatAssistant from "@/components/HrChatAssistant";

export default function CandidateChatPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight">HR Assistant</h1>
                <p className="text-sm text-muted-foreground">Instant support for your applications, interviews, and company FAQs.</p>
            </div>
            <HrChatAssistant />
        </div>
    );
}
