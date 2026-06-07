"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { Brain, Mic, MicOff, Volume2, CheckCircle, Clock, ChevronRight, BarChart3 } from "lucide-react";

type InterviewPhase = "waiting" | "ai_speaking" | "listening" | "processing" | "completed";

interface Answer {
    question: string;
    answer: string;
    scores?: { technical: number; communication: number; clarity: number; relevance: number; feedback: string };
}

export default function InterviewPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params.sessionId as string;

    const [session, setSession] = useState<any>(null);
    const [questions, setQuestions] = useState<string[]>([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [phase, setPhase] = useState<InterviewPhase>("waiting");
    const [transcript, setTranscript] = useState("");
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [timeLeft, setTimeLeft] = useState(900); // 15 minutes
    const [aiMessage, setAiMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [currentFollowUp, setCurrentFollowUp] = useState<string | null>(null);
    const [questionCount, setQuestionCount] = useState(0);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const recognitionRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesis | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const isActive = useRef(false);

    // Load session data
    useEffect(() => {
        api.get(`/interview/report/${sessionId}`)
            .then(res => {
                const s = res.data.data;
                setSession(s);
                setQuestions(s.questions || []);
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    }, [sessionId]);

    // Timer
    useEffect(() => {
        if (phase === "completed") return;
        if (phase === "waiting") return;
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) { handleFinish(); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [phase]);

    const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    // Speak text using browser TTS
    const speak = useCallback((text: string): Promise<void> => {
        return new Promise((resolve) => {
            if (typeof window === 'undefined') { resolve(); return; }
            window.speechSynthesis.cancel();
            const utt = new SpeechSynthesisUtterance(text);
            utt.rate = 0.92;
            utt.pitch = 1.05;
            utt.lang = 'en-US';
            const voices = window.speechSynthesis.getVoices();
            const preferred = voices.find(v => v.name.includes('Google') && v.lang === 'en-US') || voices.find(v => v.lang === 'en-US');
            if (preferred) utt.voice = preferred;
            utt.onstart = () => setIsSpeaking(true);
            utt.onend = () => { setIsSpeaking(false); resolve(); };
            utt.onerror = () => { setIsSpeaking(false); resolve(); };
            window.speechSynthesis.speak(utt);
        });
    }, []);

    // Start voice recognition
    const startListening = useCallback(() => {
        if (typeof window === 'undefined') return;
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) { alert("Your browser doesn't support speech recognition. Please use Chrome."); return; }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognitionRef.current = recognition;

        let finalTranscript = '';

        recognition.onresult = (e: any) => {
            let interim = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript + ' ';
                else interim += e.results[i][0].transcript;
            }
            setTranscript(finalTranscript + interim);
        };

        recognition.onend = () => {
            if (isActive.current) recognition.start();
        };

        recognition.start();
        setPhase("listening");
        setTranscript('');
    }, []);

    const stopListening = useCallback(() => {
        isActive.current = false;
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
    }, []);

    // Ask a question
    const askQuestion = useCallback(async (question: string) => {
        setPhase("ai_speaking");
        setAiMessage(question);
        window.speechSynthesis.cancel();
        await speak(question);
        setPhase("listening");
        isActive.current = true;
        startListening();
    }, [speak, startListening]);

    // Start the interview
    const startInterview = useCallback(async () => {
        if (!session || questions.length === 0) return;
        setPhase("ai_speaking");

        const intro = `Hello ${session.candidateName}. Welcome to your AI-powered interview for the ${session.jobTitle} position. I am your AI interviewer today. We will go through about 8 questions. Take your time with each answer, and speak clearly. Let's begin!`;
        setAiMessage(intro);
        await speak(intro);
        await askQuestion(questions[0]);
        setCurrentQIndex(0);
        setQuestionCount(1);
    }, [session, questions, speak, askQuestion]);

    // Submit current answer and move to next question
    const submitAnswer = useCallback(async () => {
        stopListening();
        setPhase("processing");
        const currentQuestion = currentFollowUp || questions[currentQIndex];
        const currentAnswer = transcript.trim();

        if (!currentAnswer) {
            setTranscript('');
            setCurrentFollowUp(null);
            await askQuestion(questions[currentQIndex + 1] || "");
            setCurrentQIndex(prev => prev + 1);
            return;
        }

        try {
            // Evaluate answer in background
            const evalRes = await api.post('/interview/evaluate-answer', {
                sessionId,
                question: currentQuestion,
                answer: currentAnswer,
            });

            const newAnswer: Answer = {
                question: currentQuestion,
                answer: currentAnswer,
                scores: {
                    technical: evalRes.data.data?.technical_score || 0,
                    communication: evalRes.data.data?.communication_score || 0,
                    clarity: evalRes.data.data?.clarity_score || 0,
                    relevance: evalRes.data.data?.relevance_score || 0,
                    feedback: evalRes.data.data?.feedback || '',
                }
            };
            setAnswers(prev => [...prev, newAnswer]);

            // Every 2 questions, generate a follow-up; otherwise go to next question
            const nextIndex = currentQIndex + 1;
            const totalAsked = questionCount + 1;
            setQuestionCount(totalAsked);

            if (totalAsked >= 10 || nextIndex >= questions.length) {
                await handleFinish();
                return;
            }

            setTranscript('');
            setCurrentFollowUp(null);

            // 50% chance of asking a follow-up for richer conversation
            if (totalAsked % 2 === 0 && currentAnswer.length > 50) {
                const fuRes = await api.post('/interview/next-question', {
                    sessionId,
                    lastQuestion: currentQuestion,
                    lastAnswer: currentAnswer,
                });
                const followUp = fuRes.data?.data?.followUp;
                if (followUp) {
                    setCurrentFollowUp(followUp);
                    await askQuestion(followUp);
                    return;
                }
            }

            setCurrentQIndex(nextIndex);
            await askQuestion(questions[nextIndex]);
        } catch (err) {
            console.error(err);
            setPhase("listening");
            isActive.current = true;
            startListening();
        }
    }, [transcript, currentQIndex, questions, questionCount, currentFollowUp, sessionId, stopListening, askQuestion, startListening]);

    // Finish interview
    const handleFinish = useCallback(async () => {
        stopListening();
        window.speechSynthesis.cancel();
        setPhase("completed");
        if (timerRef.current) clearInterval(timerRef.current);

        setAiMessage("Thank you for completing the interview! You did great. Your responses are being analyzed...");
        await speak("Thank you for completing the interview. Your responses are being analyzed. Please wait for the results.");

        await api.post('/interview/finish', { sessionId });
        router.push(`/dashboard/interview/report/${sessionId}`);
    }, [sessionId, stopListening, speak, router]);

    if (isLoading) return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="text-center space-y-4">
                <div className="w-12 h-12 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto" />
                <p className="text-white/60">Loading interview session...</p>
            </div>
        </div>
    );

    const progress = Math.min((questionCount / 8) * 100, 100);

    return (
        <div className="min-h-screen bg-black text-white flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Header */}
            <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center">
                        <Brain className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold">AI Interview · {session?.jobTitle}</p>
                        <p className="text-xs text-white/50">{session?.candidateName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {phase !== "waiting" && phase !== "completed" && (
                        <div className="flex items-center gap-2 text-sm text-white/60">
                            <Clock className="w-4 h-4" />
                            <span className={timeLeft < 120 ? "text-red-400" : ""}>{formatTime(timeLeft)}</span>
                        </div>
                    )}
                    <div className="text-xs text-white/40">Q {questionCount}/8</div>
                </div>
            </header>

            {/* Progress Bar */}
            <div className="h-1 bg-white/5">
                <div className="h-full bg-gradient-to-r from-violet-600 to-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-8 max-w-2xl mx-auto w-full">

                {/* AI Avatar */}
                <div className="relative">
                    <div className={`w-28 h-28 rounded-full flex items-center justify-center ${isSpeaking ? 'bg-violet-600/30 ring-4 ring-violet-500/50 animate-pulse' : 'bg-white/5 ring-1 ring-white/10'} transition-all duration-300`}>
                        <Brain className="w-12 h-12 text-violet-400" />
                    </div>
                    {isSpeaking && (
                        <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-violet-600 rounded-full flex items-center justify-center">
                            <Volume2 className="w-3.5 h-3.5" />
                        </div>
                    )}
                </div>

                {/* AI Message */}
                {aiMessage && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center max-w-lg">
                        <p className="text-sm leading-relaxed text-white/90">{aiMessage}</p>
                    </div>
                )}

                {/* Phase-specific UI */}
                {phase === "waiting" && (
                    <div className="text-center space-y-4">
                        <p className="text-white/50 text-sm">Ready to begin? Make sure you're in a quiet place.</p>
                        <button
                            onClick={startInterview}
                            className="px-8 py-3 bg-violet-600 hover:bg-violet-700 rounded-xl font-medium flex items-center gap-2 mx-auto transition-colors"
                        >
                            <Brain className="w-4 h-4" /> Start Interview
                        </button>
                    </div>
                )}

                {phase === "ai_speaking" && (
                    <div className="flex items-center gap-3 text-white/40 text-sm">
                        <div className="flex gap-1">
                            {[0, 1, 2].map(i => (
                                <div key={i} className="w-1.5 h-5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                            ))}
                        </div>
                        AI is speaking...
                    </div>
                )}

                {phase === "listening" && (
                    <div className="w-full space-y-4">
                        {/* Mic indicator */}
                        <div className="flex items-center justify-center gap-3">
                            <div className="w-14 h-14 rounded-full bg-red-500/20 ring-2 ring-red-500/50 flex items-center justify-center animate-pulse">
                                <Mic className="w-6 h-6 text-red-400" />
                            </div>
                            <span className="text-sm text-white/60">Listening... speak your answer</span>
                        </div>

                        {/* Live transcript */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-h-[80px] text-sm text-white/80 leading-relaxed">
                            {transcript || <span className="text-white/30 italic">Your speech will appear here...</span>}
                        </div>

                        {/* Controls */}
                        <div className="flex gap-3">
                            <button
                                onClick={submitAnswer}
                                disabled={!transcript.trim()}
                                className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" /> Submit & Next Question
                            </button>
                            <button
                                onClick={handleFinish}
                                className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white/60 transition-colors"
                            >
                                End Interview
                            </button>
                        </div>
                    </div>
                )}

                {phase === "processing" && (
                    <div className="text-center space-y-3">
                        <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto" />
                        <p className="text-sm text-white/50">Evaluating your answer...</p>
                    </div>
                )}

                {phase === "completed" && (
                    <div className="text-center space-y-4">
                        <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
                        <p className="text-lg font-semibold">Interview Complete!</p>
                        <p className="text-white/50 text-sm">Generating your detailed report...</p>
                        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                    </div>
                )}

                {/* Answer History Panel */}
                {answers.length > 0 && phase !== "completed" && (
                    <div className="w-full mt-4">
                        <p className="text-xs text-white/30 mb-2 flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" /> {answers.length} question{answers.length !== 1 ? 's' : ''} answered
                        </p>
                        <div className="flex gap-2">
                            {answers.map((_, i) => (
                                <div key={i} className="w-6 h-1.5 rounded-full bg-violet-500" />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
