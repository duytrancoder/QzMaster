import React from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { useAppStore } from "../store";
import { BookOpen, Database, PlayCircle } from "lucide-react";

export function Home() {
  const { banks, history } = useAppStore();

  const totalQuestions = banks.reduce((acc, curr) => acc + curr.questions.length, 0);
  const totalExams = history.length;
  const averageScore = history.length > 0
    ? history.reduce((acc, curr) => acc + curr.score / curr.total, 0) / history.length
    : 0;

  const stats = [
    { label: "Tổng số kho", value: banks.length, icon: Database, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Tổng câu hỏi", value: totalQuestions, icon: BookOpen, color: "text-indigo-400", bg: "bg-indigo-500/10" },
    { label: "Đã làm bài", value: totalExams, icon: PlayCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8 max-w-5xl mx-auto"
    >
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100">Tổng quan hệ thống</h1>
        <p className="text-slate-400 mt-2">Theo dõi tiến độ học tập và ôn luyện của bạn.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className={`p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm flex items-center gap-4`}
          >
            <div className={`p-4 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">{stat.label}</p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40">
          <h3 className="text-xl font-semibold mb-4 text-slate-200">Gợi ý hôm nay</h3>
          {banks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500 mb-4">Bạn chưa có kho câu hỏi nào.</p>
              <Link to="/banks" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">
                Tạo kho mới
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-slate-400 mb-4">Tiếp tục ôn luyện với các kho có sẵn.</p>
              <Link to="/practice" className="block w-full text-center bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-6 py-3 rounded-lg transition-colors">
                Vào Ôn Tập Tự Do
              </Link>
              <Link to="/exam/config" className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors shadow-lg shadow-blue-500/20">
                Bắt đầu Thi Thử
              </Link>
            </div>
          )}
        </div>

        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40">
          <h3 className="text-xl font-semibold mb-4 text-slate-200">Hoạt động gần đây</h3>
          {history.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              Chưa có lịch sử làm bài.
            </div>
          ) : (
            <div className="space-y-3">
              {history.slice(0, 4).map((h) => (
                <div key={h.id} className="flex justify-between items-center p-3 rounded-lg bg-slate-800/50 border border-slate-800">
                  <div>
                    <p className="font-medium text-slate-200">{h.bankName}</p>
                    <p className="text-xs text-slate-500">{new Date(h.date).toLocaleDateString("vi-VN")}</p>
                  </div>
                  <div className="text-right">
                    <span className={`font-bold ${h.score / h.total >= 0.8 ? 'text-emerald-400' : h.score / h.total >= 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {h.score}/{h.total}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
