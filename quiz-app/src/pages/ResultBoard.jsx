import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ChevronLeft, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export default function ResultBoard() {
  const { id } = useParams();
  const history = useLiveQuery(() => db.examHistory.get(id), [id]);

  if (history === undefined) return <div className="p-8 text-center">Đang tải kết quả...</div>;
  if (history === null) return <div className="p-8 text-center text-red-500">Không tìm thấy kết quả.</div>;

  const percent = Math.round((history.correct / history.total) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 pt-6">
      
      {/* Top Bar Navigation */}
      <div className="flex items-center gap-4">
        <Link to="/" className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Kết quả bài thi</h2>
          <p className="text-sm text-slate-500">{history.bankName} • {new Date(history.dateCompleted).toLocaleString('vi-VN')}</p>
        </div>
        <Link to="/history" className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors text-sm">
          Xem lịch sử thi
        </Link>
      </div>

      {/* Score Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col md:flex-row items-center gap-8 justify-center">
        
        <div className="relative w-40 h-40 shrink-0 flex flex-col items-center justify-center rounded-full border-8 border-slate-50 shadow-inner">
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle cx="80" cy="80" r="72" fill="none" stroke="#f1f5f9" strokeWidth="16" />
            <circle 
              cx="80" 
              cy="80" 
              r="72" 
              fill="none" 
              stroke={percent >= 80 ? '#22c55e' : percent >= 50 ? '#3b82f6' : '#ef4444'} 
              strokeWidth="16" 
              strokeDasharray={`${(percent / 100) * 452} 452`} 
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="text-3xl font-black text-slate-800 z-10">{percent}%</div>
        </div>

        <div className="text-center md:text-left space-y-4">
          <h3 className="text-2xl font-bold text-slate-800">
            {percent >= 80 ? 'Tuyệt vời!' : percent >= 50 ? 'Khá Tốt!' : 'Cần cố gắng thêm!'}
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
             <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl border border-green-100 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Số câu đúng: <strong className="text-lg ml-auto">{history.correct}</strong>
             </div>
             <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-100 font-medium flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                Số câu sai: <strong className="text-lg ml-auto">{history.total - history.correct}</strong>
             </div>
          </div>
          {history.timeTakenSec > 0 && (
             <div className="text-slate-500 text-sm bg-slate-50 p-2 rounded-lg inline-block border border-slate-100">
               Hoàn thành trong: <strong>{Math.floor(history.timeTakenSec / 60)} phút {history.timeTakenSec % 60} giây</strong>
             </div>
          )}
        </div>
      </div>

      {/* Details / Review Section */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-2">Chi tiết đáp án</h3>
        <div className="space-y-4">
          {history.details.map((item, idx) => {
            const q = item.questionSnapshot;
            const uAns = item.userAnswer;
            const cAns = q.correctAnswer;
            
            return (
              <div key={q.id || idx} className={`bg-white border rounded-xl p-6 shadow-sm ${item.isCorrect ? 'border-green-200' : 'border-red-200'}`}>
                <div className="flex gap-3 mb-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white font-bold ${item.isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                     {idx + 1}
                  </div>
                  <h4 className="font-semibold text-slate-800 text-base leading-relaxed pt-1">
                    {q.content}
                  </h4>
                </div>

                <div className="pl-11 space-y-2.5">
                  {Object.entries(q.options).map(([key, value]) => {
                    const isSelectionMatchCorrect = key === cAns;
                    const isUserSelection = key === uAns;
                    
                    let bgClass = "bg-slate-50 border-slate-100 text-slate-600";
                    let icon = null;
                    
                    if (isSelectionMatchCorrect) {
                       bgClass = "bg-green-50 border-green-200 text-green-800 font-medium";
                       icon = <CheckCircle2 className="w-5 h-5 text-green-600 ml-auto" />;
                    } else if (isUserSelection && !isSelectionMatchCorrect) {
                       bgClass = "bg-red-50 border-red-200 text-red-800 font-medium line-through decoration-red-300 opacity-80";
                       icon = <XCircle className="w-5 h-5 text-red-500 ml-auto" />;
                    }
                    
                    return (
                      <div key={key} className={`flex items-start gap-3 p-3 text-sm rounded-lg border ${bgClass}`}>
                        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 font-semibold bg-white/50 border border-black/5 opacity-80">
                          {key}
                        </div>
                        <div className="pt-0.5 flex-1 flex items-center">
                          {value}
                          {icon}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
