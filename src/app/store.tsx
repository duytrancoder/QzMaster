import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Bank, ExamHistory, ActiveExam, Question, DashboardStats } from './types';
import { generateId } from './utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AppState {
  banks: Bank[];
  history: ExamHistory[];
  recentActivities: ExamHistory[];
  dashboardStats: DashboardStats;
  activeExam: ActiveExam | null;
  isLoadingBanks: boolean;
  isLoadingHistory: boolean;
  isLoadingDashboard: boolean;
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
  getOrCreateShareCode: (bankId: string) => Promise<{ code: string; created: boolean }>;
  joinByCode: (code: string) => Promise<Bank>;
  leaveSharedBank: (bankId: string) => Promise<void>;
  fetchDashboardStats: () => Promise<void>;
  refreshBanks: () => Promise<void>;
  refreshHistory: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextType | undefined>(undefined);

const SHARE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toSafeText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

function mapExamHistoryRow(row: Record<string, unknown>): ExamHistory {
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
    id: toSafeText(row.id, crypto.randomUUID()),
    bankId: toSafeText(row.bank_id ?? row.bankId ?? details.meta?.bankId, ''),
    bankName: toSafeText(row.bank_name ?? row.bankName ?? details.meta?.bankName, 'Không xác định'),
    date: toSafeText(row.created_at ?? row.date, new Date().toISOString()),
    score,
    total,
    answers: details.answers ?? {},
    mode: ((row.mode ?? 'all') as ExamHistory['mode']),
    timeLimit,
    timeTaken,
    questions: details.questions ?? [],
  };
}

function createShareCode(): string {
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    const index = Math.floor(Math.random() * SHARE_CODE_ALPHABET.length);
    code += SHARE_CODE_ALPHABET[index];
  }
  return code;
}

async function fetchQuestionsByBankIdVariants(bankId: string): Promise<Array<Record<string, unknown>>> {
  const { data: bySnakeCase, error: bySnakeCaseErr } = await supabase
    .from('questions')
    .select('*')
    .eq('bank_id', bankId)
    .order('created_at', { ascending: true });

  if (!bySnakeCaseErr && bySnakeCase && bySnakeCase.length > 0) {
    return bySnakeCase as Array<Record<string, unknown>>;
  }

  const snakeCaseMissing =
    !!bySnakeCaseErr && /Could not find the 'bank_id' column/i.test(bySnakeCaseErr.message);
  const shouldTryCamelCase = snakeCaseMissing || !bySnakeCaseErr;

  if (shouldTryCamelCase) {
    const { data: byCamelCase, error: byCamelCaseErr } = await supabase
      .from('questions')
      .select('*')
      .eq('bankId', bankId)
      .order('created_at', { ascending: true });

    if (!byCamelCaseErr && byCamelCase && byCamelCase.length > 0) {
      return byCamelCase as Array<Record<string, unknown>>;
    }

    if (!bySnakeCaseErr && !byCamelCaseErr) {
      return [];
    }

    if (bySnakeCaseErr && /Could not find the 'bank_id' column/i.test(bySnakeCaseErr.message) && byCamelCaseErr) {
      throw byCamelCaseErr;
    }
  }

  if (bySnakeCaseErr) {
    const snakeCaseMissing = /Could not find the 'bank_id' column/i.test(bySnakeCaseErr.message);
    if (!snakeCaseMissing) {
      throw bySnakeCaseErr;
    }
  }

  const { data: allRows, error: allRowsErr } = await supabase
    .from('questions')
    .select('*');

  if (allRowsErr) {
    throw allRowsErr;
  }

  const allQuestionRows = (allRows ?? []) as Array<Record<string, unknown>>;
  return allQuestionRows.filter((row) => {
    const rowBankId = toSafeText(row.bank_id ?? row.bankId, '');
    return rowBankId === bankId;
  });
}

function mapQuestionRow(row: Record<string, unknown>): Question {
  const content =
    typeof row.content === 'string'
      ? row.content
      : typeof row.text === 'string'
      ? row.text
      : '';

  const correct =
    (row.correct_answer as Question['correctAnswer']) ??
    (row.correctAnswer as Question['correctAnswer']) ??
    (row.correct as Question['correctAnswer']);

  return {
    id: toSafeText(row.id, crypto.randomUUID()),
    content,
    text: content,
    options: row.options as Question['options'],
    correctAnswer: correct,
    correct,
  };
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ownedBanks, setOwnedBanks] = useState<Bank[]>([]);
  const [sharedBanks, setSharedBanks] = useState<Bank[]>([]);
  const [sharedQuestionsByBank, setSharedQuestionsByBank] = useState<Record<string, Question[]>>({});
  const [history, setHistory] = useState<ExamHistory[]>([]);
  const [recentActivities, setRecentActivities] = useState<ExamHistory[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalBanks: 0,
    totalQuestions: 0,
    totalExams: 0,
  });
  const [activeExam, setActiveExamState] = useState<ActiveExam | null>(null);
  const [isLoadingBanks, setIsLoadingBanks] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);

  const banks = useMemo(() => {
    const merged = new Map<string, Bank>();
    sharedBanks.forEach((bank) => merged.set(bank.id, bank));
    ownedBanks.forEach((bank) => merged.set(bank.id, bank));
    return Array.from(merged.values());
  }, [ownedBanks, sharedBanks]);

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

      const { data: ownedRows, error: ownedErr } = await supabase
        .from('banks')
        .select('id, name, owner_id, share_code')
        .eq('owner_id', user.id) // ← Filter chỉ xem kho của chính user
        .order('created_at', { ascending: false });

      if (ownedErr) throw ownedErr;

      const { data: sharedRows, error: sharedErr } = await supabase
        .from('shared_banks')
        .select('bank_id')
        .eq('user_id', user.id);

      if (sharedErr) throw sharedErr;

      const sharedBankIds = ((sharedRows ?? []) as Array<{ bank_id: string }>).map((row) => row.bank_id);

      let sharedBankRows: Array<{ id: string; name: string; owner_id: string; share_code: string | null }> = [];
      if (sharedBankIds.length > 0) {
        const { data: sharedBanksData, error: sharedBanksErr } = await supabase
          .from('banks')
          .select('id, name, owner_id, share_code')
          .in('id', sharedBankIds);

        if (sharedBanksErr) throw sharedBanksErr;
        sharedBankRows = (sharedBanksData ?? []) as Array<{
          id: string;
          name: string;
          owner_id: string;
          share_code: string | null;
        }>;
      }

      const ownedMapped =
        ((ownedRows ?? []) as Array<{ id: string; name: string; owner_id: string; share_code: string | null }>).map((bank) => ({
          id: bank.id,
          name: bank.name,
          ownerId: bank.owner_id,
          shareCode: bank.share_code,
          isShared: false,
        }));

      const sharedMapped = sharedBankRows.map((bank) => ({
        id: bank.id,
        name: bank.name,
        ownerId: bank.owner_id,
        shareCode: bank.share_code,
        isShared: bank.owner_id !== user.id,
      } satisfies Bank));

      const mergedShared = sharedMapped.filter((sharedBank) => !ownedMapped.some((ownBank) => ownBank.id === sharedBank.id));

      setOwnedBanks(ownedMapped);
      setSharedBanks(mergedShared);
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
      const mapped: ExamHistory[] = (data ?? []).map((row) => mapExamHistoryRow(row as Record<string, unknown>));

      setHistory(mapped);
    } catch (err) {
      console.error('refreshHistory error:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const fetchDashboardStats = useCallback(async () => {
    setIsLoadingDashboard(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: bankRows, count: bankCount, error: bankErr } = await supabase
        .from('banks')
        .select('id', { count: 'exact' })
        .eq('owner_id', user.id);
      if (bankErr) throw bankErr;

      const ownerBankIds = (bankRows ?? []).map((bank) => bank.id as string);

      let totalQuestions = 0;
      if (ownerBankIds.length > 0) {
        const { count: questionCount, error: questionErr } = await supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .in('bank_id', ownerBankIds);
        if (questionErr) throw questionErr;
        totalQuestions = questionCount ?? 0;
      }

      const { count: examCount, error: examCountErr } = await supabase
        .from('exam_histories')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (examCountErr) throw examCountErr;

      const { data: recentRows, error: recentErr } = await supabase
        .from('exam_histories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (recentErr) throw recentErr;

      setDashboardStats({
        totalBanks: bankCount ?? 0,
        totalQuestions,
        totalExams: examCount ?? 0,
      });
      setRecentActivities((recentRows ?? []).map((row) => mapExamHistoryRow(row as Record<string, unknown>)));
    } catch (err) {
      console.error('fetchDashboardStats error:', err);
    } finally {
      setIsLoadingDashboard(false);
    }
  }, []);

  // Load dữ liệu khi mount
  useEffect(() => {
    refreshBanks();
    refreshHistory();
    fetchDashboardStats();
  }, [refreshBanks, refreshHistory, fetchDashboardStats]);

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
    await fetchDashboardStats();
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
    await fetchDashboardStats();
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
    if (sharedQuestionsByBank[bankId]) {
      return sharedQuestionsByBank[bankId];
    }

    const rows = await fetchQuestionsByBankIdVariants(bankId);

    return rows.map((row) => mapQuestionRow(row));
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
    await fetchDashboardStats();

    return historyId;
  };

  const getOrCreateShareCode = async (bankId: string): Promise<{ code: string; created: boolean }> => {
    const targetBank = ownedBanks.find((bank) => bank.id === bankId);
    if (!targetBank) {
      throw new Error('Bạn không có quyền tạo mã cho kho này.');
    }

    if (targetBank.shareCode) {
      return { code: targetBank.shareCode, created: false };
    }

    const userId = await getCurrentUserId();

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code = createShareCode();
      const { data: existingCodeRow, error: checkErr } = await supabase
        .from('banks')
        .select('id')
        .eq('share_code', code)
        .maybeSingle();

      if (checkErr) throw checkErr;
      if (existingCodeRow) continue;

      const { data: updatedBank, error: updateErr } = await supabase
        .from('banks')
        .update({ share_code: code })
        .eq('id', bankId)
        .eq('owner_id', userId)
        .select('id, share_code')
        .single();

      if (updateErr) throw updateErr;

      setOwnedBanks((prev) =>
        prev.map((bank) =>
          bank.id === updatedBank.id
            ? {
                ...bank,
                shareCode: updatedBank.share_code,
              }
            : bank
        )
      );

      return { code, created: true };
    }

    throw new Error('Không thể tạo mã chia sẻ. Vui lòng thử lại.');
  };

  const joinByCode = async (inputCode: string): Promise<Bank> => {
    const code = inputCode.trim().toUpperCase();
    if (code.length !== 6) {
      throw new Error('Mã chia sẻ phải gồm 6 ký tự.');
    }

    const userId = await getCurrentUserId();

    const { data: bankRow, error: bankErr } = await supabase
      .from('banks')
      .select('id, name, owner_id, share_code')
      .eq('share_code', code)
      .single();

    if (bankErr || !bankRow) {
      throw new Error('Không tìm thấy kho với mã chia sẻ này.');
    }

    const { error: sharedInsertErr } = await supabase
      .from('shared_banks')
      .insert({
        user_id: userId,
        bank_id: bankRow.id,
      });

    if (sharedInsertErr && sharedInsertErr.code !== '23505') {
      throw sharedInsertErr;
    }

    const { data: fullBankRow } = await supabase
      .from('banks')
      .select('*')
      .eq('id', bankRow.id)
      .maybeSingle();

    let rawQuestionRows: Array<Record<string, unknown>> = [];
    try {
      rawQuestionRows = await fetchQuestionsByBankIdVariants(bankRow.id);
    } catch {
      rawQuestionRows = [];
    }

    if (rawQuestionRows.length === 0) {
      const { data: bankWithQuestions, error: nestedErr } = await supabase
        .from('banks')
        .select('id, questions(*)')
        .eq('id', bankRow.id)
        .single();

      if (!nestedErr) {
        rawQuestionRows = ((bankWithQuestions as { questions?: Array<Record<string, unknown>> })?.questions ?? []);
      }
    }

    if (rawQuestionRows.length === 0) {
      const { data: questionRowsByShareCode, error: byShareCodeErr } = await supabase
        .from('questions')
        .select('id, content, text, options, correct_answer, correctAnswer, correct, banks!inner(share_code)')
        .eq('banks.share_code', code);

      if (!byShareCodeErr && questionRowsByShareCode) {
        rawQuestionRows = questionRowsByShareCode as Array<Record<string, unknown>>;
      }
    }

    if (rawQuestionRows.length === 0 && fullBankRow && typeof fullBankRow === 'object') {
      const possibleQuestionArray =
        (fullBankRow as { questions?: unknown }).questions ??
        (fullBankRow as { question_list?: unknown }).question_list ??
        (fullBankRow as { items?: unknown }).items;

      if (Array.isArray(possibleQuestionArray)) {
        rawQuestionRows = possibleQuestionArray as Array<Record<string, unknown>>;
      }
    }

    const mappedQuestions: Question[] = rawQuestionRows.map((row) => mapQuestionRow(row));

    if (mappedQuestions.length > 0) {
      setSharedQuestionsByBank((prev) => ({
        ...prev,
        [bankRow.id]: mappedQuestions,
      }));
    }

    const joinedBank: Bank = {
      id: bankRow.id,
      name: bankRow.name,
      ownerId: bankRow.owner_id,
      shareCode: bankRow.share_code,
      isShared: bankRow.owner_id !== userId,
    };

    await refreshBanks();

    return joinedBank;
  };

  const leaveSharedBank = async (bankId: string): Promise<void> => {
    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from('shared_banks')
      .delete()
      .eq('user_id', userId)
      .eq('bank_id', bankId);

    if (error) {
      throw error;
    }

    setSharedQuestionsByBank((prev) => {
      const next = { ...prev };
      delete next[bankId];
      return next;
    });

    await refreshBanks();
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
    await fetchDashboardStats();
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
        recentActivities,
        dashboardStats,
        activeExam,
        isLoadingBanks,
        isLoadingHistory,
        isLoadingDashboard,
        addBank,
        updateBank,
        deleteBank,
        addQuestionToBank,
        deleteQuestion,
        getQuestionsForBank,
        saveHistory,
        setActiveExam,
        importBanks,
        getOrCreateShareCode,
        joinByCode,
        leaveSharedBank,
        fetchDashboardStats,
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
