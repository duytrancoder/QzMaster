import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../db';
import { Clock, CheckCircle2, ChevronRight, History as HistoryIcon } from 'lucide-react';

export default function History() {
  const histories = useLiveQuery(() => db.examHistory.reverse().toArray()) || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-800">Lịch sử làm bài</h2>
        <p className="text-sm text-slate-500 mt-1">Xem lại kết quả các đợt thi thử trước đây của bạn.</p>
      </div>

      {histories.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white border border-slate-200 border-dashed rounded-xl text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <HistoryIcon className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Chưa có lịch sử thi</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            Bạn chưa hoàn thành bài thi thử nào. Hãy chọn kho câu hỏi và làm bài để lưu kết quả nhé.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {histories.map(item => {
              const percent = Math.round((item.correct / item.total) * 100);
              
              return (
                <Link 
                  key={item.id} 
                  to={`/result/${item.id}`}
                  className="p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors group"
                >
                  <div className="w-14 h-14 rounded-full border-4 border-slate-50 relative shrink-0 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle cx="28" cy="28" r="24" fill="none" stroke="#f1f5f9" strokeWidth="6" />
                      <circle 
                        cx="28" 
                        cy="28" 
                        r="24" 
                        fill="none" 
                        stroke={percent >= 80 ? '#22c55e' : percent >= 50 ? '#3b82f6' : '#ef4444'} 
                        strokeWidth="6" 
                        strokeDasharray={`${(percent / 100) * 150} 150`}
                      />
                    </svg>
                    <span className="text-xs font-bold text-slate-700 z-10">{percent}%</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 text-base truncate">{item.bankName}</h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                      <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(item.dateCompleted).toLocaleDateString('vi-VN')} {new Date(item.dateCompleted).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> {item.correct}/{item.total} đúng</span>
                      {item.mode === 'random' && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">Random</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-slate-400 group-hover:text-blue-600 transition-colors">
                     <ChevronRight className="w-5 h-5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
