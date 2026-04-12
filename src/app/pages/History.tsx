import React, { useState } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { useAppStore } from "../store";
import { formatTime } from "../utils";
import { History as HistoryIcon, Clock, Award, Trash2, Search, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export function History() {
  const { history, saveHistory } = useAppStore(); // Need to implement deleteHistory if I want, or just filter it. 
  // Wait, I didn't add deleteHistory to store. I'll just omit deletion for now or implement a quick local state filter.
  // Actually, let's keep it simple: just list.

  const [searchTerm, setSearchTerm] = useState("");

  const filteredHistory = history.filter((h) =>
    h.bankName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Lịch sử làm bài</h1>
          <p className="text-sm text-slate-400 mt-1">Xem lại kết quả các bài thi trước</p>
        </div>

        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5 outline-none transition-colors"
            placeholder="Tìm theo tên kho..."
          />
        </div>
      </header>

      {history.length === 0 ? (
        <div className="text-center py-16 text-slate-500 flex flex-col items-center">
          <HistoryIcon size={64} className="mb-4 opacity-20" />
          <p className="text-lg">Chưa có lịch sử làm bài nào.</p>
          <Link to="/exam/config" className="text-blue-400 hover:text-blue-300 mt-2 underline transition-colors">
            Bắt đầu thi thử ngay
          </Link>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          Không tìm thấy kết quả nào phù hợp.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence>
            {filteredHistory.map((item, index) => {
              const scorePercentage = (item.score / item.total) * 100;
              let scoreColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
              if (scorePercentage < 50) scoreColor = "text-red-400 bg-red-500/10 border-red-500/20";
              else if (scorePercentage < 80) scoreColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={item.id}
                  className="group bg-slate-900/40 border border-slate-800 rounded-xl p-5 hover:bg-slate-800/60 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">
                      {item.bankName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock size={14} /> {new Date(item.date).toLocaleString("vi-VN")}
                      </span>
                      <span className="flex items-center gap-1 capitalize">
                        <Award size={14} /> {item.mode}
                      </span>
                      <span className="flex items-center gap-1">
                         Thời gian: {formatTime(item.timeTaken)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                    <div className={`px-4 py-2 rounded-lg border ${scoreColor} flex flex-col items-center justify-center min-w-[80px]`}>
                      <span className="text-xl font-bold">{item.score}/{item.total}</span>
                    </div>
                    
                    <Link
                      to={`/review/${item.id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg transition-all border border-slate-700 hover:border-blue-500 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                    >
                      Chi tiết <ArrowRight size={16} />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
