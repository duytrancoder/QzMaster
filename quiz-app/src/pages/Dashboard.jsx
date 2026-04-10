import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, Trash2, Upload, Plus, Play, Info } from 'lucide-react';
import { db } from '../db';

export default function Dashboard() {
  const fileInputRef = useRef(null);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // State for Create Bank Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newBankName, setNewBankName] = useState('');

  // Lấy danh sách banks
  const questionBanks = useLiveQuery(() => db.questionBanks.toArray()) || [];

  // Để đếm số lượng câu hỏi, cần load song song hoặc làm một View/Hook khác.
  // Ở đây MVP ta lấy total cho từng bank
  const [counts, setCounts] = useState({});

  // Cập nhật số lượng mỗi khi questionBanks thay đổi
  React.useEffect(() => {
    async function loadCounts() {
      const newCounts = {};
      for (const bank of questionBanks) {
        newCounts[bank.id] = await db.questions.where('bankId').equals(bank.id).count();
      }
      setCounts(newCounts);
    }
    if (questionBanks.length > 0) loadCounts();
  }, [questionBanks]);

  const handleImportJSON = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsImporting(true);
    setErrorMsg('');

    try {
      const text = await file.text();
      const parsed = JSON.JSON || JSON.parse(text); // Handle generic JSON parsing

      if (!parsed.name || !Array.isArray(parsed.questions)) {
        throw new Error('Sai định dạng: Cần có trường "name" và mảng "questions".');
      }

      // Xử lý Transaction Dexie
      await db.transaction('rw', db.questionBanks, db.questions, async () => {
        const bankId = `bank_${crypto.randomUUID()}`;
        
        await db.questionBanks.add({
          id: bankId,
          name: parsed.name,
          description: `Imported from ${file.name}`,
          createdAt: Date.now()
        });

        const questionsToInsert = parsed.questions.map(q => {
          if (!q.content || !q.options || !q.correctAnswer) {
             throw new Error('Thiếu trường bắt buộc trong câu hỏi (content, options, correctAnswer)');
          }
          return {
            id: `q_${crypto.randomUUID()}`,
            bankId: bankId,
            content: q.content,
            options: q.options,
            correctAnswer: q.correctAnswer
          };
        });

        await db.questions.bulkAdd(questionsToInsert);
      });

      // Reset
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Lỗi đọc file JSON.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleCreateBank = async (e) => {
    e.preventDefault();
    if (!newBankName.trim()) return;
    try {
      const bankId = `bank_${crypto.randomUUID()}`;
      await db.questionBanks.add({
        id: bankId,
        name: newBankName.trim(),
        description: '',
        createdAt: Date.now()
      });
      setIsCreateModalOpen(false);
      setNewBankName('');
    } catch (err) {
      setErrorMsg('Lỗi tạo kho mới.');
    }
  };

  const handleDeleteBank = async (bankId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa kho này và toàn bộ câu hỏi liên quan?")) return;
    await db.transaction('rw', db.questionBanks, db.questions, async () => {
      // Xóa tất cả questions có bankId này
      await db.questions.where('bankId').equals(bankId).delete();
      // Xóa bank
      await db.questionBanks.delete(bankId);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex sm:flex-row flex-col sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Kho ôn tập của bạn</h2>
          <p className="text-sm text-slate-500 mt-1">Quản lý và cập nhật ngân hàng câu hỏi để thi thử.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            accept=".json" 
            ref={fileInputRef} 
            onChange={handleImportJSON} 
            className="hidden" 
            id="import-json"
          />
          <label 
            htmlFor="import-json"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            {isImporting ? 'Đang tải...' : 'Import JSON'}
          </label>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tạo kho mới
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex gap-2 items-start">
          <Info className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {questionBanks.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white border border-slate-200 border-dashed rounded-xl text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Chưa có kho ôn tập nào</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            Hãy bắt đầu bằng cách tạo kho mới thủ công hoặc import tập tin JSON chứa danh sách câu hỏi có sẵn.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {questionBanks.map(bank => (
            <div key={bank.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full">
              <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <button 
                  onClick={() => handleDeleteBank(bank.id)}
                  className="text-slate-400 hover:text-red-600 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-red-50"
                  aria-label="Xóa kho"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <h3 className="font-semibold text-slate-800 text-lg mb-1 truncate" title={bank.name}>{bank.name}</h3>
              <p className="text-sm text-slate-500 mb-4 line-clamp-2">{bank.description}</p>
              
              <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="text-sm text-slate-600">
                  <span className="font-medium text-slate-800">{counts[bank.id] ?? '...'}</span> câu hỏi
                </div>
                <Link to={`/bank/${bank.id}`} className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors">
                  <Play className="w-3.5 h-3.5" />
                  Bắt đầu ôn
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Basic Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Tạo kho ôn tập mới</h3>
            </div>
            <form onSubmit={handleCreateBank}>
              <div className="p-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Tên kho</label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  placeholder="Ví dụ: Lịch sử Đảng, Mạng máy tính..." 
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  value={newBankName}
                  onChange={e => setNewBankName(e.target.value)}
                />
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                >
                  Tạo mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
