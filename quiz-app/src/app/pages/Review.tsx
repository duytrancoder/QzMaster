import React from "react";
import { useParams, Link } from "react-router";
import { motion } from "motion/react";
import { useAppStore } from "../store";
import { formatTime } from "../utils";
import { CheckCircle2, XCircle, ArrowLeft, Trophy, Clock, History as HistoryIcon, Hash } from "lucide-react";

export function Review() {
  const { id } = useParams<{ id: string }>();
  const { history } = useAppStore();

  const exam = history.find((h) => h.id === id);

  if (!exam) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <HistoryIcon size={48} className="mb-4 opacity-50" />
        <p>Không tìm thấy lịch sử bài làm này.</p>
        <Link to="/history" className="text-blue-400 hover:underline mt-4">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const scorePercentage = (exam.score / exam.total) * 100;
  let scoreColor = "text-emerald-400";
  let scoreBg = "bg-emerald-500/10";
  if (scorePercentage < 50) {
    scoreColor = "text-red-400";
    scoreBg = "bg-red-500/10";
  } else if (scorePercentage < 80) {
    scoreColor = "text-amber-400";
    scoreBg = "bg-amber-500/10";
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8 pb-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <Link to="/history" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-3">
            <ArrowLeft size={16} /> Quay lại
          </Link>
          <h1 className="text-3xl font-bold text-slate-100">{exam.bankName}</h1>
          <p className="text-slate-400 mt-1">Làm bài lúc {new Date(exam.date).toLocaleString("vi-VN")}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm">
          <div className="flex flex-col items-center justify-center px-4">
            <span className="text-xs text-slate-500 flex items-center gap-1"><Trophy size={14} /> Điểm số</span>
            <span className={`text-2xl font-bold mt-1 ${scoreColor}`}>{exam.score}/{exam.total}</span>
          </div>
          <div className="flex flex-col items-center justify-center px-4 border-l border-slate-800">
            <span className="text-xs text-slate-500 flex items-center gap-1"><Clock size={14} /> Thời gian</span>
            <span className="text-xl font-medium text-slate-200 mt-1">{formatTime(exam.timeTaken)}</span>
          </div>
          <div className="flex flex-col items-center justify-center px-4 border-l border-slate-800">
            <span className="text-xs text-slate-500 flex items-center gap-1"><Hash size={14} /> Chế độ</span>
            <span className="text-sm font-medium text-indigo-400 mt-1 capitalize">{exam.mode}</span>
          </div>
           <div className="flex flex-col items-center justify-center px-4 border-l border-slate-800">
             <span className="text-xs text-slate-500 flex items-center gap-1"><CheckCircle2 size={14} /> Tỷ lệ</span>
             <span className={`text-xl font-medium mt-1 ${scoreColor}`}>{scorePercentage.toFixed(0)}%</span>
           </div>
        </div>
      </header>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
          Chi tiết bài làm
        </h2>
        {exam.questions.map((q, idx) => {
          const userAnswer = exam.answers[q.id];
          const isCorrect = userAnswer === (q.correctAnswer || q.correct);
          const isUnanswered = !userAnswer;

          return (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={q.id}
              className={`p-6 rounded-2xl border ${
                isCorrect
                  ? "bg-emerald-950/20 border-emerald-900/50"
                  : isUnanswered
                  ? "bg-slate-900/40 border-slate-800"
                  : "bg-red-950/20 border-red-900/50"
              }`}
            >
              <div className="flex items-start gap-4 mb-5">
                <span className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                  isCorrect ? "bg-emerald-500/20 text-emerald-400" : isUnanswered ? "bg-slate-800 text-slate-500" : "bg-red-500/20 text-red-400"
                }`}>
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <h3 className="text-slate-200 font-medium leading-relaxed">{q.content || q.text}</h3>
                  {isUnanswered && <span className="inline-block mt-2 text-xs font-medium px-2 py-1 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">Chưa trả lời</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-12">
                {(["A", "B", "C", "D"] as const).map((opt) => {
                  const isUserSelected = userAnswer === opt;
                  const isActuallyCorrect = (q.correctAnswer || q.correct) === opt;

                  let optClass = "bg-slate-950 border-slate-800 text-slate-400";
                  let Icon = null;
                  
                  if (isActuallyCorrect) {
                    optClass = "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)] ring-1 ring-emerald-500/50";
                    Icon = <CheckCircle2 size={18} className="text-emerald-500 ml-auto" />;
                  } else if (isUserSelected && !isActuallyCorrect) {
                    optClass = "bg-red-500/10 border-red-500/50 text-red-400 opacity-80 ring-1 ring-red-500/50";
                    Icon = <XCircle size={18} className="text-red-500 ml-auto" />;
                  } else if (isUnanswered || !isUserSelected) {
                     optClass += " opacity-60"; // Fade out others
                  }

                  return (
                    <div
                      key={opt}
                      className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${optClass}`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                         isActuallyCorrect ? "bg-emerald-500/20 text-emerald-400" : isUserSelected ? "bg-red-500/20 text-red-400" : "bg-slate-900 text-slate-500"
                      }`}>
                        {opt}
                      </span>
                      <span className="text-sm font-medium flex-1">{q.options[opt]}</span>
                      {Icon}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
