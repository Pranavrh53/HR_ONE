"use client";

import HrChatAssistant from "@/components/HrChatAssistant";

export default function DashboardChatPage() {
    return (
        <div className="max-w-5xl mx-auto space-y-4 h-full">
            <div className="flex flex-col gap-1 px-1">
                <h1 className="text-2xl font-bold tracking-tight">Support Assistant</h1>
                <p className="text-sm text-muted-foreground">Quick help with company policies, payroll, and benefits.</p>
            </div>
            <HrChatAssistant />
        </div>
    );
}
