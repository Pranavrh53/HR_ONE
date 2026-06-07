"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Mic, MicOff, Send, CheckCircle, Clock, Volume2, AlertCircle, ChevronRight, Brain, RefreshCw } from "lucide-react";

type Phase = "loading" | "ready" | "speaking" | "listening" | "processing" | "followup" | "completed";

function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
    const r = (size / 2) - 6;
    const circ = 2 * Math.PI * r;
    const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5"
                strokeLinecap="round" strokeDasharray={`${(score / 100) * circ} ${circ}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
            <text x="50%" y="53%" textAnchor="middle" dominantBaseline="middle" fill={color} fontSize="11" fontWeight="bold">{score}</text>
        </svg>
    );
}

export default function CandidateInterviewRoom({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    const router = useRouter();

    const [phase, setPhase] = useState<Phase>("loading");
    const [sessionData, setSessionData] = useState<any>(null);
    const [questions, setQuestions] = useState<string[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [transcript, setTranscript] = useState("");
    const [interimText, setInterimText] = useState("");
    const [answers, setAnswers] = useState<{ question: string; answer: string; score?: number }[]>([]);
    const [timer, setTimer] = useState(0);
    const [totalTimer, setTotalTimer] = useState(0);
    const [finalResult, setFinalResult] = useState<any>(null);
    const [error, setError] = useState("");

    const recognitionRef = useRef<any>(null);
    const listeningRef = useRef(false); // Tracks active listening outside React closures
    const synthRef = useRef<SpeechSynthesis | null>(null);
    const timerRef = useRef<any>(null);
    const totalTimerRef = useRef<any>(null);

    // Load session on mount
    useEffect(() => {
        api.get(`/careers/interview/${token}`)
            .then(res => {
                const data = res.data.data;
                setSessionData(data);
                if (data.status === "completed") {
                    setPhase("completed");
                } else {
                    setQuestions(data.questions || []);
                    setPhase("ready");
                }
            })
            .catch(() => setError("Interview not found or link expired."));
    }, [token]);

    // Total timer
    useEffect(() => {
        if (phase !== "ready" && phase !== "speaking" && phase !== "listening" && phase !== "processing" && phase !== "followup") return;
        totalTimerRef.current = setInterval(() => setTotalTimer(t => t + 1), 1000);
        return () => clearInterval(totalTimerRef.current);
    }, [phase]);

    // Per-question timer while listening
    useEffect(() => {
        if (phase === "listening") {
            setTimer(0);
            timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [phase]);

    const speak = (text: string, onEnd?: () => void) => {
        if (!window.speechSynthesis) { onEnd?.(); return; }
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.rate = 0.95; utt.pitch = 1.05; utt.volume = 1;
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v => v.lang.startsWith("en") && v.name.toLowerCase().includes("female")) || voices.find(v => v.lang.startsWith("en"));
        if (preferred) utt.voice = preferred;
        utt.onend = () => onEnd?.();
        window.speechSynthesis.speak(utt);
    };

    const startListening = () => {
        setTranscript(""); setInterimText("");
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) { setError("Speech recognition not supported. Please use Chrome."); return; }

        // Stop any previous instance fully
        listeningRef.current = false;
        if (recognitionRef.current) {
            try { recognitionRef.current.onend = null; recognitionRef.current.stop(); } catch (e) { }
            recognitionRef.current = null;
        }

        // Factory to create and wire up a fresh recognition instance
        const createAndStart = () => {
            const r = new SR();
            r.continuous = true;
            r.interimResults = true;
            r.lang = "en-US";

            r.onresult = (e: any) => {
                let final = ""; let interim = "";
                for (let i = e.resultIndex; i < e.results.length; i++) {
                    const text = e.results[i][0].transcript;
                    if (e.results[i].isFinal) final += text + " ";
                    else interim += text;
                }
                if (final) setTranscript(prev => (prev + final).trim() + " ");
                setInterimText(interim);
            };

            r.onerror = () => {
                // Let onend handle restarts for all errors
            };

            r.onend = () => {
                if (listeningRef.current) {
                    // Auto-restart after a pause
                    setTimeout(() => {
                        if (listeningRef.current) {
                            createAndStart();
                        }
                    }, 300);
                }
            };

            try {
                r.start();
                recognitionRef.current = r;
            } catch (err) {
                console.warn("Mic start failed, retrying in 1s...");
                setTimeout(() => {
                    if (listeningRef.current) createAndStart();
                }, 1000);
            }
        };

        // Delay start slightly to let browser release previous mic
        setTimeout(() => {
            listeningRef.current = true;
            setPhase("listening");
            createAndStart();
        }, 400);
    };

    const stopListening = () => {
        listeningRef.current = false;
        if (recognitionRef.current) {
            try {
                recognitionRef.current.onend = null;
                recognitionRef.current.stop();
            } catch (e) { }
            recognitionRef.current = null;
        }
        setInterimText("");
    };

    const restartMic = () => {
        stopListening();
        setTimeout(() => {
            listeningRef.current = true;
            setPhase("listening");
            const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SR) return;
            const r = new SR();
            r.continuous = true; r.interimResults = true; r.lang = "en-US";
            r.onresult = (e: any) => {
                let final = ""; let interim = "";
                for (let i = e.resultIndex; i < e.results.length; i++) {
                    const text = e.results[i][0].transcript;
                    if (e.results[i].isFinal) final += text + " ";
                    else interim += text;
                }
                if (final) setTranscript(prev => (prev + final).trim() + " ");
                setInterimText(interim);
            };
            r.onerror = () => { };
            r.onend = () => {
                if (listeningRef.current) {
                    setTimeout(() => { if (listeningRef.current) restartMic(); }, 300);
                }
            };
            try { r.start(); recognitionRef.current = r; } catch (e) { }
        }, 500);
    };

    const askQuestion = (idx: number, questionOverride?: string) => {
        const q = questionOverride || questions[idx] || "";
        setPhase("speaking");
        speak(q, () => startListening());
    };

    const handleStart = async () => {
        try {
            // Explicitly request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop()); // Just checking permission

            api.post(`/careers/interview/${token}/start`).catch(() => { });

            // Activate audio context via dummy silence (required by some browsers)
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
                const silent = new SpeechSynthesisUtterance("");
                window.speechSynthesis.speak(silent);
            }

            askQuestion(0);
        } catch (err) {
            setError("Could not access microphone. Please ensure you have granted microphone permissions in your browser and try again.");
        }
    };

    const handleSubmitAnswer = async () => {
        if (!transcript.trim()) return;
        stopListening();
        setPhase("processing");

        const currentQ = questions[currentIdx];
        const ans = transcript.trim();

        try {
            const evalRes = await api.post(`/careers/interview/${token}/evaluate-answer`, {
                question: currentQ, answer: ans, questionType: "technical",
            });
            const evaluation = evalRes.data.data || evalRes.data;
            const score = Math.round((evaluation.technical_score + evaluation.communication_score + evaluation.clarity_score + evaluation.relevance_score) / 4) || 0;

            setAnswers(prev => [...prev, { question: currentQ, answer: ans, score }]);

            const nextIdx = currentIdx + 1;
            if (nextIdx >= questions.length) {
                await finishInterview([...answers, { question: currentQ, answer: ans, score }]);
            } else {
                setCurrentIdx(nextIdx);
                setTranscript("");
                askQuestion(nextIdx);
            }
        } catch {
            setPhase("listening");
        }
    };

    const finishInterview = async (allAnswers: any[]) => {
        setPhase("processing");
        try {
            const res = await api.post(`/careers/interview/${token}/finish`);
            setFinalResult(res.data.data);
            setPhase("completed");
        } catch {
            setPhase("completed");
        }
    };

    const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

    if (error) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center space-y-4 max-w-md">
                    <AlertCircle className="w-14 h-14 text-red-400 mx-auto" />
                    <h2 className="text-xl font-bold">Interview Error</h2>
                    <p className="text-muted-foreground text-sm">{error}</p>
                    <button onClick={() => router.push("/portal/interviews")} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm">← Go Back</button>
                </div>
            </div>
        );
    }

    if (phase === "completed") {
        const score = finalResult?.finalScore || 0;
        const rec = finalResult?.report?.recommendation || finalResult?.data?.recommendation || "";
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="w-24 h-24 mx-auto">
                        <ScoreRing score={score} size={96} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Interview Complete! 🎉</h2>
                        <p className="text-muted-foreground text-sm mt-1">You answered {answers.length} questions in {fmt(totalTimer)}</p>
                    </div>
                    {rec && (
                        <div className={`px-4 py-2 rounded-full inline-block text-sm font-medium border ${rec === "Strong Hire" || rec === "Hire" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            }`}>{rec}</div>
                    )}
                    <p className="text-sm text-muted-foreground">The HR team will review your results. You'll be notified of the next steps.</p>
                    <button onClick={() => router.push("/portal")} className="w-full py-3 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-xl font-medium">
                        Return to Portal
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/80 backdrop-blur">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                        <Brain className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="font-semibold text-sm">{sessionData?.jobTitle || "AI Interview"}</p>
                        <p className="text-xs text-slate-400">{sessionData?.candidateName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-sm font-mono text-slate-300 flex items-center gap-1">
                        <Clock className="w-4 h-4" /> {fmt(totalTimer)}
                    </div>
                    {questions.length > 0 && (
                        <span className="text-xs text-slate-400">Q {Math.min(currentIdx + 1, questions.length)}/{questions.length}</span>
                    )}
                </div>
            </header>

            {/* Progress bar */}
            {questions.length > 0 && (
                <div className="h-1 bg-slate-800">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all"
                        style={{ width: `${((currentIdx) / questions.length) * 100}%` }} />
                </div>
            )}

            {/* Main */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 max-w-2xl mx-auto w-full">

                {/* Ready screen */}
                {phase === "loading" && (
                    <div className="text-center space-y-4">
                        <div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto" />
                        <p className="text-slate-400">Loading your interview...</p>
                    </div>
                )}

                {phase === "ready" && (
                    <div className="text-center space-y-6">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center mx-auto shadow-xl shadow-violet-500/30">
                            <Mic className="w-10 h-10" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">Ready to Start?</h2>
                            <p className="text-slate-400 text-sm mt-2">{questions.length} questions · ~15 minutes · Voice-based</p>
                        </div>
                        <ul className="text-left text-sm text-slate-300 space-y-2 bg-white/5 rounded-xl p-4 border border-white/10">
                            <li>🎙 Allow microphone when prompted</li>
                            <li>🔊 The AI will speak each question</li>
                            <li>🎤 Speak clearly into your microphone</li>
                            <li>✅ Click "Submit Answer" when done</li>
                        </ul>
                        <button onClick={handleStart} className="px-8 py-3.5 bg-gradient-to-r from-violet-600 to-blue-600 rounded-xl text-white font-bold text-lg shadow-xl shadow-violet-500/30 hover:scale-105 transition-transform flex items-center gap-2 mx-auto">
                            <Mic className="w-5 h-5" /> Start Interview
                        </button>
                    </div>
                )}

                {/* Active interview */}
                {(phase === "speaking" || phase === "listening" || phase === "processing" || phase === "followup") && (
                    <div className="w-full space-y-6">
                        {/* AI speaking orb */}
                        <div className="flex flex-col items-center gap-4">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${phase === "speaking" ? "bg-blue-500/30 ring-4 ring-blue-500/50 animate-pulse" :
                                phase === "listening" ? "bg-violet-500/30 ring-4 ring-violet-500/50" :
                                    "bg-slate-800/50"
                                }`}>
                                {phase === "speaking" ? <Volume2 className="w-9 h-9 text-blue-400" /> :
                                    phase === "listening" ? <Mic className="w-9 h-9 text-violet-400" /> :
                                        <div className="w-6 h-6 border-3 border-slate-500/30 border-t-slate-300 rounded-full animate-spin" />}
                            </div>
                            <p className="text-sm text-slate-400">
                                {phase === "speaking" ? "AI is asking..." : phase === "listening" ? `Listening · ${fmt(timer)}` : "Processing..."}
                            </p>
                        </div>

                        {/* Current question */}
                        <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                            <p className="text-xs text-violet-300 mb-2 font-medium">Question {currentIdx + 1}</p>
                            <p className="text-lg font-medium leading-relaxed">{questions[currentIdx]}</p>
                        </div>

                        {/* Transcript / Manual Input */}
                        {(phase === "listening") && (
                            <div className="w-full space-y-2">
                                <p className="text-xs text-slate-400">Your answer (you can also type/edit here):</p>
                                <textarea
                                    value={transcript}
                                    onChange={(e) => setTranscript(e.target.value)}
                                    placeholder="Start speaking, or type your answer here if your mic is having issues..."
                                    className="w-full h-32 p-4 rounded-xl bg-slate-900 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none"
                                />
                                {interimText && <p className="text-sm text-slate-500 italic px-1">{interimText}</p>}
                            </div>
                        )}

                        {/* Controls */}
                        {phase === "listening" && (
                            <div className="space-y-2">
                                <div className="flex gap-3">
                                    <button onClick={restartMic} className="py-3 px-4 rounded-xl border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 text-sm flex items-center justify-center gap-2">
                                        <RefreshCw className="w-4 h-4" /> Restart Mic
                                    </button>
                                    <button onClick={handleSubmitAnswer} disabled={!transcript.trim()}
                                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40">
                                        <Send className="w-4 h-4" /> Submit Answer
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-500 text-center">Mic not working? Click "Restart Mic" or type your answer directly above.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Answer history */}
            {answers.length > 0 && (phase === "speaking" || phase === "listening" || phase === "processing") && (
                <div className="px-6 pb-6 max-w-2xl mx-auto w-full">
                    <p className="text-xs text-slate-500 mb-2">{answers.length} answer{answers.length !== 1 ? "s" : ""} submitted</p>
                    <div className="flex gap-2">
                        {answers.map((a, i) => (
                            <div key={i} className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                                <CheckCircle className="w-3 h-3 text-emerald-400" />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
