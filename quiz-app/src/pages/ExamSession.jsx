import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckCircle2, Clock, ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react';
import { db } from '../db';

// Helper to shuffle array
function shuffleArray(array) {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

// Formatting seconds to MM:SS
function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function ExamSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const config = location.state || { mode: 'all', timeLimit: 0, randomCount: 10 };

  const rawQuestions = useLiveQuery(() => db.questions.where('bankId').equals(id).toArray(), [id]);
  const bank = useLiveQuery(() => db.questionBanks.get(id), [id]);

  const [examQuestions, setExamQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(config.timeLimit * 60);

  // Khởi tạo đề thi 1 lần
  useEffect(() => {
    if (rawQuestions && examQuestions.length === 0 && rawQuestions.length > 0) {
      if (config.mode === 'random') {
        setExamQuestions(shuffleArray(rawQuestions).slice(0, config.randomCount));
      } else {
        setExamQuestions([...rawQuestions]);
      }
    }
  }, [rawQuestions, config.mode, config.randomCount, examQuestions.length]);

  // Ngăn chặn F5/Thoát trang
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Hẹn giờ
  useEffect(() => {
    if (config.timeLimit === 0) return;
    
    if (timeLeft <= 0) {
      handleSubmit(); // Auto nộp bài
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, config.timeLimit]);

  const handleSelectOption = (questionId, optionKey) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: optionKey }));
  };

  const handleSubmit = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn nộp bài?")) return;
    
    // Disable beforeunload
    window.onbeforeunload = null;

    // Tính điểm và snapshot
    let correctCount = 0;
    const details = examQuestions.map(q => {
      const uAns = userAnswers[q.id];
      const isCorrect = uAns === q.correctAnswer;
      if (isCorrect) correctCount++;
      
      return {
        questionSnapshot: q,
        userAnswer: uAns || null,
        isCorrect
      };
    });

    const mockHistoryId = `history_${crypto.randomUUID()}`;
    const mockHistoryObj = {
      id: mockHistoryId,
      bankId: id,
      bankName: bank?.name || 'Không rõ kho',
      mode: config.mode,
      total: examQuestions.length,
      correct: correctCount,
      details,
      timeLimitSec: config.timeLimit * 60,
      timeTakenSec: config.timeLimit > 0 ? (config.timeLimit * 60 - timeLeft) : 0, // IF limitless, might need to track upwards instead, MVP set 0.
      dateCompleted: Date.now()
    };

    await db.examHistory.add(mockHistoryObj);
    navigate(`/result/${mockHistoryId}`);
  };

  // Render Skeleton nếu đang loading
  if (!rawQuestions || examQuestions.length === 0) {
    return <div className="flex h-screen items-center justify-center bg-slate-50">Đang chuẩn bị đề thi...</div>;
  }

  const currentQ = examQuestions[currentIndex];
  const isLast = currentIndex === examQuestions.length - 1;

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm sticky top-0 z-10">
        <div>
          <h1 className="font-bold text-slate-800 tracking-tight text-lg">{bank?.name || 'Bài thi trắc nghiệm'}</h1>
          <p className="text-slate-500 text-sm">Câu {currentIndex + 1} / {examQuestions.length}</p>
        </div>
        
        <div className="flex items-center gap-6">
          {config.timeLimit > 0 && (
            <div className={`flex items-center gap-2 font-mono text-xl font-bold px-4 py-1.5 rounded-lg border ${
              timeLeft < 60 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}>
              <Clock className="w-5 h-5" />
              {formatTime(timeLeft)}
            </div>
          )}
          <button 
            onClick={handleSubmit}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <CheckCircle2 className="w-5 h-5" />
            Nộp bài
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 h-1.5 shrink-0">
        <div 
          className="bg-blue-600 h-1.5 transition-all duration-300 ease-out"
          style={{ width: `${Object.keys(userAnswers).length / examQuestions.length * 100}%` }}
        ></div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto p-4 md:p-8 flex justify-center">
        <div className="w-full max-w-4xl max-h-full flex flex-col">
          
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-10 shadow-sm flex-1 flex flex-col">
            <h2 className="text-xl md:text-2xl font-semibold text-slate-800 leading-relaxed mb-8">
              <span className="text-blue-600 font-bold mr-2">Câu {currentIndex + 1}.</span> 
              {currentQ.content}
            </h2>

            <div className="flex flex-col gap-4 mt-auto">
              {['A', 'B', 'C', 'D'].map(optKey => {
                const isSelected = userAnswers[currentQ.id] === optKey;
                return (
                  <label 
                    key={optKey} 
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50/50 shadow-sm' 
                        : 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <input 
                        type="radio"
                        name={`question-${currentQ.id}`}
                        value={optKey}
                        checked={isSelected}
                        onChange={() => handleSelectOption(currentQ.id, optKey)}
                        className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-slate-300"
                      />
                    </div>
                    <div className="flex items-center flex-1 py-1">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold mr-3 shrink-0 ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {optKey}
                      </span>
                      <span className={`text-base leading-relaxed ${isSelected ? 'text-slate-800 font-medium' : 'text-slate-700'}`}>
                        {currentQ.options[optKey]}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
            
          </div>

          {/* Navigation Controls */}
          <div className="mt-6 flex items-center justify-between">
            <button 
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <ChevronLeft className="w-5 h-5" />
              Câu trước
            </button>
            
            <div className="flex gap-2 items-center flex-wrap max-w-sm justify-center px-4 hidden md:flex">
              {/* Optional: Render Quick Nav Dots */}
              {examQuestions.map((q, idx) => {
                const isAnswered = !!userAnswers[q.id];
                const isCurrent = idx === currentIndex;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      isCurrent ? 'bg-blue-600 ring-4 ring-blue-100' : 
                      isAnswered ? 'bg-blue-400' : 'bg-slate-200 hover:bg-slate-300'
                    }`}
                    title={`Câu ${idx + 1}`}
                  />
                );
              })}
            </div>

            <button 
              onClick={() => setCurrentIndex(prev => Math.min(examQuestions.length - 1, prev + 1))}
              disabled={isLast}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Câu tiếp
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        
        </div>
      </main>
    </div>
  );
}
