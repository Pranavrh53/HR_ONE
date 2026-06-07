"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Brain, Loader2 } from "lucide-react";

export default function CandidateCompareModal({
    open,
    onClose,
    loading,
    report,
}: {
    open: boolean;
    onClose: () => void;
    loading: boolean;
    report: any;
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60" onClick={onClose} />
            <div className="relative z-50 w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-popover rounded-xl border border-border shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Brain className="w-5 h-5 text-violet-400" /> AI Candidate Comparison
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded-md"><X className="w-4 h-4" /></button>
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin" /> Generating comparison report...
                    </div>
                )}

                {!loading && report && (
                    <div className="space-y-4">
                        {report.comparison_summary && (
                            <p className="text-sm text-muted-foreground">{report.comparison_summary}</p>
                        )}
                        <div className="grid gap-3">
                            {[
                                { label: "Best Technical Fit", data: report.best_technical_fit },
                                { label: "Best Project Portfolio", data: report.best_project_portfolio },
                                { label: "Best Experience Match", data: report.best_experience_match },
                            ].map((item) => item.data && (
                                <Card key={item.label} className="border-border/50">
                                    <CardContent className="p-4">
                                        <p className="text-xs font-semibold text-violet-400">{item.label}</p>
                                        <p className="text-sm font-medium mt-1">{item.data.name}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{item.data.reason}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                        {report.final_recommendation && (
                            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <p className="text-xs font-semibold text-emerald-400">Final Recommendation</p>
                                <p className="text-sm mt-1">{report.final_recommendation}</p>
                            </div>
                        )}
                        {report.ranking_rationale?.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold mb-2">Ranking Rationale</p>
                                <ul className="space-y-1">
                                    {report.ranking_rationale.map((r: string, i: number) => (
                                        <li key={i} className="text-xs text-muted-foreground">• {r}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                <Button variant="outline" className="w-full mt-4" onClick={onClose}>Close</Button>
            </div>
        </div>
    );
}
