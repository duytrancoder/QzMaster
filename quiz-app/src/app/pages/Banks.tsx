import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAppStore } from "../store";
import { generateId } from "../utils";
import { Bank, Question } from "../types";
import { Plus, Upload, Trash2, Edit, ChevronDown, ChevronUp, Save, X, Settings2 } from "lucide-react";
import { toast } from "sonner";

export function Banks() {
  const { banks, addBank, deleteBank, updateBank, importBanks } = useAppStore();
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateBank = () => {
    const name = prompt("Nhập tên kho mới:");
    if (name?.trim()) {
      addBank({ id: generateId(), name: name.trim(), questions: [] });
      toast.success("Đã tạo kho mới");
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json && Array.isArray(json.banks)) {
          importBanks(json.banks);
          toast.success("Nhập dữ liệu thành công!");
        } else {
          toast.error("File JSON không đúng định dạng. Cần mảng 'banks'.");
        }
      } catch (err) {
        toast.error("Lỗi đọc file JSON.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Kho ôn tập</h1>
          <p className="text-slate-400 mt-1">Quản lý các bộ câu hỏi của bạn</p>
        </div>
        <div className="flex gap-3">
          <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImportJSON} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700"
          >
            <Upload size={18} /> Nhập JSON
          </button>
          <button
            onClick={handleCreateBank}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg shadow-blue-500/20"
          >
            <Plus size={18} /> Tạo kho mới
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {banks.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-xl">
              Chưa có kho câu hỏi nào. Hãy tạo mới hoặc nhập từ file JSON.
            </motion.div>
          )}
          {banks.map((bank) => (
            <BankCard
              key={bank.id}
              bank={bank}
              isEditing={editingBankId === bank.id}
              setEditing={(isEdit) => setEditingBankId(isEdit ? bank.id : null)}
              onDelete={() => {
                if (confirm("Bạn có chắc chắn muốn xóa kho này?")) {
                  deleteBank(bank.id);
                  toast.success("Đã xóa kho");
                }
              }}
              onUpdate={updateBank}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function BankCard({
  bank,
  isEditing,
  setEditing,
  onDelete,
  onUpdate,
}: {
  bank: Bank;
  isEditing: boolean;
  setEditing: (val: boolean) => void;
  onDelete: () => void;
  onUpdate: (bank: Bank) => void;
}) {
  const [showAddQuestion, setShowAddQuestion] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm"
    >
      <div className="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-800/30 transition-colors" onClick={() => setEditing(!isEditing)}>
        <div>
          <h3 className="text-lg font-semibold text-slate-200">{bank.name}</h3>
          <p className="text-sm text-slate-400 mt-1">{bank.questions.length} câu hỏi</p>
        </div>
        <div className="flex items-center gap-2">
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
          <div className="p-2 text-slate-400">
            {isEditing ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-800 bg-slate-900/80"
          >
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-slate-300">Danh sách câu hỏi</h4>
                <button
                  onClick={() => setShowAddQuestion(!showAddQuestion)}
                  className="text-sm bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors"
                >
                  <Plus size={16} /> Thêm câu hỏi
                </button>
              </div>

              {showAddQuestion && (
                <AddQuestionForm
                  onAdd={(q) => {
                    onUpdate({ ...bank, questions: [...bank.questions, q] });
                    setShowAddQuestion(false);
                    toast.success("Đã thêm câu hỏi");
                  }}
                  onCancel={() => setShowAddQuestion(false)}
                />
              )}

              {bank.questions.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">Chưa có câu hỏi trong kho này.</p>
              ) : (
                <div className="space-y-3 mt-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {bank.questions.map((q, idx) => (
                    <div key={q.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <div className="flex justify-between items-start">
                        <p className="text-slate-200 font-medium text-sm">
                          <span className="text-slate-500 mr-2">#{idx + 1}</span> {q.text}
                        </p>
                        <button
                          onClick={() => {
                            if (confirm("Xóa câu hỏi này?")) {
                              onUpdate({ ...bank, questions: bank.questions.filter((item) => item.id !== q.id) });
                            }
                          }}
                          className="text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {["A", "B", "C", "D"].map((opt) => (
                          <div
                            key={opt}
                            className={`px-3 py-2 rounded-md text-xs border ${
                              q.correct === opt
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-medium"
                                : "bg-slate-900/50 border-slate-700/50 text-slate-400"
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

function AddQuestionForm({ onAdd, onCancel }: { onAdd: (q: Question) => void; onCancel: () => void }) {
  const [text, setText] = useState("");
  const [options, setOptions] = useState({ A: "", B: "", C: "", D: "" });
  const [correct, setCorrect] = useState<"A" | "B" | "C" | "D">("A");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text || !options.A || !options.B || !options.C || !options.D) {
      toast.error("Vui lòng điền đủ thông tin");
      return;
    }
    onAdd({ id: generateId(), text, options, correct });
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
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          rows={3}
          placeholder="Nhập nội dung câu hỏi..."
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(["A", "B", "C", "D"] as const).map((opt) => (
          <div key={opt} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCorrect(opt)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                correct === opt ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
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
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-2"
        >
          <Save size={16} /> Lưu câu hỏi
        </button>
      </div>
    </motion.form>
  );
}
