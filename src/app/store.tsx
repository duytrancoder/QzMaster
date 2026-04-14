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
  importQuestions: (bankId: string, file: File) => Promise<{ importedCount: number; questions: Question[] }>;
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
const IMPORT_OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('bank_id', bankId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Array<Record<string, unknown>>;
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

function createQuestionInsertPayloadVariants(
  bankId: string,
  question: Question
): Array<Record<string, unknown>> {
  const content = question.content ?? question.text ?? '';
  const correctAnswer = question.correctAnswer ?? question.correct;

  return [
    {
      bank_id: bankId,
      content,
      options: question.options,
      correct_answer: correctAnswer,
    },
  ];
}

function validateImportedQuestionRow(row: unknown, index: number): string | null {
  if (!isRecord(row)) {
    return `Lỗi ở câu số ${index + 1}: Mỗi câu hỏi phải là một object hợp lệ.`;
  }

  const allowedQuestionKeys = ['content', 'options', 'correct_answer'];
  const rowKeys = Object.keys(row);
  if (rowKeys.length !== allowedQuestionKeys.length || !allowedQuestionKeys.every((key) => rowKeys.includes(key))) {
    return `Lỗi ở câu số ${index + 1}: Mỗi câu chỉ được có content, options, correct_answer.`;
  }

  if (typeof row.content !== 'string' || row.content.trim().length === 0) {
    return `Lỗi ở câu số ${index + 1}: Thiếu nội dung câu hỏi hoặc định dạng không đúng`;
  }

  if (!isRecord(row.options)) {
    return `Lỗi ở câu số ${index + 1}: Thiếu options hoặc định dạng không đúng`;
  }

  const optionKeys = Object.keys(row.options);
  if (optionKeys.length !== IMPORT_OPTION_KEYS.length || !IMPORT_OPTION_KEYS.every((key) => optionKeys.includes(key))) {
    return `Lỗi ở câu số ${index + 1}: options phải chứa đủ A, B, C, D`;
  }

  for (const optionKey of IMPORT_OPTION_KEYS) {
    if (typeof row.options[optionKey] !== 'string' || row.options[optionKey].trim().length === 0) {
      return `Lỗi ở câu số ${index + 1}: Thiếu đáp án ${optionKey} hoặc định dạng không đúng`;
    }
  }

  if (
    typeof row.correct_answer !== 'string' ||
    !IMPORT_OPTION_KEYS.includes(row.correct_answer.trim() as (typeof IMPORT_OPTION_KEYS)[number])
  ) {
    return `Lỗi ở câu số ${index + 1}: correct_answer phải là A, B, C hoặc D`;
  }

  return null;
}

function mapImportedQuestionRow(row: Record<string, unknown>, bankId: string): Record<string, unknown> {
  const options = row.options as Record<string, unknown>;

  return {
    bank_id: bankId,
    content: row.content,
    options: {
      A: options.A,
      B: options.B,
      C: options.C,
      D: options.D,
    },
    correct_answer: row.correct_answer,
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
    const userId = await getCurrentUserId();

    const { data: bankRow, error: bankErr } = await supabase
      .from('banks')
      .select('owner_id')
      .eq('id', bankId)
      .maybeSingle();

    if (bankErr) {
      throw bankErr;
    }

    if (!bankRow || (bankRow as { owner_id?: string }).owner_id !== userId) {
      throw new Error('Bạn không có quyền thêm câu hỏi vào kho này.');
    }

    const payloadVariants = createQuestionInsertPayloadVariants(bankId, question);
    let lastError: { message?: string; details?: string; hint?: string } | null = null;

    for (const basePayload of payloadVariants) {
      const payload = { ...basePayload };

      for (let attempt = 0; attempt < 6; attempt += 1) {
        const { error } = await supabase.from('questions').insert(payload);

        if (!error) {
          return;
        }

        lastError = error;
        console.error('[addQuestionToBank] Supabase error:', error.message, error.details, error.hint);

        const missingColumnMatch = /Could not find the '([^']+)' column/i.exec(error.message);
        const missingColumn = missingColumnMatch?.[1];

        if (missingColumn && Object.hasOwn(payload, missingColumn)) {
          delete payload[missingColumn];
          continue;
        }

        break;
      }
    }

    if (lastError?.message && /row-level security policy/i.test(lastError.message)) {
      throw new Error(
        "RLS đang chặn INSERT vào bảng questions. Cần tạo policy cho phép chủ sở hữu bank thêm câu hỏi bằng bank_id."
      );
    }

    const detailText = lastError ? [lastError.message, lastError.details, lastError.hint].filter(Boolean).join(' | ') : '';
    throw new Error(detailText || 'Không thể thêm câu hỏi.');
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

  const importQuestions = async (bankId: string, file: File): Promise<{ importedCount: number; questions: Question[] }> => {
    const userId = await getCurrentUserId();

    const { data: bankRow, error: bankErr } = await supabase
      .from('banks')
      .select('owner_id')
      .eq('id', bankId)
      .maybeSingle();

    if (bankErr) {
      throw bankErr;
    }

    if (!bankRow || (bankRow as { owner_id?: string }).owner_id !== userId) {
      throw new Error('Bạn không có quyền nhập câu hỏi vào kho này.');
    }

    let rawText = '';
    try {
      rawText = await file.text();
    } catch {
      throw new Error('Không thể đọc file JSON.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error('File JSON sai định dạng cú pháp, vui lòng kiểm tra lại.');
    }

    if (!Array.isArray(parsed)) {
      throw new Error('File phải là một mảng JSON [...].');
    }

    if (parsed.length === 0) {
      throw new Error('File JSON không chứa câu hỏi nào để nhập.');
    }

    const mappedData: Array<Record<string, unknown>> = [];

    for (let index = 0; index < parsed.length; index += 1) {
      const validationError = validateImportedQuestionRow(parsed[index], index);
      if (validationError) {
        throw new Error(validationError);
      }

      mappedData.push(mapImportedQuestionRow(parsed[index] as Record<string, unknown>, bankId));
    }

    const { error: insertErr } = await supabase
      .from('questions')
      .insert(mappedData)
      .select('id');

    if (insertErr) {
      const detailText = [insertErr.message, insertErr.details, insertErr.hint].filter(Boolean).join(' | ');
      throw new Error(detailText ? `Lỗi từ Database: ${detailText}` : 'Lỗi từ Database: Không thể nạp câu hỏi.');
    }

    const freshRows = await fetchQuestionsByBankIdVariants(bankId);
    const refreshedQuestions = freshRows.map((row) => mapQuestionRow(row));

    setSharedQuestionsByBank((prev) => ({
      ...prev,
      [bankId]: refreshedQuestions,
    }));

    await fetchDashboardStats();

    return {
      importedCount: mappedData.length,
      questions: refreshedQuestions,
    };
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
          for (const question of b.questions) {
            await addQuestionToBank(b.id, {
              ...question,
              id: question.id ?? generateId(),
            });
          }
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
        importQuestions,
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
