import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, CircleHelp, Copy, Loader2, Link as LinkIcon, Plus, Save, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useAppStore } from '../store';
import { generateId } from '../utils';
import { Question } from '../types';
import { Button } from '../components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';

export function BankConfig() {
  const navigate = useNavigate();
  const { bankId } = useParams<{ bankId: string }>();
  const { user } = useAuth();
  const { banks, getOrCreateShareCode, leaveSharedBank, deleteBank, isLoadingBanks } = useAppStore();

  const bank = banks.find((item) => item.id === bankId);
  const isOwner = bank?.ownerId === user?.id;

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const handleShareCode = async () => {
    if (!bank) return;
    try {
      const { code, created } = await getOrCreateShareCode(bank.id);
      await copyToClipboard(code);
      toast.success(created ? 'Đã tạo mã' : 'Đã copy mã chia sẻ');
    } catch {
      toast.error('Không thể tạo mã chia sẻ');
    }
  };

  const handleDeleteBank = async () => {
    if (!bank) return;
    if (!confirm('Bạn có chắc chắn muốn xóa kho này và toàn bộ câu hỏi?')) return;
    try {
      await deleteBank(bank.id);
      toast.success('Đã xóa kho');
      navigate('/banks');
    } catch {
      toast.error('Xóa kho thất bại');
    }
  };

  const handleLeaveBank = async () => {
    if (!bank) return;
    if (!confirm('Bạn có muốn rời kho được chia sẻ này không?')) return;
    try {
      await leaveSharedBank(bank.id);
      toast.success('Đã rời kho.');
      navigate('/banks');
    } catch {
      toast.error('Rời kho thất bại');
    }
  };

  if (isLoadingBanks) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (!bank) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16 space-y-4">
        <p className="text-slate-400">Không tìm thấy kho này hoặc bạn chưa gia nhập kho đó.</p>
        <Link to="/banks" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors duration-150 font-medium">
          <ArrowLeft size={16} /> Quay lại Kho ôn tập
        </Link>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-6 pb-10">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <Link to="/banks" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors duration-150 mb-3">
            <ArrowLeft size={16} /> Quay lại danh sách kho
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-100">{bank.name}</h1>
            <span className={`text-xs px-2 py-1 rounded-full border font-medium ${isOwner ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'}`}>
              {isOwner ? 'Owner' : 'Shared'}
            </span>
          </div>
          <p className="text-slate-400 mt-2">Màn cấu hình kho. Chỉ chủ kho mới được thêm/xóa câu hỏi, tạo mã và xóa kho.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isOwner ? (
            <>
              <button
                onClick={handleShareCode}
                className="inline-flex items-center gap-2 min-h-[44px] py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 font-medium"
              >
                {bank.shareCode ? <Copy size={16} /> : <LinkIcon size={16} />}
                {bank.shareCode ? 'Copy mã' : 'Tạo mã chia sẻ'}
              </button>
              <button
                onClick={handleDeleteBank}
                className="inline-flex items-center gap-2 min-h-[44px] py-3 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 font-medium"
              >
                <Trash2 size={16} /> Xóa kho
              </button>
            </>
          ) : (
            <button
              onClick={handleLeaveBank}
              className="inline-flex items-center gap-2 min-h-[44px] py-3 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 font-medium"
            >
              <Trash2 size={16} /> Rời kho
            </button>
          )}
        </div>
      </header>

      {bank.shareCode ? <p className="text-sm text-indigo-300">Mã chia sẻ hiện tại: {bank.shareCode}</p> : null}

      <QuestionsSection bankId={bank.id} isOwner={isOwner} />
    </motion.div>
  );
}

function QuestionsSection({ bankId, isOwner }: Readonly<{ bankId: string; isOwner: boolean }>) {
  const { getQuestionsForBank, addQuestionToBank, deleteQuestion, importQuestions } = useAppStore();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsLoadingQuestions(true);
    getQuestionsForBank(bankId)
      .then(setQuestions)
      .catch(() => toast.error('Không thể tải câu hỏi'))
      .finally(() => setIsLoadingQuestions(false));
  }, [bankId, getQuestionsForBank]);

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Xóa câu hỏi này?')) return;
    try {
      await deleteQuestion(questionId);
      setQuestions((prev) => prev.filter((item) => item.id !== questionId));
      toast.success('Đã xóa câu hỏi');
    } catch {
      toast.error('Xóa câu hỏi thất bại');
    }
  };

  const handleOpenImportDialog = () => {
    fileInputRef.current?.click();
  };

  const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0 || isImporting) {
      event.target.value = '';
      return;
    }

    setIsImporting(true);
    try {
      let totalImported = 0;
      let latestQuestions: Question[] = [];

      for (const file of files) {
        const result = await importQuestions(bankId, file);
        totalImported += result.importedCount;
        latestQuestions = result.questions;
      }

      setQuestions(latestQuestions);
      toast.success(`Đã nạp thành công ${totalImported} câu hỏi từ ${files.length} file!`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nhập JSON thất bại';
      toast.error(message);
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  let content: React.ReactNode;
  if (isLoadingQuestions) {
    content = (
      <div className="text-center py-10 text-slate-500 space-y-3">
        <div className="w-7 h-7 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto" />
        <p>Đang tải câu hỏi...</p>
      </div>
    );
  } else if (questions.length === 0) {
    content = (
      <div className="text-center py-10 text-slate-500 border border-dashed border-slate-800 rounded-xl">
        Chưa có câu hỏi trong kho này.
      </div>
    );
  } else {
    content = (
      <div className="space-y-3">
        {questions.map((q, index) => (
          <div key={q.id} className="p-4 rounded-xl border border-slate-800 bg-slate-950/70">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-slate-400 mb-1">Câu #{index + 1}</p>
                <h3 className="text-slate-100 font-medium leading-relaxed">{q.content || q.text}</h3>
              </div>
              {isOwner ? (
                <button
                  onClick={() => void handleDeleteQuestion(q.id)}
                  className="text-slate-500 hover:text-red-400 transition-colors shrink-0 min-h-[44px] min-w-[44px]"
                >
                  <Trash2 size={16} />
                </button>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                <div
                  key={opt}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    (q.correctAnswer || q.correct) === opt
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="font-bold mr-2">{opt}.</span>
                  {q.options[opt]}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5 backdrop-blur-sm shadow-md">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-slate-100">Danh sách câu hỏi</h2>
        {isOwner ? (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              multiple
              className="hidden"
              onChange={handleImportJSON}
            />
            <div className="relative inline-flex">
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenImportDialog}
                disabled={isImporting}
                className="min-w-[160px] min-h-[44px] py-3 px-4 justify-start border-slate-700 bg-transparent pl-3 pr-14 text-slate-200 hover:bg-slate-800 hover:text-slate-50 transition-colors duration-150"
              >
                {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Nhập JSON
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors duration-150"
                    aria-label="Trợ giúp nhập JSON"
                  >
                    <CircleHelp size={18} />
                  </Button>
                </PopoverTrigger>
              <PopoverContent align="end" className="w-[min(92vw,560px)] space-y-3">
                <p className="text-sm font-semibold">Hướng dẫn nạp câu hỏi bằng file JSON</p>
                <p className="text-sm text-muted-foreground">
                  Chức năng này giúp bạn thêm hàng loạt câu hỏi cùng lúc (thay vì nhập từng câu).
                </p>

                <p className="text-sm">
                  <strong>1. Cấu trúc file bắt buộc:</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  File phải là mảng JSON chứa các object với đúng 3 khóa: <code>content</code>, <code>options</code>, <code>correct_answer</code>.
                </p>

                <p className="text-sm">
                  <strong>2. Mẫu chuẩn (Copy để test):</strong>
                </p>
                <pre className="bg-muted p-2 rounded-md text-xs overflow-x-auto">{`[
  {
    "content": "Câu hỏi của bạn ở đây?",
    "options": {
      "A": "Đáp án A",
      "B": "Đáp án B",
      "C": "Đáp án C",
      "D": "Đáp án D"
    },
    "correct_answer": "B"
  }
]`}</pre>

                <p className="text-sm">
                  <strong>3. Các lưu ý sống còn:</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  - Tên các khóa (content, options, correct_answer) phải viết chính xác tuyệt đối, không viết hoa thường sai.
                </p>
                <p className="text-sm text-muted-foreground">
                  - Trong <code>options</code> bắt buộc phải có đủ 4 chữ cái: "A", "B", "C", "D".
                </p>
                <p className="text-sm text-muted-foreground">
                  - <code>correct_answer</code> chỉ được nhận một trong 4 giá trị: "A", "B", "C" hoặc "D".
                </p>
                <p className="text-sm text-muted-foreground">
                  - Tuyệt đối không thêm các khóa khác (như <code>id</code>, <code>bank_id</code>, <code>question</code>) vì hệ thống sẽ tự tạo.
                </p>

                <p className="text-sm">
                  <strong>4. Mẹo tạo file nhanh:</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  Bạn có thể mở ChatAI và yêu cầu: <strong>"Tạo ra 50 câu hỏi trắc nghiệm về [Chủ đề], trả lời ĐÚNG ĐỊNH DẠNG JSON chuẩn theo cấu trúc tôi cung cấp"</strong> hoặc <strong>copy câu hỏi muốn thi và yêu cầu chatAI tạo file JSON</strong>, sau đó copy kết quả lưu thành file <code>.json</code> là có thể Import ngay.
                </p>
              </PopoverContent>
              </Popover>
            </div>
            <button
              onClick={() => setShowAddQuestion((prev) => !prev)}
              className="inline-flex items-center gap-2 min-h-[44px] py-3 px-4 rounded-lg bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 transition-colors"
            >
              <Plus size={16} /> Thêm câu hỏi
            </button>
          </div>
        ) : null}
      </div>

      {isOwner && showAddQuestion ? (
        <AddQuestionForm
          onAdd={async (q) => {
            try {
              await addQuestionToBank(bankId, q);
              setQuestions((prev) => [...prev, q]);
              setShowAddQuestion(false);
              toast.success('Đã thêm câu hỏi');
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Thêm câu hỏi thất bại';
              toast.error(message);
            }
          }}
          onCancel={() => setShowAddQuestion(false)}
        />
      ) : null}

      {content}
    </section>
  );
}

function AddQuestionForm({ onAdd, onCancel }: Readonly<{ onAdd: (q: Question) => Promise<void>; onCancel: () => void }>) {
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
      className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-4 shadow-sm"
    >
      <div>
        <label htmlFor="bank-question-content" className="block text-xs font-medium text-slate-400 mb-1">Câu hỏi</label>
        <textarea
          id="bank-question-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors duration-150"
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
              className={`w-11 h-11 min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
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
              className="flex-1 bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors duration-150"
              required
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[44px] py-3 px-4 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors duration-150"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-[44px] py-3 px-4 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-md transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
        >
          <Save size={16} /> {isSubmitting ? 'Đang lưu...' : 'Lưu câu hỏi'}
        </button>
      </div>
    </motion.form>
  );
}
