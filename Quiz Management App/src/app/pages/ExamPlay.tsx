import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { useAppStore } from "../store";
import { formatTime, generateId } from "../utils";
import { Clock, CheckSquare, List, Send, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function ExamPlay() {
  const navigate = useNavigate();
  const { activeExam, saveHistory, setActiveExam } = useAppStore();
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>(activeExam?.answers || {});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!activeExam) {
      navigate("/exam/config");
      return;
    }

    if (activeExam.timeLimit > 0) {
      const elapsed = Math.floor((Date.now() - activeExam.startTime) / 1000);
      const remaining = activeExam.timeLimit * 60 - elapsed;
      setTimeLeft(Math.max(0, remaining));

      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            if (!isSubmitting) handleSubmit(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [activeExam, isSubmitting, navigate]);

  // Update context with answers periodically to avoid data loss
  useEffect(() => {
    if (activeExam && Object.keys(answers).length > 0) {
      setActiveExam({ ...activeExam, answers });
    }
  }, [answers]);

  if (!activeExam) return null;

  const handleSelectAnswer = (qId: string, opt: "A" | "B" | "C" | "D") => {
    setAnswers((prev) => ({ ...prev, [qId]: opt }));
  };

  const handleSubmit = (isAuto = false) => {
    if (isSubmitting) return;

    if (!isAuto && Object.keys(answers).length < activeExam.questions.length) {
      if (!confirm("Bạn chưa hoàn thành tất cả câu hỏi. Vẫn muốn nộp bài?")) {
        return;
      }
    }

    setIsSubmitting(true);
    let score = 0;
    activeExam.questions.forEach((q) => {
      if (answers[q.id] === q.correct) score++;
    });

    const historyItem = {
      id: generateId(),
      bankId: activeExam.bankId,
      bankName: activeExam.bankName,
      date: new Date().toISOString(),
      score,
      total: activeExam.questions.length,
      answers,
      mode: activeExam.mode,
      timeLimit: activeExam.timeLimit,
      timeTaken: activeExam.timeLimit > 0 ? activeExam.timeLimit * 60 - timeLeft : Math.floor((Date.now() - activeExam.startTime) / 1000),
      questions: activeExam.questions,
    };

    saveHistory(historyItem);
    toast.success(isAuto ? "Hết giờ! Tự động nộp bài." : "Nộp bài thành công!");
    navigate(`/review/${historyItem.id}`);
  };

  const scrollToQuestion = (idx: number) => {
    questionRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const answeredCount = Object.keys(answers).length;
  const progressPercent = (answeredCount / activeExam.questions.length) * 100;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-6rem)] relative overflow-hidden">
      {/* Main Content (Questions) */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-32 lg:pb-0 relative space-y-6">
        <header className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md pb-4 pt-2 border-b border-slate-800">
          <h1 className="text-2xl font-bold text-slate-100">{activeExam.bankName}</h1>
          <p className="text-sm text-slate-400">
            Chế độ: <span className="text-indigo-400 capitalize">{activeExam.mode}</span> | Tổng: {activeExam.questions.length} câu
          </p>
        </header>

        {activeExam.questions.map((q, idx) => (
          <div
            key={q.id}
            ref={(el) => (questionRefs.current[idx] = el)}
            className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-sm hover:border-slate-700 transition-colors"
          >
            <h3 className="text-lg text-slate-200 font-medium mb-5 leading-relaxed">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-slate-400 text-sm font-bold mr-3 shrink-0">
                {idx + 1}
              </span>
              {q.text}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(["A", "B", "C", "D"] as const).map((opt) => {
                const isSelected = answers[q.id] === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => handleSelectAnswer(q.id, opt)}
                    className={`text-left p-4 rounded-xl border transition-all flex items-start gap-3 ${
                      isSelected
                        ? "bg-blue-600/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500"
                        : "bg-slate-950 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700 text-slate-300"
                    }`}
                  >
                    <span
                      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        isSelected ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      {opt}
                    </span>
                    <span className={`text-sm mt-0.5 ${isSelected ? "text-blue-100 font-medium" : "text-slate-400"}`}>
                      {q.options[opt]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </motion.div>

      {/* Sidebar (Status) */}
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 sticky top-0 backdrop-blur-sm">
          {activeExam.timeLimit > 0 && (
            <div className={`flex items-center justify-center gap-3 p-4 rounded-xl mb-6 border ${
              timeLeft < 60 ? "bg-red-500/10 border-red-500/30 text-red-400 animate-pulse" : "bg-slate-950 border-slate-800 text-emerald-400"
            }`}>
              <Clock size={24} />
              <span className="text-3xl font-mono font-bold tracking-wider">{formatTime(timeLeft)}</span>
            </div>
          )}

          <div className="mb-6">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <CheckSquare size={16} /> Tiến độ
              </span>
              <span className="text-xl font-bold text-slate-200">
                {answeredCount}<span className="text-sm text-slate-500 font-normal">/{activeExam.questions.length}</span>
              </span>
            </div>
            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
            {activeExam.questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => scrollToQuestion(i)}
                className={`w-10 h-10 rounded-lg text-xs font-bold transition-all border flex items-center justify-center ${
                  answers[q.id]
                    ? "bg-blue-600 border-blue-500 text-white shadow-sm shadow-blue-500/20"
                    : "bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-800"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleSubmit()}
            className="w-full mt-6 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]"
          >
            <Send size={18} /> Nộp bài
          </button>
        </div>
      </motion.div>
    </div>
  );
}
