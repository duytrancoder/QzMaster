import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store';
import { generateId } from '../utils';
import { Play, Settings2, Clock, CheckCircle2, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { Question } from '../types';

export function ExamConfig() {
  const navigate = useNavigate();
  const { banks, setActiveExam, getQuestionsForBank, isLoadingBanks } = useAppStore();

  const [selectedBankId, setSelectedBankId] = useState<string>(banks[0]?.id || '');
  const [mode, setMode] = useState<'random' | 'all' | 'specific'>('random');
  const [randomCount, setRandomCount] = useState<number>(10);
  const [timeLimit, setTimeLimit] = useState<number>(30);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());

  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  const selectedBank = banks.find((b) => b.id === selectedBankId);
  const getBankOptionLabel = (bankName: string) => bankName;
  const selectedBankBadgeClass = selectedBank?.isShared
    ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
    : 'bg-blue-500/10 border-blue-500/20 text-blue-300';

  // Sync first bank when banks list loaded
  useEffect(() => {
    if (banks.length > 0 && !selectedBankId) {
      setSelectedBankId(banks[0].id);
    }
  }, [banks]);

  // Load questions when bank changes
  useEffect(() => {
    if (!selectedBankId) return;
    setIsLoadingQuestions(true);
    getQuestionsForBank(selectedBankId)
      .then((qs) => {
        setQuestions(qs);
        setRandomCount(Math.min(10, qs.length));
        setSelectedQuestions(new Set());
      })
      .catch(() => toast.error('Không thể tải câu hỏi'))
      .finally(() => setIsLoadingQuestions(false));
  }, [selectedBankId]);

  const handleStart = () => {
    if (!selectedBank) return;

    let finalQuestions: Question[] = [];

    if (mode === 'all') {
      finalQuestions = [...questions];
    } else if (mode === 'random') {
      if (randomCount > questions.length || randomCount <= 0) {
        toast.error(`Số lượng không hợp lệ. Tối đa là ${questions.length}.`);
        return;
      }
      const shuffled = [...questions].sort(() => 0.5 - Math.random());
      finalQuestions = shuffled.slice(0, randomCount);
    } else {
      if (selectedQuestions.size === 0) {
        toast.error('Vui lòng chọn ít nhất 1 câu hỏi.');
        return;
      }
      finalQuestions = questions.filter((q) => selectedQuestions.has(q.id));
    }

    if (finalQuestions.length === 0) {
      toast.error('Kho dữ liệu trống. Không thể tạo bài thi.');
      return;
    }

    setActiveExam({
      id: generateId(),
      bankId: selectedBank.id,
      bankName: selectedBank.name,
      questions: finalQuestions,
      mode,
      timeLimit,
      startTime: Date.now(),
      answers: {},
    });

    navigate('/exam/play');
  };

  if (isLoadingBanks) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (banks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <Settings2 size={48} className="mb-4 opacity-50" />
        <p>Vui lòng thêm kho câu hỏi trước khi thi.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-[95vw] sm:max-w-2xl mx-auto space-y-6 sm:space-y-8">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-slate-100">Cấu hình bài thi</h1>
        <p className="text-slate-400">Thiết lập các thông số trước khi bắt đầu</p>
      </header>

      <div className="bg-slate-900/40 border border-slate-800 p-4 sm:p-8 rounded-2xl backdrop-blur-sm shadow-xl space-y-6 sm:space-y-8">
        {/* Kho dữ liệu */}
        <section className="space-y-3">
          <label className="text-sm font-semibold text-blue-400 flex items-center gap-2">
            <CheckCircle2 size={16} /> Chọn Kho Ôn Tập
          </label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <select
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
              className="flex-1 min-h-[44px] bg-slate-950 border border-slate-700 text-slate-200 text-base rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block py-3 px-4 outline-none appearance-none transition-shadow cursor-pointer hover:border-slate-600"
            >
              {banks.map((b) => (
                <option key={b.id} value={b.id}>{getBankOptionLabel(b.name)}</option>
              ))}
            </select>

            {selectedBank ? (
              <span className={`text-xs px-3 py-2 rounded-lg border whitespace-nowrap w-fit ${selectedBankBadgeClass}`}>
                {selectedBank.isShared ? 'Shared' : 'Owner'}
              </span>
            ) : null}
          </div>

          {isLoadingQuestions && (
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <span className="inline-block w-3 h-3 border border-slate-600 border-t-blue-500 rounded-full animate-spin" />
              {' '}Đang tải câu hỏi...
            </p>
          )}
        </section>

        {/* Chế độ */}
        <section className="space-y-4">
          <label className="text-sm font-semibold text-indigo-400 flex items-center gap-2">
            <Settings2 size={16} /> Chế Độ Chọn Câu
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'random', label: 'Ngẫu nhiên' },
              { id: 'all', label: 'Tất cả' },
              { id: 'specific', label: 'Chọn tay' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id as typeof mode)}
                className={`min-h-[44px] py-3 px-4 rounded-xl border text-center transition-all ${
                  mode === m.id
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {mode === 'random' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <Hash className="text-slate-500" size={20} />
                  <div className="flex-1">
                    <label htmlFor="random-count" className="text-xs text-slate-500 mb-1 block">Số lượng câu hỏi</label>
                    <input
                      id="random-count"
                      type="number"
                      min={1}
                      max={questions.length || 1}
                      value={randomCount}
                      onChange={(e) => setRandomCount(Number(e.target.value))}
                      className="w-full min-h-[44px] py-3 bg-transparent text-slate-200 outline-none font-medium"
                    />
                  </div>
                  <div className="text-xs text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                    Max: {questions.length || 0}
                  </div>
                </div>
              </motion.div>
            )}

            {mode === 'specific' && selectedBank && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pt-2 overflow-hidden">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 max-h-[300px] overflow-y-auto space-y-2 custom-scrollbar">
                  <div className="flex justify-between items-center mb-4 sticky top-0 bg-slate-950/90 backdrop-blur pb-2 z-10 border-b border-slate-800">
                    <span className="text-sm font-medium text-slate-300">Đã chọn: {selectedQuestions.size}</span>
                    <button
                      onClick={() =>
                        setSelectedQuestions(
                          selectedQuestions.size === questions.length
                            ? new Set()
                            : new Set(questions.map((q) => q.id))
                        )
                      }
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors min-h-[44px] py-3 px-4"
                    >
                      {selectedQuestions.size === questions.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    </button>
                  </div>
                  {questions.map((q, i) => (
                    <label key={q.id} className="flex items-start gap-3 min-h-[44px] py-3 px-4 rounded-lg hover:bg-slate-900 cursor-pointer border border-transparent hover:border-slate-800 transition-colors group">
                      <input
                        type="checkbox"
                        checked={selectedQuestions.has(q.id)}
                        onChange={(e) => {
                          const newSet = new Set(selectedQuestions);
                          if (e.target.checked) newSet.add(q.id);
                          else newSet.delete(q.id);
                          setSelectedQuestions(newSet);
                        }}
                        className="mt-1 w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 cursor-pointer accent-indigo-500"
                      />
                      <span className="text-sm text-slate-300 group-hover:text-slate-100 line-clamp-2">
                        <span className="text-slate-500 mr-2">#{i + 1}</span>
                        {q.content || q.text}
                      </span>
                    </label>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Thời gian */}
        <section className="space-y-3">
          <label className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
            <Clock size={16} /> Thời Gian Làm Bài (phút)
          </label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <input
              type="number"
              min={0}
              value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
              className="w-full min-h-[44px] py-3 bg-transparent text-slate-200 outline-none font-medium text-lg"
              placeholder="0"
            />
            <div className="text-xs text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-800 whitespace-nowrap">
              {timeLimit === 0 ? 'Không giới hạn' : `${timeLimit} phút`}
            </div>
          </div>
          <p className="text-xs text-slate-500 italic">Nhập 0 để làm bài không tính thời gian.</p>
        </section>

        {/* Action */}
        <div className="pt-6 border-t border-slate-800">
          <button
            onClick={handleStart}
            disabled={isLoadingQuestions || questions.length === 0}
            className="w-full min-h-[44px] py-3 px-4 flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl transition-all shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_40px_rgba(79,70,229,0.5)] transform hover:-translate-y-1"
          >
            Bắt đầu thi <Play fill="currentColor" size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
