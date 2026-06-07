"use client";

interface BreakdownItem {
    category: string;
    score: number;
    max: number;
    note?: string;
}

export default function ScoreBreakdown({
    items,
    totalScore,
}: {
    items: BreakdownItem[];
    totalScore?: number;
}) {
    if (!items?.length) return null;

    const barColor = (pct: number) =>
        pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-blue-500" : pct >= 30 ? "bg-amber-500" : "bg-red-500";

    return (
        <div className="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-4">
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Suitability Score Breakdown
                </p>
                {totalScore != null && (
                    <p className="text-sm font-bold text-violet-400">{totalScore}/100</p>
                )}
            </div>
            <div className="space-y-2.5">
                {items.map((item, i) => {
                    const pct = item.max > 0 ? Math.round((item.score / item.max) * 100) : 0;
                    return (
                        <div key={i} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-medium text-foreground">{item.category}</span>
                                <span className="text-muted-foreground tabular-nums">
                                    {Math.round(item.score * 10) / 10}/{item.max}
                                </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${barColor(pct)}`}
                                    style={{ width: `${Math.min(100, pct)}%` }}
                                />
                            </div>
                            {item.note && (
                                <p className="text-[10px] text-muted-foreground leading-snug">{item.note}</p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
