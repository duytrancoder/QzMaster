import React, { createContext, useContext, useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { Bank, ExamHistory, ActiveExam, Question } from "./types";
import { generateId } from "./utils";

interface AppState {
  banks: Bank[];
  history: ExamHistory[];
  activeExam: ActiveExam | null;
}

interface AppContextType extends AppState {
  addBank: (bank: Bank) => void;
  updateBank: (bank: Bank) => void;
  deleteBank: (id: string) => void;
  addQuestionToBank: (bankId: string, question: Question) => void;
  saveHistory: (history: ExamHistory) => void;
  setActiveExam: (exam: ActiveExam | null) => void;
  importBanks: (newBanks: Bank[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const banksRaw = useLiveQuery(() => db.questionBanks.toArray()) || [];
  const historyRaw = useLiveQuery(() => db.examHistory.reverse().toArray()) || [];
  
  const [activeExam, setActiveExamState] = useState<ActiveExam | null>(null);

  // Context Actions synced to Dexie
  const addBank = async (bank: Bank) => {
    await db.questionBanks.add({ id: bank.id, name: bank.name });
  };

  const updateBank = async (bank: Bank) => {
    await db.questionBanks.put({ id: bank.id, name: bank.name });
  };

  const deleteBank = async (id: string) => {
    await Promise.all([
      db.questionBanks.delete(id),
      db.questions.where('bankId').equals(id).delete()
    ]);
  };

  const addQuestionToBank = async (bankId: string, question: Question) => {
    await db.questions.add({ ...question, bankId });
  };

  const saveHistory = async (historyItem: ExamHistory) => {
    await db.examHistory.add(historyItem);
    setActiveExamState(null);
  };

  const setActiveExam = (exam: ActiveExam | null) => {
    setActiveExamState(exam);
  };

  const importBanks = async (newBanks: any[]) => {
    // Simple filter to skip existing bank names or IDs
    for (const b of newBanks) {
      const exist = await db.questionBanks.get(b.id);
      if (!exist) {
        await addBank({ id: b.id, name: b.name });
        if (b.questions && b.questions.length > 0) {
           const qsToInsert = b.questions.map((q: any) => ({ ...q, bankId: b.id }));
           await db.questions.bulkAdd(qsToInsert);
        }
      }
    }
  };

  return (
    <AppContext.Provider
      value={{
        banks: banksRaw,
        history: historyRaw,
        activeExam,
        addBank,
        updateBank,
        deleteBank,
        addQuestionToBank,
        saveHistory,
        setActiveExam,
        importBanks,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppStore must be used within an AppProvider");
  }
  return context;
}
