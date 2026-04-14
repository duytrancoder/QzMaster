import React, { useState, useMemo, useEffect, useDeferredValue, useCallback } from 'react';
import { motion } from 'motion/react';
import { useAppStore } from '../store';
import { removeVietnameseTones } from '../utils';
import { Search, Eye, BookOpen, AlertCircle } from 'lucide-react';
import { Question } from '../types';
import { toast } from 'sonner';

export function Practice() {
  const { banks } = useAppStore();
  const { getQuestionsForBank } = useAppStore();
  const [selectedBankId, setSelectedBankId] = useState<string>(banks[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [showAllAnswers, setShowAllAnswers] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Sync first bank
  useEffect(() => {
    if (banks.length > 0 && !selectedBankId) {
      setSelectedBankId(banks[0].id);
    }
  }, [banks]);

  // Load questions on bank change
  useEffect(() => {
    if (!selectedBankId) return;
    setIsLoadingQuestions(true);
    getQuestionsForBank(selectedBankId)
      .then(setQuestions)
      .catch(() => toast.error('Không thể tải câu hỏi'))
      .finally(() => setIsLoadingQuestions(false));
  }, [selectedBankId]);

  const selectedBank = banks.find((b) => b.id === selectedBankId);
  const getBankOptionLabel = (bankName: string) => bankName;

  const selectedBankBadgeClass = selectedBank?.isShared
    ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
    : 'bg-blue-500/10 border-blue-500/20 text-blue-300';

  const numberedQuestions = useMemo(
    () => questions.map((question, index) => ({ question, questionNumber: index + 1 })),
    [questions]
  );

  const searchableQuestions = useMemo(
    () =>
      numberedQuestions.map(({ question, questionNumber }) => {
        const content = question.content || question.text || '';
        return {
          question,
          questionNumber,
          normalizedContent: removeVietnameseTones(content),
          normalizedOptions: Object.values(question.options).map((opt) => removeVietnameseTones(opt)),
          normalizedQuestionNo: `cau ${questionNumber}`,
          plainQuestionNo: String(questionNumber),
        };
      }),
    [numberedQuestions]
  );

  const normalizedDeferredQuery = useMemo(
    () => removeVietnameseTones(deferredSearchQuery),
    [deferredSearchQuery]
  );

  const filteredQuestions = useMemo(() => {
    if (!selectedBank) return [];
    if (!normalizedDeferredQuery) return numberedQuestions;

    return searchableQuestions
      .filter(({ normalizedContent, normalizedOptions, normalizedQuestionNo, plainQuestionNo }) => {
        const matchText = normalizedContent.includes(normalizedDeferredQuery);
        const matchOpts = normalizedOptions.some((opt) => opt.includes(normalizedDeferredQuery));
        const matchQuestionNo =
          normalizedQuestionNo.includes(normalizedDeferredQuery) || plainQuestionNo.includes(normalizedDeferredQuery);
        return matchText || matchOpts || matchQuestionNo;
      })
      .map(({ question, questionNumber }) => ({ question, questionNumber }));
  }, [selectedBank, numberedQuestions, searchableQuestions, normalizedDeferredQuery]);

  const highlightRegex = useMemo(() => {
    const query = deferredSearchQuery.trim();
    if (!query) return null;

    try {
      const escaped = query.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(escaped, 'gi');
    } catch {
      return null;
    }
  }, [deferredSearchQuery]);

  const highlightText = useCallback(
    (text: string) => {
      if (!highlightRegex) return text;

      const matches = Array.from(text.matchAll(highlightRegex));
      if (matches.length === 0) return text;

      const chunks: React.ReactNode[] = [];
      let lastIndex = 0;

      for (const match of matches) {
        const matchedText = match[0];
        const startIndex = match.index ?? 0;

        if (startIndex > lastIndex) {
          chunks.push(text.slice(lastIndex, startIndex));
        }

        chunks.push(
          <span key={`${startIndex}-${matchedText}`} className="bg-blue-500/30 text-blue-200 px-1 rounded-sm">
            {matchedText}
          </span>
        );

        lastIndex = startIndex + matchedText.length;
      }

      if (lastIndex < text.length) {
        chunks.push(text.slice(lastIndex));
      }

      return chunks;
    },
    [highlightRegex]
  );

  if (banks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <BookOpen size={48} className="mb-4 opacity-50" />
        <p>Chưa có kho dữ liệu nào. Hãy thêm kho ở mục Quản lý kho.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row gap-4 justify-between md:items-center bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm shadow-md">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Ôn tập tự do</h1>
          <p className="text-sm text-slate-400 mt-2">Luyện tập không giới hạn thời gian</p>
        </div>

        <div className="flex-1 max-w-sm w-full space-y-3">
          <div className="flex items-center gap-2">
            <select
              value={selectedBankId}
              onChange={(e) => {
                setSelectedBankId(e.target.value);
                setShowAllAnswers(false);
                setSearchQuery('');
              }}
              className="flex-1 bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none appearance-none transition-colors duration-150"
            >
              {banks.map((b) => (
                <option key={b.id} value={b.id}>{getBankOptionLabel(b.name)}</option>
              ))}
            </select>

            {selectedBank ? (
              <span className={`text-xs px-2.5 py-2 rounded-lg border whitespace-nowrap font-medium ${selectedBankBadgeClass}`}>
                {selectedBank.isShared ? 'Shared' : 'Owner'}
              </span>
            ) : null}
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5 outline-none transition-colors duration-150"
              placeholder="Tìm kiếm câu hỏi..."
            />
          </div>
          <button
            onClick={() => setShowAllAnswers(!showAllAnswers)}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-lg border flex items-center justify-center gap-2 text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
              showAllAnswers
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                : 'bg-blue-600 border-blue-500 text-white hover:bg-blue-500'
            }`}
          >
            <Eye size={16} /> {showAllAnswers ? 'Ẩn đáp án toàn bộ' : 'Xem đáp án toàn bộ'}
          </button>
        </div>
      </header>

      {isLoadingQuestions ? (
        <div className="text-center py-12 text-slate-500 space-y-3">
          <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium">Đang tải câu hỏi...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-12 text-slate-500 flex flex-col items-center">
          <AlertCircle size={32} className="mb-2 opacity-50 text-amber-500" />
          <p>Kho này chưa có câu hỏi nào.</p>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          Không tìm thấy câu hỏi nào phù hợp với "{searchQuery}"
        </div>
      ) : (
        <div className="space-y-4 pb-20">
          {filteredQuestions.map(({ question: q, questionNumber }) => {
            const isRevealed = showAllAnswers;
            return (
              <div
                key={q.id}
                className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 hover:bg-slate-900/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex justify-between items-start gap-4 mb-4">
                    <h3 className="text-slate-200 font-medium leading-relaxed tracking-tight">
                    <span className="text-blue-400 font-bold mr-2">Câu {questionNumber}:</span>
                    {highlightText(q.content || q.text || '')}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                    const isCorrect = (q.correctAnswer || q.correct) === opt;
                    const showAsCorrect = isRevealed && isCorrect;

                    return (
                      <div
                        key={opt}
                        className={`p-3 rounded-lg border transition-all duration-150 ${
                          showAsCorrect
                            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.1)] ring-1 ring-emerald-500/50'
                            : 'bg-slate-950 border-slate-800 text-slate-400 opacity-80'
                        } ${isRevealed && !isCorrect ? 'opacity-30 grayscale' : ''}`}
                      >
                        <span className={`font-bold mr-2 ${showAsCorrect ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {opt}.
                        </span>
                        {highlightText(q.options[opt])}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
