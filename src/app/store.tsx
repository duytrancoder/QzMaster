import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Bank, ExamHistory, ActiveExam, Question } from './types';
import { generateId } from './utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AppState {
  banks: Bank[];
  history: ExamHistory[];
  activeExam: ActiveExam | null;
  isLoadingBanks: boolean;
  isLoadingHistory: boolean;
}

interface AppContextType extends AppState {
  addBank: (name: string) => Promise<void>;
  updateBank: (bank: Bank) => Promise<void>;
  deleteBank: (id: string) => Promise<void>;
  addQuestionToBank: (bankId: string, question: Question) => Promise<void>;
  deleteQuestion: (questionId: string) => Promise<void>;
  getQuestionsForBank: (bankId: string) => Promise<Question[]>;
  saveHistory: (history: Omit<ExamHistory, 'id'>) => Promise<string>; // returns the saved record id
  setActiveExam: (exam: ActiveExam | null) => void;
  importBanks: (newBanks: Array<{ id: string; name: string; questions?: Question[] }>) => Promise<void>;
  refreshBanks: () => Promise<void>;
  refreshHistory: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [history, setHistory] = useState<ExamHistory[]>([]);
  const [activeExam, setActiveExamState] = useState<ActiveExam | null>(null);
  const [isLoadingBanks, setIsLoadingBanks] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const getCurrentUserId = async (): Promise<string> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Người dùng chưa đăng nhập.');
    return user.id;
  };

  // ── Fetch Banks ──────────────────────────────────────────────────────────

  const refreshBanks = useCallback(async () => {
    setIsLoadingBanks(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('banks')
        .select('id, name')
        .eq('owner_id', user.id) // ← Filter chỉ xem kho của chính user
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBanks((data ?? []) as Bank[]);
    } catch (err) {
      console.error('refreshBanks error:', err);
    } finally {
      setIsLoadingBanks(false);
    }
  }, []);

  // ── Fetch History ─────────────────────────────────────────────────────────

  const refreshHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('exam_histories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map Supabase rows → ExamHistory shape
      const mapped: ExamHistory[] = (data ?? []).map((row) => {
        const details = (row.details ?? {}) as {
          answers?: Record<string, 'A' | 'B' | 'C' | 'D'>;
          questions?: Question[];
          meta?: {
            bankId?: string;
            bankName?: string;
            timeLimit?: number;
            timeTaken?: number;
          };
        };

        const toFiniteNumber = (value: unknown): number | null => {
          if (typeof value === 'number' && Number.isFinite(value)) return value;
          if (typeof value === 'string' && value.trim().length > 0) {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
          }
          return null;
        };

        const totalFromRow = toFiniteNumber(row.total);
        const totalFromQuestions = details.questions?.length ?? 0;
        const total = Math.max(0, totalFromRow ?? totalFromQuestions);

        const scoreFromRow = toFiniteNumber(row.score);
        let scoreFromAnswers = 0;
        if (details.questions && details.answers) {
          const questionById = new Map(details.questions.map((question) => [question.id, question] as const));
          for (const [questionId, answer] of Object.entries(details.answers)) {
            const question = questionById.get(questionId);
            if (question && answer === (question.correctAnswer ?? question.correct)) {
              scoreFromAnswers += 1;
            }
          }
        }
        const score = Math.max(0, Math.min(total, scoreFromRow ?? scoreFromAnswers));

        const timeLimit = Math.max(0, toFiniteNumber(row.time_limit ?? row.timeLimit ?? details.meta?.timeLimit) ?? 0);
        const timeTaken = Math.max(0, toFiniteNumber(row.time_taken ?? row.timeTaken ?? details.meta?.timeTaken) ?? 0);

        return {
          id: row.id,
          bankId: row.bank_id ?? row.bankId ?? details.meta?.bankId ?? '',
          bankName: row.bank_name ?? row.bankName ?? details.meta?.bankName ?? 'Không xác định',
          date: row.created_at ?? row.date ?? new Date().toISOString(),
          score,
          total,
          answers: details.answers ?? {},
          mode: (row.mode ?? 'all') as ExamHistory['mode'],
          timeLimit,
          timeTaken,
          questions: details.questions ?? [],
        };
      });

      setHistory(mapped);
    } catch (err) {
      console.error('refreshHistory error:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Load dữ liệu khi mount
  useEffect(() => {
    refreshBanks();
    refreshHistory();
  }, [refreshBanks, refreshHistory]);

  // ── Bank CRUD ─────────────────────────────────────────────────────────────

  const addBank = async (name: string) => {
    const userId = await getCurrentUserId();
    // Không tự cấp id — để Supabase auto-generate UUID qua default gen_random_uuid()
    const { error } = await supabase.from('banks').insert({
      name: name.trim(),
      owner_id: userId,
    });
    if (error) {
      console.error('[addBank] Supabase error:', error.message, error.details, error.hint);
      throw error;
    }
    await refreshBanks();
  };

  const updateBank = async (bank: Bank) => {
    const { error } = await supabase
      .from('banks')
      .update({ name: bank.name })
      .eq('id', bank.id);
    if (error) throw error;
    await refreshBanks();
  };

  const deleteBank = async (id: string) => {
    // Xóa questions trước (cascade nếu chưa cấu hình FK)
    await supabase.from('questions').delete().eq('bank_id', id);
    const { error } = await supabase.from('banks').delete().eq('id', id);
    if (error) throw error;
    await refreshBanks();
  };

  // ── Question CRUD ─────────────────────────────────────────────────────────

  const addQuestionToBank = async (bankId: string, question: Question) => {
    // Không tự cấp id — để Supabase auto-generate
    const { error } = await supabase.from('questions').insert({
      bank_id: bankId,
      content: question.content ?? question.text ?? '',
      options: question.options, // JSONB
      correct_answer: question.correctAnswer ?? question.correct,
    });
    if (error) {
      console.error('[addQuestionToBank] Supabase error:', error.message, error.details, error.hint);
      throw error;
    }
  };

  const deleteQuestion = async (questionId: string) => {
    const { error } = await supabase.from('questions').delete().eq('id', questionId);
    if (error) throw error;
  };

  const getQuestionsForBank = async (bankId: string): Promise<Question[]> => {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('bank_id', bankId) // ← Filter theo bank
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((row) => ({
      id: row.id,
      content: row.content,
      text: row.content, // backwards compat
      options: row.options as Question['options'],
      correctAnswer: row.correct_answer as Question['correctAnswer'],
      correct: row.correct_answer as Question['correct'],
    }));
  };

  // ── Exam History ──────────────────────────────────────────────────────────

  const saveHistory = async (historyItem: Omit<ExamHistory, 'id'>): Promise<string> => {
    const userId = await getCurrentUserId();
    const historyId = crypto.randomUUID();

    // Snapshot toàn bộ câu hỏi + đáp án user → lưu vào cột JSONB `details`
    const details = {
      questions: historyItem.questions,
      answers: historyItem.answers,
      meta: {
        bankId: historyItem.bankId,
        bankName: historyItem.bankName,
        timeLimit: historyItem.timeLimit,
        timeTaken: historyItem.timeTaken,
      },
    };

    const payload: Record<string, unknown> = {
      id: historyId,
      user_id: userId,
      bank_id: historyItem.bankId,
      bank_name: historyItem.bankName,
      score: historyItem.score,
      total: historyItem.total,
      mode: historyItem.mode,
      time_limit: historyItem.timeLimit,
      time_taken: historyItem.timeTaken,
      details,
    };

    let saveError: { message?: string; details?: string; hint?: string } | null = null;

    for (let attempt = 0; attempt < 6; attempt++) {
      const { error } = await supabase.from('exam_histories').insert(payload);
      if (!error) {
        saveError = null;
        break;
      }

      saveError = error;
      const missingColumnMatch = /Could not find the '([^']+)' column/i.exec(error.message);
      const missingColumn = missingColumnMatch?.[1];

      if (missingColumn && Object.hasOwn(payload, missingColumn)) {
        delete payload[missingColumn];
        continue;
      }

      break;
    }

    if (saveError) {
      console.error('[saveHistory] Supabase error:', saveError.message, saveError.details, saveError.hint);
      const detailText = [saveError.message, saveError.details, saveError.hint].filter(Boolean).join(' | ');
      throw new Error(detailText || 'Không thể lưu kết quả thi.');
    }

    setActiveExamState(null);
    await refreshHistory();

    return historyId;
  };

  // ── Import Banks ──────────────────────────────────────────────────────────

  const importBanks = async (
    newBanks: Array<{ id: string; name: string; questions?: Question[] }>
  ) => {
    const userId = await getCurrentUserId();

    for (const b of newBanks) {
      // Kiểm tra đã tồn tại chưa (theo owner)
      const { data: existing } = await supabase
        .from('banks')
        .select('id')
        .eq('id', b.id)
        .eq('owner_id', userId)
        .maybeSingle();

      if (!existing) {
        const { error: bankErr } = await supabase.from('banks').insert({
          id: b.id,
          name: b.name,
          owner_id: userId,
        });
        if (bankErr) continue;

        if (b.questions && b.questions.length > 0) {
          const qRows = b.questions.map((q) => ({
            id: q.id ?? generateId(),
            bank_id: b.id,
            content: q.content ?? q.text ?? '',
            options: q.options,
            correct_answer: q.correctAnswer ?? q.correct,
          }));
          await supabase.from('questions').insert(qRows);
        }
      }
    }

    await refreshBanks();
  };

  // ── Active Exam ───────────────────────────────────────────────────────────

  const setActiveExam = (exam: ActiveExam | null) => {
    setActiveExamState(exam);
  };

  return (
    <AppContext.Provider
      value={{
        banks,
        history,
        activeExam,
        isLoadingBanks,
        isLoadingHistory,
        addBank,
        updateBank,
        deleteBank,
        addQuestionToBank,
        deleteQuestion,
        getQuestionsForBank,
        saveHistory,
        setActiveExam,
        importBanks,
        refreshBanks,
        refreshHistory,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
}
