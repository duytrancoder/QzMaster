import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, Search, Layers, Plus } from 'lucide-react';
import { db } from '../db';
import ReviewCard from '../components/ReviewCard';
import { normalizeVi } from '../utils/helpers';

export default function BankDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [qContent, setQContent] = useState('');
  const [qOptions, setQOptions] = useState({ A: '', B: '', C: '', D: '' });
  const [qCorrect, setQCorrect] = useState('A');

  // Trạng thái modal config bài thi
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [examMode, setExamMode] = useState('all'); // 'all', 'random'
  const [examRandomCount, setExamRandomCount] = useState(10);
  const [examTime, setExamTime] = useState(0); // 0 = ko giới hạn, >0 = phút

  // Lấy bank info
  const bank = useLiveQuery(() => db.questionBanks.get(id), [id]);
  
  // Lấy tất cả questions của bank này
  const questions = useLiveQuery(() => db.questions.where('bankId').equals(id).toArray(), [id]) || [];

  if (bank === undefined) return <div className="p-8 text-center text-slate-500">Đang tải...</div>;
  if (bank === null) return <div className="p-8 text-center text-slate-500">Không tìm thấy kho câu hỏi.</div>;

  const normalizedSearch = normalizeVi(search);
  
  // Lọc câu hỏi (tìm trong content hoặc các options)
  const filteredQuestions = questions.filter(q => {
    if (!normalizedSearch) return true;
    
    // Check nội dung
    if (normalizeVi(q.content).includes(normalizedSearch)) return true;
    
    // Check đáp án
    for (const val of Object.values(q.options)) {
      if (normalizeVi(val).includes(normalizedSearch)) return true;
    }
    
    return false;
  });

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    if (!qContent.trim() || !qOptions.A.trim() || !qOptions.B.trim() || !qOptions.C.trim() || !qOptions.D.trim()) {
      alert('Vui lòng điền đầy đủ nội dung và 4 đáp án.');
      return;
    }
    
    await db.questions.add({
      id: `q_${crypto.randomUUID()}`,
      bankId: id,
      content: qContent.trim(),
      options: {
        A: qOptions.A.trim(),
        B: qOptions.B.trim(),
        C: qOptions.C.trim(),
        D: qOptions.D.trim(),
      },
      correctAnswer: qCorrect
    });
    
    setIsQuestionModalOpen(false);
    setQContent('');
    setQOptions({ A: '', B: '', C: '', D: '' });
    setQCorrect('A');
  };

  const handleStartExam = (e) => {
    e.preventDefault();
    if (questions.length === 0) {
      alert("Kho trống, vui lòng thêm câu hỏi!");
      return;
    }
    if (examMode === 'random' && (examRandomCount <= 0 || examRandomCount > questions.length)) {
      alert("Số lượng câu không hợp lệ!");
      return;
    }
    // Navigate sang trang Exam kèm state
    navigate(`/exam/${id}`, {
      state: {
        mode: examMode,
        randomCount: examRandomCount,
        timeLimit: examTime
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/" className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">{bank.name}</h2>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
            <Layers className="w-4 h-4" />
            Tổng cộng: {questions.length} câu hỏi
          </p>
        </div>
      </div>

      {/* Thanh công cụ / Topbar */}
      <div className="flex sm:flex-row flex-col gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm kiếm câu hỏi, từ khóa..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsQuestionModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 font-medium text-sm rounded-lg hover:bg-slate-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm câu hỏi
          </button>
          <button 
            onClick={() => setIsExamModalOpen(true)}
            className="px-5 py-2.5 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            Tạo bài thi ngay
          </button>
        </div>
      </div>

      {/* Danh sách thẻ câu hỏi */}
      <div className="space-y-4 pb-12">
        {filteredQuestions.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-slate-200 border-dashed">
            <p className="text-slate-500 font-medium">Không tìm thấy câu hỏi nào phù hợp với &quot;{search}&quot;</p>
          </div>
        ) : (
          filteredQuestions.map(q => (
            <ReviewCard key={q.id} question={q} highlightString={search} />
          ))
        )}
      </div>

      {/* Basic Create Question Modal */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Thêm câu hỏi mới</h3>
            </div>
            <form onSubmit={handleCreateQuestion}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nội dung câu hỏi</label>
                  <textarea 
                    autoFocus
                    required
                    rows="3"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 resize-none"
                    value={qContent}
                    onChange={e => setQContent(e.target.value)}
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">Các đáp án</label>
                  {['A', 'B', 'C', 'D'].map(opt => (
                    <div key={opt} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                      <div className="w-10 h-10 shrink-0 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-600 border border-slate-200">
                        {opt}
                      </div>
                      <input 
                        required
                        type="text" 
                        placeholder={`Nội dung đáp án ${opt}...`}
                        className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                        value={qOptions[opt]}
                        onChange={e => setQOptions({...qOptions, [opt]: e.target.value})}
                      />
                      <label className="flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap pl-2">
                        <input 
                          type="radio" 
                          name="correctAnswer" 
                          value={opt} 
                          checked={qCorrect === opt}
                          onChange={() => setQCorrect(opt)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span>Là đáp án đúng</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0">
                <button 
                  type="button" 
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                >
                  Thêm câu hỏi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Exam Settings Modal */}
      {isExamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 p-4 bg-blue-50/50">
              <h3 className="text-lg font-bold text-blue-900">Tính năng Thi Thử</h3>
              <p className="text-sm text-slate-500 mt-1">Cấu hình bài thi trước khi bắt đầu</p>
            </div>
            <form onSubmit={handleStartExam}>
              <div className="p-6 space-y-5">
                
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">Chế độ chọn câu</label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                      <input 
                        type="radio" 
                        name="examMode" 
                        checked={examMode === 'all'} 
                        onChange={() => setExamMode('all')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div>
                        <div className="font-medium text-sm text-slate-800">Toàn bộ câu hỏi</div>
                        <div className="text-xs text-slate-500">Giữ nguyên thứ tự {questions.length} câu</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                      <input 
                        type="radio" 
                        name="examMode" 
                        checked={examMode === 'random'} 
                        onChange={() => setExamMode('random')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm text-slate-800">Chọn ngẫu nhiên (Random)</div>
                        <div className="text-xs text-slate-500">Trộn lộn xộn các câu hỏi</div>
                      </div>
                    </label>
                  </div>
                </div>

                {examMode === 'random' && (
                  <div className="pl-2 border-l-2 border-blue-200 ml-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Số lượng câu hiển thị (Max: {questions.length})</label>
                    <input 
                      type="number" 
                      min="1" 
                      max={questions.length}
                      required
                      value={examRandomCount}
                      onChange={e => setExamRandomCount(parseInt(e.target.value) || '')}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                    />
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-sm font-semibold text-slate-800 mb-2">Thời gian thi (phút)</label>
                  <select 
                    value={examTime}
                    onChange={e => setExamTime(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  >
                    <option value={0}>Không giới hạn thời gian</option>
                    <option value={15}>15 phút</option>
                    <option value={30}>30 phút</option>
                    <option value={45}>45 phút</option>
                    <option value={60}>60 phút</option>
                    <option value={90}>90 phút</option>
                    <option value={120}>120 phút</option>
                  </select>
                </div>

              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsExamModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                >
                  Bắt đầu làm bài
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
