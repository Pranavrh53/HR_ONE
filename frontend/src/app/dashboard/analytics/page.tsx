"use client";

import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-emerald-400" />
                    Analytics Dashboard
                </h1>
                <p className="text-muted-foreground mt-1">Company-wide workforce analytics and insights</p>
            </div>

            <Card className="border-border/50 border-dashed">
                <CardContent className="py-16 text-center">
                    <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Analytics Dashboard</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Workforce analytics including hiring trends, attendance patterns, payroll statistics, and attrition reports will be available in Phase 2.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
