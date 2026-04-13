import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ChevronRight, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useAppStore } from '../store';
import { Bank } from '../types';

export function Banks() {
  const { banks, addBank, importBanks, getOrCreateShareCode, joinByCode, isLoadingBanks } = useAppStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);
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
      setShowJoinInput(false);
      navigate(`/banks/${joinedBank.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể gia nhập bằng mã chia sẻ.';
      toast.error(msg);
    } finally {
      setIsJoiningByCode(false);
    }
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Kho ôn tập</h1>
          <p className="text-slate-400 mt-1">Chọn một kho để mở trang cấu hình riêng của kho đó</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowNameInput(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg shadow-blue-500/20"
          >
            <Plus size={18} /> Tạo kho mới
          </button>

          <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImportJSON} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700"
          >
            <Upload size={18} /> Nhập JSON
          </button>

          <button
            onClick={() => setShowJoinInput((prev) => !prev)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            Mã vào kho
          </button>
        </div>
      </div>

      {showNameInput ? (
        <form onSubmit={handleCreateBank} className="flex gap-3 overflow-hidden">
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
            onClick={() => {
              setShowNameInput(false);
              setNewBankName('');
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm transition-colors"
          >
            Hủy
          </button>
        </form>
      ) : null}

      {showJoinInput ? (
        <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-4 space-y-3">
          <p className="text-sm text-slate-300">Nhập mã kho để vào kho được chia sẻ</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              autoFocus
              value={shareCodeInput}
              onChange={(e) => setShareCodeInput(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="Ví dụ: A1B2C3"
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 text-sm outline-none placeholder:text-slate-500 uppercase tracking-wider"
            />
            <button
              onClick={handleJoinByCode}
              disabled={isJoiningByCode || shareCodeInput.trim().length !== 6}
              className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white"
            >
              {isJoiningByCode ? 'Đang vào...' : 'Vào kho'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowJoinInput(false);
                setShareCodeInput('');
              }}
              className="px-4 py-2 text-sm rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              Hủy
            </button>
          </div>
        </div>
      ) : null}

      {isLoadingBanks ? (
        <div className="text-center py-12 text-slate-500 space-y-2">
          <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto" />
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {banks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-xl"
            >
              Chưa có kho câu hỏi nào. Hãy tạo mới hoặc nhập từ file JSON.
            </motion.div>
          ) : null}

          {banks.map((bank) => (
            <BankListItem
              key={bank.id}
              bank={bank}
              isOwner={bank.ownerId === user?.id}
              onClick={() => navigate(`/banks/${bank.id}`)}
              onShareCode={handleShareCode}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function BankListItem({
  bank,
  isOwner,
  onClick,
  onShareCode,
}: Readonly<{
  bank: Bank;
  isOwner: boolean;
  onClick: () => void;
  onShareCode: (bankId: string) => Promise<void>;
}>) {
  return (
    <div className="w-full group bg-slate-900/40 border border-slate-800 rounded-xl p-5 hover:bg-slate-900/70 hover:border-slate-700 transition-all flex items-center justify-between gap-4">
      <button type="button" onClick={onClick} className="text-left min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-lg font-semibold text-slate-100 truncate">{bank.name}</h3>
          <span className={`text-xs px-2 py-1 rounded-full border ${isOwner ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'}`}>
            {isOwner ? 'Owner' : 'Shared'}
          </span>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          {isOwner ? 'Bấm để mở màn cấu hình kho' : 'Kho được chia sẻ - chỉ đọc'}
        </p>
      </button>

      {isOwner ? (
        <button
          type="button"
          onClick={() => onShareCode(bank.id)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600/10 text-indigo-300 hover:bg-indigo-600/20 transition-colors shrink-0"
        >
          {bank.shareCode ? 'Copy mã' : 'Tạo mã'}
        </button>
      ) : null}

      <ChevronRight size={18} className="text-slate-500 group-hover:text-slate-200 transition-colors shrink-0" />
    </div>
  );
}
