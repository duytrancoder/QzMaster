import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store';
import { generateId } from '../utils';
import { Bank, Question } from '../types';
import { Plus, Upload, Trash2, ChevronDown, ChevronUp, Save, Copy, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

// ─── Banks Page ───────────────────────────────────────────────────────────────

export function Banks() {
  const { banks, addBank, deleteBank, updateBank, importBanks, getOrCreateShareCode, joinByCode, leaveSharedBank, isLoadingBanks } = useAppStore();
  const { user } = useAuth();
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [shareCodeInput, setShareCodeInput] = useState('');
  const [isJoiningByCode, setIsJoiningByCode] = useState(false);

  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim() || isCreating) return;
    setIsCreating(true);
    try {
      await addBank(newBankName.trim());
      toast.success('Đã tạo kho mới!');
      setNewBankName('');
      setShowNameInput(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tạo kho thất bại';
      console.error('[handleCreateBank]', err);
      toast.error(`Tạo kho thất bại: ${msg}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rawText = await file.text();
      const json = JSON.parse(rawText);
      if (json && Array.isArray(json.banks)) {
        await importBanks(json.banks);
        toast.success('Nhập dữ liệu thành công!');
      } else {
        toast.error("File JSON không đúng định dạng. Cần có mảng 'banks'.");
      }
    } catch {
      toast.error('Lỗi đọc file JSON.');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const handleShareCode = async (bankId: string) => {
    try {
      const { code, created } = await getOrCreateShareCode(bankId);
      await copyToClipboard(code);
      toast.success(created ? 'Đã tạo mã' : 'Đã copy mã chia sẻ');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo mã chia sẻ';
      toast.error(msg);
    }
  };

  const handleJoinByCode = async () => {
    const normalizedCode = shareCodeInput.trim().toUpperCase();
    if (normalizedCode.length !== 6) {
      toast.error('Mã chia sẻ phải gồm 6 ký tự.');
      return;
    }

    setIsJoiningByCode(true);
    try {
      const joinedBank = await joinByCode(normalizedCode);
      toast.success(`Đã gia nhập kho: ${joinedBank.name}`);
      setShareCodeInput('');
      setEditingBankId(null);
      window.setTimeout(() => setEditingBankId(joinedBank.id), 0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể gia nhập bằng mã chia sẻ.';
      toast.error(msg);
    } finally {
      setIsJoiningByCode(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Kho ôn tập</h1>
          <p className="text-slate-400 mt-1">Quản lý các bộ câu hỏi của bạn</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-slate-900/70 border border-slate-700 rounded-lg px-2 py-1">
            <input
              value={shareCodeInput}
              onChange={(e) => setShareCodeInput(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="Nhập mã"
              className="w-28 bg-transparent text-slate-200 text-sm outline-none placeholder:text-slate-500 uppercase tracking-wider"
            />
            <button
              onClick={handleJoinByCode}
              disabled={isJoiningByCode || shareCodeInput.trim().length !== 6}
              className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white"
            >
              {isJoiningByCode ? 'Đang vào...' : 'Nhập mã'}
            </button>
          </div>
          <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImportJSON} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700"
          >
            <Upload size={18} /> Nhập JSON
          </button>
          <button
            onClick={() => setShowNameInput(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg shadow-blue-500/20"
          >
            <Plus size={18} /> Tạo kho mới
          </button>
        </div>
      </div>

      {/* Inline create bank form */}
      <AnimatePresence>
        {showNameInput && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreateBank}
            className="flex gap-3 overflow-hidden"
          >
            <input
              autoFocus
              value={newBankName}
              onChange={(e) => setNewBankName(e.target.value)}
              placeholder="Nhập tên kho mới..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={isCreating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {isCreating ? 'Đang tạo...' : 'Tạo'}
            </button>
            <button
              type="button"
              onClick={() => { setShowNameInput(false); setNewBankName(''); }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm transition-colors"
            >
              Hủy
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Banks list */}
      <div className="space-y-4">
        {isLoadingBanks ? (
          <div className="text-center py-12 text-slate-500 space-y-2">
            <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto" />
            <p>Đang tải dữ liệu...</p>
          </div>
        ) : (
          <AnimatePresence>
            {banks.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-xl"
              >
                Chưa có kho câu hỏi nào. Hãy tạo mới hoặc nhập từ file JSON.
              </motion.div>
            )}
            {banks.map((bank) => (
              <BankCard
                key={bank.id}
                bank={bank}
                isOwner={bank.ownerId === user?.id}
                isEditing={editingBankId === bank.id}
                setEditing={(isEdit) => setEditingBankId(isEdit ? bank.id : null)}
                onShareCode={() => handleShareCode(bank.id)}
                onLeave={async () => {
                  if (!confirm('Bạn có muốn rời kho được chia sẻ này không?')) return;
                  try {
                    await leaveSharedBank(bank.id);
                    if (editingBankId === bank.id) {
                      setEditingBankId(null);
                    }
                    toast.success('Đã rời kho.');
                  } catch {
                    toast.error('Không thể rời kho lúc này.');
                  }
                }}
                onDelete={async () => {
                  if (confirm('Bạn có chắc chắn muốn xóa kho này và toàn bộ câu hỏi?')) {
                    try {
                      await deleteBank(bank.id);
                      toast.success('Đã xóa kho');
                    } catch {
                      toast.error('Xóa kho thất bại');
                    }
                  }
                }}
                onUpdate={updateBank}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}

// ─── BankCard ─────────────────────────────────────────────────────────────────

function BankCard({
  bank,
  isOwner,
  isEditing,
  setEditing,
  onShareCode,
  onLeave,
  onDelete,
  onUpdate,
}: {
  bank: Bank;
  isOwner: boolean;
  isEditing: boolean;
  setEditing: (val: boolean) => void;
  onShareCode: () => void;
  onLeave: () => void;
  onDelete: () => void;
  onUpdate: (bank: Bank) => Promise<void>;
}) {
  const { addQuestionToBank, deleteQuestion, getQuestionsForBank } = useAppStore();
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Load questions when panel expands
  useEffect(() => {
    if (isEditing) {
      setIsLoadingQuestions(true);
      getQuestionsForBank(bank.id)
        .then(setQuestions)
        .catch(() => toast.error('Không thể tải câu hỏi'))
        .finally(() => setIsLoadingQuestions(false));
    }
  }, [isEditing, bank.id, getQuestionsForBank]);

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('Xóa câu hỏi này?')) return;
    try {
      await deleteQuestion(qId);
      setQuestions((prev) => prev.filter((q) => q.id !== qId));
      toast.success('Đã xóa câu hỏi');
    } catch {
      toast.error('Xóa câu hỏi thất bại');
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm"
    >
      <div
        className="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-800/30 transition-colors"
        onClick={() => setEditing(!isEditing)}
      >
        <div>
          <h3 className="text-lg font-semibold text-slate-200">{bank.name}</h3>
          <p className="text-sm text-slate-400 mt-1">
            {isEditing ? `${questions.length} câu hỏi` : 'Nhấn để mở rộng'}
            {!isOwner ? ' • Chỉ đọc' : ''}
          </p>
          {bank.shareCode ? <p className="text-xs text-indigo-400 mt-1">Mã chia sẻ: {bank.shareCode}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {isOwner ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShareCode();
                }}
                className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Tạo/copy mã chia sẻ"
              >
                {bank.shareCode ? <Copy size={18} /> : <LinkIcon size={18} />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Xóa kho"
              >
                <Trash2 size={18} />
              </button>
            </>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLeave();
              }}
              className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Rời kho"
            >
              <Trash2 size={18} />
            </button>
          )}
          <div className="p-2 text-slate-400">
            {isEditing ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-800 bg-slate-900/80"
          >
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-slate-300">Danh sách câu hỏi</h4>
                {isOwner ? (
                  <button
                    onClick={() => setShowAddQuestion(!showAddQuestion)}
                    className="text-sm bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors"
                  >
                    <Plus size={16} /> Thêm câu hỏi
                  </button>
                ) : null}
              </div>

              {showAddQuestion && isOwner && (
                <AddQuestionForm
                  onAdd={async (q) => {
                    try {
                      await addQuestionToBank(bank.id, q);
                      setQuestions((prev) => [...prev, q]);
                      setShowAddQuestion(false);
                      toast.success('Đã thêm câu hỏi');
                    } catch {
                      toast.error('Thêm câu hỏi thất bại');
                    }
                  }}
                  onCancel={() => setShowAddQuestion(false)}
                />
              )}

              {isLoadingQuestions ? (
                <div className="text-center py-6">
                  <div className="w-6 h-6 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto" />
                </div>
              ) : questions.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">Chưa có câu hỏi trong kho này.</p>
              ) : (
                <div className="space-y-3 mt-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {questions.map((q, idx) => (
                    <div key={q.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <div className="flex justify-between items-start">
                        <p className="text-slate-200 font-medium text-sm">
                          <span className="text-slate-500 mr-2">#{idx + 1}</span> {q.content || q.text}
                        </p>
                        {isOwner ? (
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="text-slate-500 hover:text-red-400 transition-colors ml-2 shrink-0"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                          <div
                            key={opt}
                            className={`px-3 py-2 rounded-md text-xs border ${
                              (q.correctAnswer || q.correct) === opt
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-medium'
                                : 'bg-slate-900/50 border-slate-700/50 text-slate-400'
                            }`}
                          >
                            <span className="font-bold mr-2">{opt}.</span>
                            {q.options[opt as keyof typeof q.options]}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── AddQuestionForm ──────────────────────────────────────────────────────────

function AddQuestionForm({ onAdd, onCancel }: { onAdd: (q: Question) => Promise<void>; onCancel: () => void }) {
  const [content, setContent] = useState('');
  const [options, setOptions] = useState({ A: '', B: '', C: '', D: '' });
  const [correctAnswer, setCorrectAnswer] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content || !options.A || !options.B || !options.C || !options.D) {
      toast.error('Vui lòng điền đủ thông tin');
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAdd({ id: generateId(), content, options, correctAnswer });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-4"
    >
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Câu hỏi</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          rows={3}
          placeholder="Nhập nội dung câu hỏi..."
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(['A', 'B', 'C', 'D'] as const).map((opt) => (
          <div key={opt} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCorrectAnswer(opt)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                correctAnswer === opt ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {opt}
            </button>
            <input
              type="text"
              value={options[opt]}
              onChange={(e) => setOptions((prev) => ({ ...prev, [opt]: e.target.value }))}
              placeholder={`Đáp án ${opt}`}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              required
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-md transition-colors flex items-center gap-2"
        >
          <Save size={16} /> {isSubmitting ? 'Đang lưu...' : 'Lưu câu hỏi'}
        </button>
      </div>
    </motion.form>
  );
}
