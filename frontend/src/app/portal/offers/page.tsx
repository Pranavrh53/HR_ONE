"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, CheckCircle, XCircle, FileText, Briefcase, CalendarDays, Building2 } from "lucide-react";

const statusColors: Record<string, string> = {
    generated: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    sent: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    accepted: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    declined: "bg-red-500/10 text-red-400 border-red-500/30",
};

export default function OffersPage() {
    const [offers, setOffers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);

    const fetchOffers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/careers/my-offers');
            setOffers(res.data.data || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOffers(); }, []);

    const respond = async (offerId: string, response: 'accepted' | 'declined') => {
        setBusyId(offerId);
        try {
            await api.post(`/careers/offers/${offerId}/respond`, { response });
            await fetchOffers();
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <FileText className="w-6 h-6 text-violet-400" /> Offers
                </h1>
                <p className="text-muted-foreground text-sm mt-1">Review your offer letter, download the PDF, and accept or decline from one place.</p>
            </div>

            {loading ? (
                <div className="space-y-4">{[1, 2].map(i => <div key={i} className="h-48 rounded-2xl bg-muted/30 animate-pulse" />)}</div>
            ) : offers.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border/50 rounded-2xl text-muted-foreground space-y-3">
                    <Building2 className="w-12 h-12 mx-auto opacity-30" />
                    <p className="font-medium">No offers yet</p>
                    <p className="text-sm">Your offers will appear here once HR selects you.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {offers.map((offer) => (
                        <Card key={offer.offer?._id || offer._id} className="border-border/50">
                            <CardHeader className="pb-3">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Briefcase className="w-5 h-5 text-violet-400" />
                                            {offer.job?.title || "Offer Letter"}
                                        </CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">{offer.job?.department} · {offer.job?.location}</p>
                                    </div>
                                    <Badge className={`text-xs border ${statusColors[offer.offer?.status] || statusColors.generated}`}>
                                        {offer.offer?.status || 'generated'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                    <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                                        <p className="text-xs text-muted-foreground mb-1">Salary</p>
                                        <p className="font-semibold">₹{Number(offer.offer?.salary || 0).toLocaleString('en-IN')}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                                        <p className="text-xs text-muted-foreground mb-1">Joining Date</p>
                                        <p className="font-semibold">{offer.offer?.joiningDate ? new Date(offer.offer.joiningDate).toLocaleDateString('en-IN') : 'To be confirmed'}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                                        <p className="text-xs text-muted-foreground mb-1">Reporting Manager</p>
                                        <p className="font-semibold">{offer.offer?.reportingManager || 'TBD'}</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    {offer.offer?.fileUrl && (
                                        <a href={offer.offer.fileUrl} download className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-violet-500/30 text-violet-400 hover:bg-violet-500/10 transition-all text-sm font-medium">
                                            <Download className="w-4 h-4" /> Download PDF
                                        </a>
                                    )}
                                    {(offer.offer?.status === 'generated' || offer.offer?.status === 'sent') && (
                                        <>
                                            <Button onClick={() => respond(offer.offer._id, 'accepted')} disabled={busyId === offer.offer._id} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                                <CheckCircle className="w-4 h-4 mr-2" /> Accept Offer
                                            </Button>
                                            <Button onClick={() => respond(offer.offer._id, 'declined')} disabled={busyId === offer.offer._id} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                                                <XCircle className="w-4 h-4 mr-2" /> Decline Offer
                                            </Button>
                                        </>
                                    )}
                                </div>

                                {offer.onboardingStatus && (
                                    <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-sm text-cyan-300 flex items-center gap-2">
                                        <CalendarDays className="w-4 h-4" />
                                        Onboarding status: <span className="font-semibold capitalize">{offer.onboardingStatus.replaceAll('_', ' ')}</span>
                                    </div>
                                )}

                                {offer.hiringDecision?.classification && (
                                    <p className="text-xs text-muted-foreground">Final classification: <span className="font-semibold text-foreground">{offer.hiringDecision.classification}</span> · Final score: <span className="font-semibold text-foreground">{offer.hiringScore}/100</span></p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}